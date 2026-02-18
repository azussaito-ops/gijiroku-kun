/**
 * エクスポート機能モジュール
 * Word(.doc)およびテキスト(.txt)形式でのダウンロードを提供
 */

import type { LogItem, EvaluationItem } from "@/hooks/useInterviewStore";

/** Word形式(.doc)でダウンロード */
export function downloadAsWord(
  logs: LogItem[],
  evaluations: EvaluationItem[],
  freeMemo: string
): void {
  const dateStr = new Date().toLocaleDateString("ja-JP");
  const evalRows = evaluations
    .map(
      (evalItem, index) => `
      <tr>
        <td style="background:#f0f0f0; padding:5px; font-weight:bold;">
          ${index + 1}. ${evalItem.label} [評価:${evalItem.score || "-"}]
        </td>
      </tr>
      <tr>
        <td style="padding:10px;">${evalItem.text.replace(/\n/g, "<br>")}</td>
      </tr>
    `
    )
    .join("");

  const logRows = logs
    .map(
      (l) =>
        `<p><b>[${l.time}] ${l.speaker === "self" ? "自分" : "相手"}:</b> ${l.text}</p>`
    )
    .join("");

  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>面接ログ</title></head>
    <body>
      <h1>面接記録 (${dateStr})</h1>
      <table border="1" style="border-collapse: collapse; width: 100%;">
        ${evalRows}
      </table>
      <br><h2>【自由メモ】</h2>
      <p>${freeMemo.replace(/\n/g, "<br>")}</p>
      <br><h2>【会話ログ】</h2>
      ${logRows}
    </body></html>`;

  const blob = new Blob(["\ufeff", content], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Interview_Log_${dateStr.replace(/\//g, "-")}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/** テキスト形式(.txt)でダウンロード */
export function downloadAsText(logs: LogItem[]): void {
  let txt = `Interview Log ${new Date().toLocaleString("ja-JP")}\n\n`;
  logs.forEach((l) => {
    const speaker = l.speaker === "self" ? "自分" : "相手";
    txt += `[${l.time}] ${speaker}: ${l.text}\n`;
  });

  const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "interview_log.txt";
  a.click();
  URL.revokeObjectURL(url);
}
