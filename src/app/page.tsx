"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  Briefcase,
  Copy,
  FileDown,
  FileText,
  Headset,
  HelpCircle,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useInterviewStore, type DocumentPayload } from "@/hooks/useInterviewStore";
import { downloadAsText, downloadAsWord } from "@/lib/export";

type AppMode = "meeting" | "interview";

const PanelSkeleton = () => (
  <div className="h-24 animate-pulse rounded-md border bg-muted/40" />
);

const RecordingControl = dynamic(() => import("@/components/RecordingControl"), {
  ssr: false,
  loading: PanelSkeleton,
});

const TranscriptLog = dynamic(() => import("@/components/TranscriptLog"), {
  ssr: false,
  loading: PanelSkeleton,
});

const InterviewDocuments = dynamic(() => import("@/components/InterviewDocuments"), {
  ssr: false,
  loading: PanelSkeleton,
});

const SettingsDialog = dynamic(() => import("@/components/SettingsDialog"), {
  ssr: false,
});

const ManualTab = dynamic(() => import("@/components/ManualTab"), {
  ssr: false,
  loading: PanelSkeleton,
});

export default function InterviewPage() {
  const {
    state,
    addLog,
    updateFreeMemo,
    clearLogs,
    setGroqApiKey,
    setGeminiApiKey,
    setResumeDocument,
    setWorkHistoryDocument,
    setInterviewAnalysis,
    resetAll,
  } = useInterviewStore();

  const [appMode, setAppMode] = useState<AppMode>("meeting");
  const [interimText, setInterimText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [saveVisible, setSaveVisible] = useState(false);
  const [isAnalyzingDocuments, setIsAnalyzingDocuments] = useState(false);
  const [, startInterimTransition] = useTransition();
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSaveStatus = useCallback(() => {
    setSaveVisible(true);
    if (saveStatusTimer.current) {
      clearTimeout(saveStatusTimer.current);
    }
    saveStatusTimer.current = setTimeout(() => {
      setSaveVisible(false);
      saveStatusTimer.current = null;
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (saveStatusTimer.current) {
        clearTimeout(saveStatusTimer.current);
      }
    };
  }, []);

  const handleInterimChange = useCallback((text: string) => {
    startInterimTransition(() => {
      setInterimText(text);
    });
  }, [startInterimTransition]);

  const handleMemoChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateFreeMemo(event.target.value);
      showSaveStatus();
    },
    [updateFreeMemo, showSaveStatus]
  );

  const handleClearMemo = useCallback(() => {
    if (confirm("メモをすべて消去しますか？この操作は取り消せません。")) {
      updateFreeMemo("");
      showSaveStatus();
    }
  }, [updateFreeMemo, showSaveStatus]);

  const handleReset = useCallback(() => {
    if (confirm("全データをリセットしますか？設定は保持されます。")) {
      resetAll();
      window.location.reload();
    }
  }, [resetAll]);

  const handleDocumentLoaded = useCallback(
    (kind: "resume" | "workHistory", document: DocumentPayload) => {
      if (kind === "resume") {
        setResumeDocument(document);
      } else {
        setWorkHistoryDocument(document);
      }
      setInterviewAnalysis(null);
    },
    [setResumeDocument, setWorkHistoryDocument, setInterviewAnalysis]
  );

  const handleAnalyzeDocuments = useCallback(async () => {
    if (!state.geminiApiKey) {
      alert("Gemini APIキーを設定してください。右上の「設定」から入力できます。");
      return;
    }

    const hasResume = Boolean(state.resumeText || state.resumeData);
    const hasWorkHistory = Boolean(state.workHistoryText || state.workHistoryData);
    if (!hasResume && !hasWorkHistory) {
      alert("履歴書または職務経歴書をアップロードしてください。");
      return;
    }

    setIsAnalyzingDocuments(true);
    try {
      const { analyzeInterviewDocuments } = await import("@/lib/gemini-service");
      const analysis = await analyzeInterviewDocuments({
        resumeText: state.resumeText,
        workHistoryText: state.workHistoryText,
        apiKey: state.geminiApiKey,
        model: state.geminiModel,
        inlineDocuments: [
          state.resumeData
            ? {
                mimeType: state.resumeMimeType || "application/pdf",
                data: state.resumeData,
              }
            : null,
          state.workHistoryData
            ? {
                mimeType: state.workHistoryMimeType || "application/pdf",
                data: state.workHistoryData,
              }
            : null,
        ].filter((document): document is { mimeType: string; data: string } => Boolean(document)),
      });
      setInterviewAnalysis(analysis);
    } catch (error) {
      alert(error instanceof Error ? error.message : "要約と質問候補の作成に失敗しました。");
    } finally {
      setIsAnalyzingDocuments(false);
    }
  }, [
    state.geminiApiKey,
    state.geminiModel,
    state.resumeText,
    state.resumeData,
    state.resumeMimeType,
    state.workHistoryText,
    state.workHistoryData,
    state.workHistoryMimeType,
    setInterviewAnalysis,
  ]);

  const handleCopyAll = useCallback(() => {
    const sections: string[] = [];
    sections.push("=== 議事録データ ===");
    sections.push(`日時: ${new Date().toLocaleString("ja-JP")}`);
    sections.push("");

    if (state.freeMemo) {
      sections.push("--- メモ ---");
      sections.push(state.freeMemo);
      sections.push("");
    }

    if (state.interviewAnalysis) {
      sections.push("--- 履歴書の要約 ---");
      sections.push(state.interviewAnalysis.resumeSummary);
      sections.push("");
      sections.push("--- 職務経歴書の要約 ---");
      sections.push(state.interviewAnalysis.workHistorySummary);
      sections.push("");
      sections.push("--- 質問候補 ---");
      state.interviewAnalysis.suggestedQuestions.forEach((question, index) => {
        sections.push(`${index + 1}. ${question}`);
      });
      sections.push("");
    }

    if (state.logs.length > 0) {
      sections.push("--- 会話ログ ---");
      state.logs.forEach((log) => {
        const speaker = log.speaker === "self" ? "自分" : "相手";
        sections.push(`[${log.time}] ${speaker}: ${log.text}`);
      });
      sections.push("");
    }

    navigator.clipboard.writeText(sections.join("\n")).then(() => {
      alert("議事録データをクリップボードにコピーしました。");
    }).catch(() => {
      alert("コピーに失敗しました。");
    });
  }, [state.freeMemo, state.interviewAnalysis, state.logs]);

  const memoTitle = appMode === "interview" ? "面接メモ" : "MTGメモ";

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header
        className={`border-b px-3 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 shadow-sm min-h-14 shrink-0 z-20 transition-colors duration-300 ${
          isRecording
            ? "bg-red-600 text-white border-red-700"
            : "bg-card text-card-foreground"
        }`}
      >
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <h1 className="font-bold text-base flex items-center gap-2 select-none">
            <div
              className={`p-1.5 rounded shadow-sm ${
                isRecording ? "bg-white/20" : "bg-emerald-600 text-white"
              }`}
            >
              <Headset className="h-4 w-4" />
            </div>
            <span className={isRecording ? "text-white" : ""}>
              議事録くん
            </span>
          </h1>

          <div className={`flex rounded-md border overflow-hidden ${isRecording ? "border-white/30" : "border-input"}`}>
            <button
              onClick={() => setAppMode("meeting")}
              className={`px-3 py-1 text-[10px] font-bold flex items-center gap-1.5 transition-colors ${
                appMode === "meeting"
                  ? isRecording
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-700"
                  : isRecording
                    ? "text-white/70 hover:bg-white/10"
                    : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              MTG
            </button>
            <div className={`w-px ${isRecording ? "bg-white/30" : "bg-border"}`} />
            <button
              onClick={() => setAppMode("interview")}
              className={`px-3 py-1 text-[10px] font-bold flex items-center gap-1.5 transition-colors ${
                appMode === "interview"
                  ? isRecording
                    ? "bg-white/20 text-white"
                    : "bg-indigo-100 text-indigo-700"
                  : isRecording
                    ? "text-white/70 hover:bg-white/10"
                    : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              面接
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
          <div className="flex items-center gap-1 mr-1">
            <SettingsDialog
              groqApiKey={state.groqApiKey}
              geminiApiKey={state.geminiApiKey}
              geminiModel={state.geminiModel}
              onGroqApiKeyChange={setGroqApiKey}
              onGeminiApiKeyChange={setGeminiApiKey}
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <HelpCircle className="h-3.5 w-3.5" />
                  使い方
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl h-[80vh] p-0 overflow-hidden">
                <ManualTab />
              </DialogContent>
            </Dialog>
          </div>

          <div className={`h-6 w-px ${isRecording ? "bg-white/30" : "bg-border"} mx-1`} />

          <Button
            onClick={handleReset}
            variant="ghost"
            size="sm"
            className={`text-xs h-8 gap-1.5 ${
              isRecording
                ? "text-white hover:bg-white/20"
                : "text-muted-foreground hover:text-destructive"
            }`}
            title="全データをリセット"
          >
            <Trash2 className="h-3.5 w-3.5" />
            リセット
          </Button>

          <Button
            onClick={handleCopyAll}
            variant="secondary"
            size="sm"
            className={`text-xs h-8 gap-1.5 ${
              isRecording
                ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
                : ""
            }`}
            title="メモ、要約、会話ログをコピー"
          >
            <Copy className="h-3.5 w-3.5" />
            コピー
          </Button>

          <Button
            onClick={() => downloadAsText(state.logs)}
            variant="secondary"
            size="sm"
            className={`text-xs h-8 gap-1.5 ${
              isRecording
                ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
                : ""
            }`}
            title="会話ログをテキストファイルとして保存"
          >
            <FileText className="h-3.5 w-3.5" />
            TXT
          </Button>

          <Button
            onClick={() => downloadAsWord(state.logs, state.freeMemo, state.interviewAnalysis)}
            size="sm"
            className={`text-xs h-8 gap-1.5 shadow-sm ${
              isRecording
                ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            title="Word形式の議事録をダウンロード"
          >
            <FileDown className="h-3.5 w-3.5" />
            Word出力
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {appMode === "interview" && (
          <aside className="w-full lg:w-96 h-[42vh] lg:h-auto border-b lg:border-b-0 lg:border-r shrink-0 overflow-hidden">
            <InterviewDocuments
              resumeFileName={state.resumeFileName}
              workHistoryFileName={state.workHistoryFileName}
              analysis={state.interviewAnalysis}
              isAnalyzing={isAnalyzingDocuments}
              onDocumentLoaded={handleDocumentLoaded}
              onAnalyze={handleAnalyzeDocuments}
            />
          </aside>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b bg-muted/30 shrink-0">
            <RecordingControl
              onSelfTranscript={(text) => addLog(text, "self")}
              onOtherTranscript={(text) => addLog(text, "other")}
              onInterimChange={handleInterimChange}
              onRecordingStateChange={setIsRecording}
              groqApiKey={state.groqApiKey}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto bg-emerald-50/20 dark:bg-emerald-950/10">
            <div className="px-4 pt-3 pb-1 shrink-0 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" />
                  {memoTitle}
                </h2>
                <span
                  className={`text-[9px] text-muted-foreground font-mono transition-opacity ${
                    saveVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  保存完了
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearMemo}
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                title="メモを消去"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea
              value={state.freeMemo}
              onChange={handleMemoChange}
              className="flex-1 w-full p-6 bg-transparent resize-none focus-visible:ring-0 border-0 text-base leading-relaxed font-mono rounded-none"
              placeholder={`${memoTitle}を自由に入力...`}
            />
          </div>
        </div>

        <aside className="w-full lg:w-96 h-56 lg:h-auto bg-card border-t lg:border-t-0 lg:border-l flex flex-col z-10 shrink-0 shadow-lg">
          <TranscriptLog
            logs={state.logs}
            interimText={interimText}
            onClear={clearLogs}
          />
        </aside>
      </main>
    </div>
  );
}
