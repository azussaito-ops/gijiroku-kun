/**
 * AI分析サービス
 * - Gemini API: トピック分析・書類分析
 * - Groq API: 相手の音声認識（Whisperモデル・無料）
 */

/** トピック分析結果のひとつ */
export interface TopicItem {
    id: string;
    text: string;
    suggestedQuestion: string;
}

/** 書類分析結果 */
export interface DocumentAnalysisResult {
    resumeHTML: string;
    esHTML: string;
    deepDiveHTML: string;
}

// ===================================================
// Gemini API 関連
// ===================================================

/**
 * Gemini API を呼び出す汎用関数
 * @param prompt - プロンプトテキスト
 * @param apiKey - Gemini APIキー
 * @param model - モデルバージョン（デフォルト: gemini-1.5-flash）
 * @param inlineData - Base64エンコードされたデータ（画像/PDF）
 * @throws Error - API呼び出しに失敗した場合
 */
async function callGemini(
    prompt: string,
    apiKey: string,
    model: string = "gemini-3-flash-preview",
    inlineData?: { mimeType: string; data: string }[]
): Promise<string> {
    if (!apiKey) {
        throw new Error("Gemini APIキーが未設定です");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const parts: any[] = [{ text: prompt }];

    // インラインデータがあれば追加
    if (inlineData && inlineData.length > 0) {
        inlineData.forEach(d => {
            parts.push({
                inlineData: {
                    mimeType: d.mimeType,
                    data: d.data
                }
            });
        });
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts }],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API Error (${response.status}): ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error?.message) {
                    errorMessage += ` - ${errorJson.error.message}`;
                }
            } catch (e) {
                errorMessage += ` - ${errorText}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("生成されたテキストが空でした（セーフティフィルタ等の可能性があります）");
        }

        return text;
    } catch (error) {
        console.error("Gemini API呼び出しエラー:", error);
        throw error; // そのまま再スロー
    }
}

/**
 * JSONレスポンスをパースする（```json ... ```マーカーを除去）
 */
function parseJsonResponse<T>(text: string): T | null {
    try {
        const cleaned = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned) as T;
    } catch {
        console.error("JSONパースエラー:", text);
        return null;
    }
}

/**
 * Gemini API 接続テスト
 * @param apiKey - テストするAPIキー
 * @returns テスト結果メッセージ（成功時）またはエラーメッセージ
 */
export async function testGeminiConnection(apiKey: string, model: string = "gemini-3-flash-preview"): Promise<{ success: boolean; message: string }> {
    if (!apiKey) return { success: false, message: "APIキーが空です" };

    try {
        const start = Date.now();
        const result = await callGemini("Hello, just say 'OK'.", apiKey);
        const duration = Date.now() - start;

        return { success: true, message: `接続成功 (${duration}ms): ${result}` };
    } catch (error) {
        return { success: false, message: `接続エラー: ${error instanceof Error ? error.message : "不明なエラー"}` };
    }
}

/**
 * 書類（履歴書・ES）の分析を行う
 */
export async function analyzeDocuments(
    resumeText: string,
    esText: string,
    triggerType: "resume" | "es",
    apiKey: string,
    model: string,
    resumeData?: string,
    esData?: string
): Promise<DocumentAnalysisResult | null> {
    const prompt = `
提出書類分析。JSONのみ出力。
入力: 
${resumeText ? "[履歴書テキストあり]" : ""} ${resumeData ? "[履歴書PDF(画像)あり]" : ""}
${esText ? "[ESテキストあり]" : ""} ${esData ? "[ES PDF(画像)あり]" : ""}

テキスト:
${resumeText ? "履歴書: " + resumeText : ""}
${esText ? "ES: " + esText : ""}

指示:
1. ${triggerType === "resume" ? "履歴書要約HTML(Tailwind, space-y-2)。キー:resumeHTML" : "キー:resumeHTMLは空"}
2. ${triggerType === "es" ? "ES要約HTML(Tailwind, space-y-2)。キー:esHTML" : "キー:esHTMLは空"}
3. 両方を踏まえた「深掘り質問」リスト5個、各質問を<p>タグで。キー:deepDiveHTML

{ "resumeHTML": "...", "esHTML": "...", "deepDiveHTML": "..." }
`;

    // 添付ファイルデータの作成
    const inlineData: { mimeType: string; data: string }[] = [];
    if (resumeData) inlineData.push({ mimeType: "application/pdf", data: resumeData });
    if (esData) inlineData.push({ mimeType: "application/pdf", data: esData });

    try {
        const result = await callGemini(prompt, apiKey, model, inlineData);
        return parseJsonResponse<DocumentAnalysisResult>(result);
    } catch (error) {
        console.error("書類分析エラー:", error);
        return null;
    }
}

/**
 * 会話内容からトピックと質問を抽出
 */
export async function analyzeTopics(
    transcript: string,
    apiKey: string,
    model: string
): Promise<TopicItem[]> {
    const prompt = `
以下の面接会話から、現在話されている「主要トピック」を3つと、面接官が次に聞くべき「推奨質問」を3つ抽出してください。
JSONのみ出力。
{ "topics": ["...", "...", ...], "questions": ["...", "...", ...] }

会話:
${transcript}
`;
    try {
        const result = await callGemini(prompt, apiKey, model);
        // トピック分析は失敗しても空配列を返すだけで良い
        // callGeminiがthrowするようになったのでcatchで拾う
        const json = parseJsonResponse<{ topics: string[]; questions: string[] }>(result);
        if (!json) return [];

        return json.topics.map((t, i) => ({
            id: crypto.randomUUID(),
            text: t,
            suggestedQuestion: json.questions[i] || "",
        }));
    } catch (error) {
        console.error("トピック分析エラー:", error);
        return [];
    }
}

/**
 * 履歴書とESの情報を統合し、見やすい候補者プロフィールHTMLを生成
 */
export async function generateCandidateProfile(
    resumeText: string,
    esText: string,
    apiKey: string,
    model: string,
    resumeData?: string,
    esData?: string
): Promise<string | null> {
    const prompt = `
あなたはプロの採用面接官です。
以下の履歴書とエントリーシート(ES)の情報から、面接官が候補者を短時間で理解するための「統合候補者プロフィール」をHTML形式で作成してください。
添付されているPDFファイル（画像化されている場合もあり）も参照してください。

# 入力情報
履歴書テキスト: ${resumeText || "(なし)"}
ESテキスト: ${esText || "(なし)"}
${resumeData ? "※ 履歴書のPDFデータが添付されています。" : ""}
${esData ? "※ ESのPDFデータが添付されています。" : ""}

# 出力要件
- HTML形式（Tailwind CSSクラスを使用）
- 全体を <div class="space-y-4"> で囲む
- 以下のセクションを含める:
  1. **基本情報まとめ**: 氏名、大学・学部、現在のステータスなど（<div class="bg-muted p-3 rounded-md">...）
  2. **強み・アピールポイント**: 3点程度に要約（<ul><li>...）
  3. **志望動機**: ESの内容を中心に要約（<p>...）
  4. **懸念点・確認事項**: 面接で突っ込むべきポイントや矛盾点（<div class="bg-red-50 dark:bg-red-950/30 p-3 rounded-md border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">...）

JSONではなく、HTMLコードのみを出力してください。Markdown記法は不要です。
`;
    // 添付ファイルデータの作成
    const inlineData: { mimeType: string; data: string }[] = [];
    if (resumeData) inlineData.push({ mimeType: "application/pdf", data: resumeData });
    if (esData) inlineData.push({ mimeType: "application/pdf", data: esData });

    // ここはエラーをそのままスローして、呼び出し元で表示させる
    return await callGemini(prompt, apiKey, model, inlineData);
}

/** AI評価アシスト: 各テンプレート項目に対してスコアと所見を自動生成 */
export interface EvalAssistItem {
    label: string;
    score: string;
    text: string;
}

/**
 * 会話ログと評価項目をもとに、AIがスコアと所見を生成する
 * @param transcript - 会話ログテキスト
 * @param labels - 評価項目のラベル一覧
 * @param scoreLabels - スコア選択肢のラベル一覧（例: ["1 (不足)", "2 (やや不足)", ...]）
 * @param apiKey - Gemini APIキー
 * @param model - Geminiモデル名
 */
export async function generateEvaluationAssist(
    transcript: string,
    labels: string[],
    scoreLabels: string[],
    apiKey: string,
    model: string,
): Promise<EvalAssistItem[] | null> {
    if (!apiKey) throw new Error("Gemini APIキーが未設定です");
    if (!transcript || transcript.trim().length < 20) {
        throw new Error("会話ログが不足しています。もう少し会話してから実行してください。");
    }

    const prompt = `あなたは面接・MTG評価の専門家です。
以下の会話ログを読み、各評価項目についてスコアと所見（2〜3文の短い評価コメント）を生成してください。

## 会話ログ
${transcript}

## 評価項目
${labels.map((l, i) => `${i + 1}. ${l}`).join("\n")}

## 使用可能なスコア
${scoreLabels.filter(l => l !== "-").join(", ")}

## 出力形式（JSON配列）
\`\`\`json
[
  { "label": "項目名", "score": "スコア値", "text": "所見テキスト" },
  ...
]
\`\`\`

注意:
- scoreフィールドにはスコアの「値」部分のみ入れてください（例: "5", "A", "pass" など）
- 会話内容から判断できない項目は、scoreを空文字にし、textに「会話内容から判断が困難です」と記載してください
- 必ず ${labels.length} 個の要素を出力してください`;

    const raw = await callGemini(prompt, apiKey, model);
    const parsed = parseJsonResponse<EvalAssistItem[]>(raw);
    return parsed;
}

