const WHISPER_HALLUCINATIONS = [
  "ご視聴ありがとうございました",
  "チャンネル登録",
  "高評価",
  "Thanks for watching",
  "Please subscribe",
  "おやすみなさい",
  "最後までご視聴",
];

export async function testGroqConnection(
  groqApiKey: string
): Promise<{ success: boolean; message: string }> {
  if (!groqApiKey) {
    return { success: false, message: "Groq APIキーが未入力です。" };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `接続エラー (${response.status}): ${errorText}`,
      };
    }

    return { success: true, message: "Groq APIに接続できました。" };
  } catch (error) {
    return {
      success: false,
      message: `接続エラー: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function transcribeWithGroq(
  audioBlob: Blob,
  groqApiKey: string
): Promise<string | null> {
  if (!groqApiKey) {
    console.warn("Groq APIキーが未設定のため、相手側音声の文字起こしをスキップします。");
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
      console.error("Groq API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const text = data.text?.trim();

    if (!text) return null;

    if (WHISPER_HALLUCINATIONS.some((phrase) => text.includes(phrase))) {
      console.log("Whisper hallucination filtered:", text);
      return null;
    }

    return text;
  } catch (error) {
    console.error("Groq transcription error:", error);
    return null;
  }
}
