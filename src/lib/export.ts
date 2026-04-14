import type { LogItem } from "@/hooks/useInterviewStore";

export function downloadAsWord(
  logs: LogItem[],
  freeMemo: string
): void {
  const dateStr = new Date().toLocaleDateString("ja-JP");
  const fileDate = dateStr.replace(/\//g, "-");

  const logRows = logs
    .map((log) => {
      const speaker = log.speaker === "self" ? "自分" : "相手";
      return `<p><b>[${log.time}] ${speaker}:</b> ${escapeHtml(log.text)}</p>`;
    })
    .join("");

  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>議事録</title></head>
    <body>
      <h1>議事録 (${dateStr})</h1>
      <h2>メモ</h2>
      <p>${escapeHtml(freeMemo).replace(/\n/g, "<br>")}</p>
      <h2>会話ログ</h2>
      ${logRows || "<p>会話ログはありません。</p>"}
    </body></html>`;

  const blob = new Blob(["\ufeff", content], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gijiroku_${fileDate}.doc`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadAsText(logs: LogItem[]): void {
  let text = `議事録ログ ${new Date().toLocaleString("ja-JP")}\n\n`;

  logs.forEach((log) => {
    const speaker = log.speaker === "self" ? "自分" : "相手";
    text += `[${log.time}] ${speaker}: ${log.text}\n`;
  });

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gijiroku_log.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
