"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DocumentPayload, InterviewAnalysis } from "@/hooks/useInterviewStore";

type DocumentKind = "resume" | "workHistory";

interface InterviewDocumentsProps {
  resumeFileName: string;
  workHistoryFileName: string;
  analysis: InterviewAnalysis | null;
  isAnalyzing: boolean;
  onDocumentLoaded: (kind: DocumentKind, document: DocumentPayload) => void;
  onAnalyze: () => void;
}

interface DocumentUploaderProps {
  kind: DocumentKind;
  title: string;
  description: string;
  fileName: string;
  onLoaded: (kind: DocumentKind, document: DocumentPayload) => void;
}

function DocumentUploader({
  kind,
  title,
  description,
  fileName,
  onLoaded,
}: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const isPdf = file.type === "application/pdf" || extension === "pdf";
      const isText = file.type.startsWith("text/") || extension === "txt" || extension === "md";

      if (!isPdf && !isText) {
        setError("PDFまたはテキストファイルを選択してください。");
        return;
      }

      setIsReading(true);
      setError("");

      try {
        if (isText) {
          const text = await file.text();
          onLoaded(kind, {
            text,
            fileName: file.name,
            mimeType: file.type || "text/plain",
          });
          return;
        }

        const base64 = await fileToBase64(file);
        onLoaded(kind, {
          text: "",
          fileName: file.name,
          base64,
          mimeType: "application/pdf",
        });
      } catch (readError) {
        setError(readError instanceof Error ? readError.message : "ファイルの読み込みに失敗しました。");
      } finally {
        setIsReading(false);
      }
    },
    [kind, onLoaded]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files[0];
      if (file) void processFile(file);
    },
    [processFile]
  );

  return (
    <Card className="gap-3 py-4 rounded-lg">
      <CardHeader className="px-4 gap-1">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-600" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 space-y-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`min-h-24 rounded-lg border-2 border-dashed px-3 py-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
            isDragging ? "border-emerald-500 bg-emerald-50" : "border-muted hover:bg-muted/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,text/plain,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void processFile(file);
              event.currentTarget.value = "";
            }}
          />
          {isReading ? (
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
          <p className="mt-2 text-xs font-medium">
            {isReading ? "読み込み中..." : "PDF / TXTをアップロード"}
          </p>
          {fileName && (
            <Badge variant="outline" className="mt-2 rounded-md">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              {fileName}
            </Badge>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

export default function InterviewDocuments({
  resumeFileName,
  workHistoryFileName,
  analysis,
  isAnalyzing,
  onDocumentLoaded,
  onAnalyze,
}: InterviewDocumentsProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-background">
      <div className="space-y-1">
        <h2 className="text-sm font-bold">面接準備</h2>
        <p className="text-xs text-muted-foreground">
          履歴書と職務経歴書から基本情報、要点、質問候補を作ります。
        </p>
      </div>

      <DocumentUploader
        kind="resume"
        title="履歴書"
        description="プロフィール、学歴、資格などの確認用"
        fileName={resumeFileName}
        onLoaded={onDocumentLoaded}
      />

      <DocumentUploader
        kind="workHistory"
        title="職務経歴書"
        description="経験、役割、実績、スキルの確認用"
        fileName={workHistoryFileName}
        onLoaded={onDocumentLoaded}
      />

      <Button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {isAnalyzing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isAnalyzing ? "作成中..." : "基本情報・要約・質問を作成"}
      </Button>

      {analysis && (
        <div className="space-y-3">
          <BasicInfoBlock analysis={analysis} />
          <SummaryBlock title="履歴書の要約" text={analysis.resumeSummary} />
          <SummaryBlock title="職務経歴書の要約" text={analysis.workHistorySummary} />
          <Card className="gap-3 py-4 rounded-lg">
            <CardHeader className="px-4 gap-1">
              <CardTitle className="text-sm">質問候補</CardTitle>
              <CardDescription className="text-xs">
                面接中に確認したい項目です。
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <ol className="space-y-2 list-decimal ml-4">
                {analysis.suggestedQuestions.map((question, index) => (
                  <li key={index} className="text-xs leading-relaxed">
                    {question}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function BasicInfoBlock({ analysis }: { analysis: InterviewAnalysis }) {
  const info = analysis.basicInfo;
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

  return (
    <Card className="gap-3 py-4 rounded-lg">
      <CardHeader className="px-4 gap-1">
        <CardTitle className="text-sm">基本情報</CardTitle>
        <CardDescription className="text-xs">
          書類から読み取れた候補者情報です。
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        {rows.length > 0 ? (
          <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-xs">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">
            基本情報は見つかりませんでした。
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryBlock({ title, text }: { title: string; text: string }) {
  return (
    <Card className="gap-3 py-4 rounded-lg">
      <CardHeader className="px-4 gap-1">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-xs leading-relaxed whitespace-pre-wrap">{text || "まだ作成されていません。"}</p>
      </CardContent>
    </Card>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("ファイルを読み込めませんでした。"));
        return;
      }
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("ファイルを読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
}
