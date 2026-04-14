import type { InterviewAnalysis } from "@/hooks/useInterviewStore";

interface InlineDocument {
  mimeType: string;
  data: string;
}

interface AnalyzeInterviewDocumentsInput {
  resumeText: string;
  workHistoryText: string;
  apiKey: string;
  model: string;
  inlineDocuments?: InlineDocument[];
}

type GeminiRequestPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

async function callGemini(
  prompt: string,
  apiKey: string,
  model: string,
  inlineDocuments: InlineDocument[] = []
): Promise<string> {
  if (!apiKey) {
    throw new Error("Gemini APIキーを設定してください。");
  }

  const parts: GeminiRequestPart[] = [{ text: prompt }];
  inlineDocuments.forEach((document) => {
    parts.push({
      inlineData: {
        mimeType: document.mimeType,
        data: document.data,
      },
    });
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini APIエラー (${response.status}): ${body}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Geminiから有効な応答が返りませんでした。");
  }

  return text;
}

function parseJsonResponse<T>(text: string): T | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function testGeminiConnection(
  apiKey: string,
  model: string
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await callGemini("OKとだけ返してください。", apiKey, model);
    return { success: true, message: `Gemini APIに接続できました: ${result.trim()}` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gemini APIの接続に失敗しました。",
    };
  }
}

export async function analyzeInterviewDocuments({
  resumeText,
  workHistoryText,
  apiKey,
  model,
  inlineDocuments = [],
}: AnalyzeInterviewDocumentsInput): Promise<InterviewAnalysis> {
  const prompt = `
あなたは採用面接の準備を支援するアシスタントです。
履歴書と職務経歴書を読み、面接官が短時間で確認できる要約と、面接で聞くべき質問候補を作ってください。

出力はJSONだけにしてください。Markdownのコードブロックは不要です。

{
  "resumeSummary": "履歴書の要約。3〜5項目の箇条書き風の短い文章。",
  "workHistorySummary": "職務経歴書の要約。経験、役割、実績、技術/業務領域が分かる短い文章。",
  "suggestedQuestions": [
    "具体的な質問候補1",
    "具体的な質問候補2",
    "具体的な質問候補3",
    "具体的な質問候補4",
    "具体的な質問候補5"
  ]
}

履歴書テキスト:
${resumeText || "(PDF添付または未入力)"}

職務経歴書テキスト:
${workHistoryText || "(PDF添付または未入力)"}

質問候補は、経歴の深掘り、実績の再現性、役割範囲、転職理由、入社後の期待値確認に使えるものを優先してください。
`;

  const raw = await callGemini(prompt, apiKey, model, inlineDocuments);
  const parsed = parseJsonResponse<InterviewAnalysis>(raw);

  if (!parsed) {
    throw new Error("Geminiの応答を解析できませんでした。");
  }

  return {
    resumeSummary: parsed.resumeSummary || "",
    workHistorySummary: parsed.workHistorySummary || "",
    suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
      ? parsed.suggestedQuestions.filter(Boolean)
      : [],
  };
}
