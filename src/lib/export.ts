import type { InterviewAnalysis, LogItem } from "@/hooks/useInterviewStore";

export function downloadAsWord(
  logs: LogItem[],
  freeMemo: string,
  interviewAnalysis?: InterviewAnalysis | null
): void {
  const dateStr = new Date().toLocaleDateString("ja-JP");
  const fileDate = dateStr.replace(/\//g, "-");

  const logRows = logs
    .map((log) => {
      const speaker = log.speaker === "self" ? "自分" : "相手";
      return `<p><b>[${log.time}] ${speaker}:</b> ${escapeHtml(log.text)}</p>`;
    })
    .join("");

  const analysisHtml = interviewAnalysis
    ? `
      ${buildBasicInfoHtml(interviewAnalysis)}
      <h2>履歴書の要約</h2>
      <p>${escapeHtml(interviewAnalysis.resumeSummary).replace(/\n/g, "<br>")}</p>
      <h2>職務経歴書の要約</h2>
      <p>${escapeHtml(interviewAnalysis.workHistorySummary).replace(/\n/g, "<br>")}</p>
      <h2>質問候補</h2>
      <ol>
        ${interviewAnalysis.suggestedQuestions
          .map((question) => `<li>${escapeHtml(question)}</li>`)
          .join("")}
      </ol>
    `
    : "";

  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>議事録</title></head>
    <body>
      <h1>議事録 (${dateStr})</h1>
      <h2>メモ</h2>
      <p>${escapeHtml(freeMemo).replace(/\n/g, "<br>")}</p>
      ${analysisHtml}
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

function buildBasicInfoHtml(interviewAnalysis: InterviewAnalysis): string {
  const info = interviewAnalysis.basicInfo;
  const rows = [
    ["氏名", info?.name],
    ["フリガナ", info?.kana],
    ["学校名", info?.schoolName],
    ["学部・学科", info?.facultyDepartment],
    ["卒業・在学", info?.graduationYear],
    ["現職・直近企業", info?.currentCompany],
    ["職種・役割", info?.latestRole],
    ["メール", info?.email],
    ["電話番号", info?.phone],
    ["住所・居住地", info?.location],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  if (rows.length === 0) return "";

  return `
    <h2>基本情報</h2>
    <table border="1" cellspacing="0" cellpadding="6">
      ${rows
        .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
        .join("")}
    </table>
  `;
}