/**
 * AI評価アシスト（単発）: 指定された1つの評価項目についてスコアと所見を生成する
 */
export async function generateSingleEvaluationAssist(
    transcript: string,
    label: string,
    scoreLabels: string[],
    apiKey: string,
    model: string
): Promise<EvalAssistItem | null> {
    if (!apiKey) throw new Error("Gemini APIキーが未設定です");
    if (!transcript || transcript.trim().length < 20) {
        throw new Error("会話ログが不足しています。");
    }

    const prompt = `あなたは面接・MTG評価の専門家です。
以下の会話ログを読み、指定された評価項目についてスコアと所見（2〜3文の短い評価コメント）を生成してください。

## 会話ログ
${transcript}

## 評価項目
${label}

## 使用可能なスコア
${scoreLabels.filter(l => l !== "-").join(", ")}

## 出力形式（JSON）
\`\`\`json
{ "label": "${label}", "score": "スコア値", "text": "所見テキスト" }
\`\`\`

注意:
- scoreフィールドにはスコアの「値」部分のみ入れてください（例: "5", "A", "pass" など）
- 会話内容から判断できない場合は、scoreを空文字にし、textに「会話内容から判断が困難です」と記載してください`;

    const raw = await callGemini(prompt, apiKey, model);
    const parsed = parseJsonResponse<EvalAssistItem>(raw);
    return parsed;
}

/**
 * Groq API 接続テスト
 * @param groqApiKey - テストするGroq APIキー
 * @returns テスト結果
 */
export async function testGroqConnection(groqApiKey: string): Promise<{ success: boolean; message: string }> {
    if (!groqApiKey) {
        return { success: false, message: "Groq APIキーが未入力です" };
    }
    try {
        // Groq APIのモデル一覧を取得して接続確認する
        const response = await fetch("https://api.groq.com/openai/v1/models", {
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
            },
        });
        if (!response.ok) {
            const errText = await response.text();
            return { success: false, message: `接続エラー (${response.status}): ${errText}` };
        }
        return { success: true, message: "✅ Groq API接続成功！Whisperモデルが利用可能です。" };
    } catch (error) {
        return { success: false, message: `接続エラー: ${error instanceof Error ? error.message : String(error)}` };
    }
}

// ===================================================
// Groq API 関連（相手の音声認識・Whisperモデル・無料）
// ===================================================

const WHISPER_HALLUCINATIONS = [
    "ご視聴ありがとうございました",
    "チャンネル登録",
    "高評価",
    "Thanks for watching",
    "Please subscribe",
    "字幕",
    "おやすみなさい",
    "視聴ありがとうございました",
    "最後までご視聴",
];

/**
 * Groq Whisper API でシステム音声チャンクを認識する
 * @param audioBlob - 音声データ（webm形式）
 * @param groqApiKey - Groq APIキー
 * @returns 認識されたテキスト（null = 未認識 or エラー or ハルシネーション）
 *
 * Groq APIキーの取得方法:
 * 1. https://console.groq.com にアクセス
 * 2. アカウント作成（Google/GitHubログイン可）
 * 3. API Keys ページで「Create API Key」
 * 4. 生成されたキーをコピー
 * ※ 無料枠が非常に大きく、個人利用なら十分
 */
export async function transcribeWithGroq(
    audioBlob: Blob,
    groqApiKey: string
): Promise<string | null> {
    if (!groqApiKey) {
        console.warn("Groq APIキーが未設定です（相手の声の認識はスキップ）");
        return null;
    }

    try {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        formData.append("model", "whisper-large-v3");
        formData.append("language", "ja");
        formData.append("response_format", "json");

        const response = await fetch(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${groqApiKey}`,
                },
                body: formData,
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API エラー:", response.status, errorText);
            return null;
        }

        const data = await response.json();
        const text = data.text?.trim();

        // 空文字や無音は無視
        if (!text || text === "") return null;

        // ハルシネーション対策（特定のフレーズが含まれていたら無視）
        if (WHISPER_HALLUCINATIONS.some((h) => text.includes(h))) {
            console.log("Whisperハルシネーションを検知・除外:", text);
            return null;
        }

        return text;
    } catch (error) {
        console.error("Groq API呼び出しエラー:", error);
        return null;
    }
}
