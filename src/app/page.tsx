/**
 * 議事録君 - メインページ
 * 面接モード: 3カラム + タブ切替レイアウト
 * MTGモード: 2カラム（メモ+録音 | トピクス+ログ）
 */
"use client";

import { useState, useCallback, useRef, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Headset,
  FileDown,
  FileText,
  Trash2,
  ChevronDown,
  StickyNote,
  Target,
  Copy,
  Users,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useInterviewStore, DEFAULT_SCORE_OPTIONS } from "@/hooks/useInterviewStore";
import { useEvalTemplates } from "@/hooks/useEvalTemplates";
import {
  analyzeTopics,
  generateCandidateProfile,
  generateEvaluationAssist,
  generateSingleEvaluationAssist,
  type TopicItem,
} from "@/lib/ai-service";
import { downloadAsWord, downloadAsText } from "@/lib/export";


/** アプリモード */

type AppMode = "interview" | "meeting";

const PanelSkeleton = () => (
  <div className="h-24 animate-pulse rounded-md border bg-muted/40" />
);

const RecordingControl = dynamic(() => import("@/components/RecordingControl"), {
  ssr: false,
  loading: PanelSkeleton,
});
const DocumentUpload = dynamic(() => import("@/components/DocumentUpload"), {
  ssr: false,
  loading: PanelSkeleton,
});
const EvaluationSheet = dynamic(() => import("@/components/EvaluationSheet"), {
  ssr: false,
  loading: PanelSkeleton,
});
const TemplateEditor = dynamic(() => import("@/components/TemplateEditor"), {
  ssr: false,
});
const TopicAnalysis = dynamic(() => import("@/components/TopicAnalysis"), {
  ssr: false,
  loading: PanelSkeleton,
});
const TranscriptLog = dynamic(() => import("@/components/TranscriptLog"), {
  ssr: false,
  loading: PanelSkeleton,
});
const CandidateProfile = dynamic(() => import("@/components/CandidateProfile"), {
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
    updateEvaluation,
    applyTemplate,
    updateFreeMemo,
    setDocumentData,
    setCandidateProfile,
    clearLogs,
    flushAiBuffer,
    setApiKey,
    setGeminiModel,
    setGroqApiKey,
    resetAll,
    deleteEvaluationItem,
  } = useInterviewStore();

  const {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    MAX_ITEMS,
  } = useEvalTemplates();

  const [interimText, setInterimText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [deepDiveCollapsed, setDeepDiveCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(600);
  const [saveVisible, setSaveVisible] = useState(false);
  const [isAnalyzingProfile, setIsAnalyzingProfile] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("meeting");
  const [, startInterimTransition] = useTransition();
  const isResizing = useRef(false);
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 保存完了表示
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

  // フリーメモ更新
  const handleMemoChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateFreeMemo(e.target.value);
      showSaveStatus();
    },
    [updateFreeMemo, showSaveStatus]
  );

  // メモ消去
  const handleClearMemo = useCallback(() => {
    if (confirm("メモをすべて消去しますか？この操作は取り消せません。")) {
      updateFreeMemo("");
      showSaveStatus();
    }
  }, [updateFreeMemo, showSaveStatus]);

  // 書類アップロード処理（統合プロフィール生成）
  const handleDocumentExtracted = useCallback(
    async (type: "resume" | "es", text: string, base64?: string) => {
      setDocumentData(type, text, base64);

      // プロフィール生成トリガー
      console.log("書類データ受信:", type, "テキスト長:", text.length, "Base64あり:", !!base64);

      if (!state.apiKey) {
        alert("Gemini APIキーが設定されていないため、プロフィール要約を生成できません。\n右上の「設定」ボタンからAPIキーを入力してください。");
        return;
      }

      // プロフィール生成中なら何もしない（連打防止）
      if (isAnalyzingProfile) {
        console.warn("プロフィール生成処理中のため、リクエストをスキップしました");
        return;
      }

      // テキストがある、またはBase64がある場合に実行
      if (text.length > 0 || base64) {
        setIsAnalyzingProfile(true);
        try {
          console.log("プロフィール生成を開始します...");
          const resumeText = type === "resume" ? text : state.resumeText;
          const esText = type === "es" ? text : state.esText;
          const resumeData = type === "resume" ? base64 : state.resumeData;
          const esData = type === "es" ? base64 : state.esData;

          const profileHtml = await generateCandidateProfile(
            resumeText,
            esText,
            state.apiKey,
            state.geminiModel,
            resumeData,
            esData
          );

          if (profileHtml) {
            console.log("プロフィール生成成功");
            setCandidateProfile(profileHtml);
          } else {
            console.error("プロフィール生成失敗: 結果がnull");
            alert("プロフィールの生成に失敗しました。\nGemini APIキーが正しいか、またはPDFの内容が読み取れるか確認してください。");
          }
        } catch (e) {
          console.error("プロフィール生成エラー:", e);
          alert(`エラーが発生しました: ${e instanceof Error ? e.message : "不明なエラー"}`);
        } finally {
          setIsAnalyzingProfile(false);
        }
      } else {
        console.warn("解析対象のデータがありません");
      }
    },
    [state.apiKey, state.geminiModel, state.resumeText, state.esText, state.resumeData, state.esData, isAnalyzingProfile, setDocumentData, setCandidateProfile]
  );

  // トピック・質問抽出
  const handleTopicAnalyze = useCallback(async (): Promise<TopicItem[] | null> => {
    let text = flushAiBuffer();
    if (!text && state.logs.length > 0) {
      text = state.logs
        .slice(-10)
        .map((l) => l.text)
        .join("\n");
    }
    if (text.length < 10) {
      alert("会話ログが不足しています");
      return null;
    }
    if (!state.apiKey) {
      alert("Gemini APIキーを設定してください（右上の設定ボタン）");
      return null;
    }
    return await analyzeTopics(text, state.apiKey, state.geminiModel);
  }, [state.apiKey, state.geminiModel, state.logs, flushAiBuffer]);

  // リセット
  const handleReset = useCallback(() => {
    if (confirm("全データをリセットしますか？（テンプレートは保持されます）")) {
      resetAll();
      window.location.reload();
    }
  }, [resetAll]);

  // リサイザー
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing.current && e.clientX > 350 && e.clientX < 900) {
        setSidebarWidth(e.clientX);
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startResize = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);



  // 全データコピー
  const handleCopyAll = useCallback(() => {
    const sections: string[] = [];
    sections.push("=== 議事録君 データ ===");
    sections.push(`日時: ${new Date().toLocaleString("ja-JP")}`);
    sections.push("");

    // フリーメモ
    if (state.freeMemo) {
      sections.push("--- フリーメモ ---");
      sections.push(state.freeMemo);
      sections.push("");
    }

    // 評価
    if (state.evaluations.length > 0) {
      sections.push("--- 評価 ---");
      state.evaluations.forEach((ev, i) => {
        sections.push(`${i + 1}. ${ev.label}: ${ev.score || "未評価"} — ${ev.text || "（コメントなし）"}`);
      });
      sections.push("");
    }

    // 会話ログ
    if (state.logs.length > 0) {
      sections.push("--- 会話ログ ---");
      state.logs.forEach((log) => {
        const time = log.time;
        const speaker = log.speaker === "self" ? "自分" : "相手";
        sections.push(`[${time}] ${speaker}: ${log.text}`);
      });
      sections.push("");
    }

    // 候補者プロフィール（テキストのみ）
    if (state.candidateProfile) {
      sections.push("--- 候補者プロフィール ---");
      // HTMLタグを除去
      const div = document.createElement("div");
      div.innerHTML = state.candidateProfile;
      sections.push(div.textContent || "");
      sections.push("");
    }

    navigator.clipboard.writeText(sections.join("\n")).then(() => {
      alert("全データをクリップボードにコピーしました");
    }).catch(() => {
      alert("コピーに失敗しました");
    });
  }, [state]);

  // アクティブテンプレートのscoreOptionsを取得
  const activeTemplate = templates.find((t) => t.id === state.activeTemplateId);
  const activeScoreOptions = activeTemplate?.scoreOptions || DEFAULT_SCORE_OPTIONS;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* ===== ヘッダー ===== */}
      <header
        className={`border-b px-4 py-2 flex justify-between items-center shadow-sm h-14 shrink-0 z-20 transition-colors duration-300 ${isRecording
          ? "bg-red-600 text-white border-red-700"
          : "bg-card text-card-foreground"
          }`}
      >
        {/* 左側：ロゴ & モード切替 */}
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-base flex items-center gap-2 select-none">
            <div
              className={`p-1.5 rounded shadow-sm ${isRecording ? "bg-white/20" : "bg-indigo-600 text-white"
                }`}
            >
              <Headset className="h-4 w-4" />
            </div>
            <span className={isRecording ? "text-white" : ""}>
              議事録君
            </span>
          </h1>

          {/* モード切替タブ */}
          <div className={`flex rounded-md border overflow-hidden ${isRecording ? "border-white/30" : "border-input"}`}>
            <button
              onClick={() => setAppMode("interview")}
              className={`px-3 py-1 text-[10px] font-bold flex items-center gap-1.5 transition-colors ${appMode === "interview"
                ? isRecording
                  ? "bg-white/20 text-white"
                  : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                : isRecording
                  ? "text-white/60 hover:bg-white/10"
                  : "text-muted-foreground hover:bg-muted"
                }`}
              title="面接モード: 評価シートや履歴書分析が使えます"
            >
              <Briefcase className="h-3.5 w-3.5" />
              面接
            </button>
            <div className={`w-[1px] ${isRecording ? "bg-white/30" : "bg-border"}`} />
            <button
              onClick={() => setAppMode("meeting")}
              className={`px-3 py-1 text-[10px] font-bold flex items-center gap-1.5 transition-colors ${appMode === "meeting"
                ? isRecording
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : isRecording
                  ? "text-white/60 hover:bg-white/10"
                  : "text-muted-foreground hover:bg-muted"
                }`}
              title="MTGモード: シンプルな議事録・Topics分析に特化しています"
            >
              <Users className="h-3.5 w-3.5" />
              MTG
            </button>
          </div>
        </div>

        {/* 右側：ツールバー */}
        <div className="flex items-center gap-1.5">
          {/* グループ1: ヘルプ・設定 */}
          <div className="flex items-center gap-1 mr-1">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs h-8 px-2 text-muted-foreground ${isRecording ? "text-white/80 hover:bg-white/10 hover:text-white" : ""}`}
                  title="使い方マニュアルを開く"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl h-[80vh] overflow-hidden p-0 border-none bg-transparent shadow-2xl">
                <div className="h-full bg-background rounded-lg flex flex-col overflow-hidden">
                  <ManualTab />
                </div>
              </DialogContent>
            </Dialog>

            <div title="各種設定 (APIキーなど)">
              <SettingsDialog
                apiKey={state.apiKey}
                geminiModel={state.geminiModel}
                groqApiKey={state.groqApiKey}
                onApiKeyChange={setApiKey}
                onGeminiModelChange={setGeminiModel}
                onGroqApiKeyChange={setGroqApiKey}
              />
            </div>
          </div>


          {/* 区切り線 */}
          <div className={`h-6 w-[1px] mx-1 ${isRecording ? "bg-white/30" : "bg-border"}`} />

          {/* グループ2: データ操作 */}
          <div className="flex items-center gap-1 mr-1">
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className={`text-xs h-8 px-2 gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 ${isRecording ? "text-white/90 hover:bg-white/10 hover:text-white" : ""}`}
              title="現在の内容を全て消去してリセットします"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:inline-block">リセット</span>
            </Button>
          </div>

          {/* 区切り線 */}
          <div className={`h-6 w-[1px] mx-1 ${isRecording ? "bg-white/30" : "bg-border"}`} />

          {/* グループ3: エクスポート */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopyAll}
              variant="outline"
              size="sm"
              className={`text-xs h-8 gap-1.5 ${isRecording
                ? "border-white/30 text-white/90 hover:bg-white/10 bg-transparent"
                : "border-dashed"
                }`}
              title="全データ（メモ・評価・ログ）をクリップボードにコピー"
            >
              <Copy className="h-3.5 w-3.5" />
              コピー
            </Button>

            <Button
              onClick={() => downloadAsText(state.logs)}
              variant="secondary"
              size="sm"
              className={`text-xs h-8 gap-1.5 ${isRecording
                ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
                : ""
                }`}
              title="会話ログをテキストファイルとして保存"
            >
              <FileText className="h-3.5 w-3.5" />
              TXT
            </Button>

            <Button
              onClick={() =>
                downloadAsWord(state.logs, state.evaluations, state.freeMemo)
              }
              size="sm"
              className={`text-xs h-8 gap-1.5 shadow-sm ${isRecording
                ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
                : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              title="整形されたWord形式の議事録をダウンロード"
            >
              <FileDown className="h-3.5 w-3.5" />
              Word出力
            </Button>
          </div>
        </div>
      </header>


      {/* ===== メインコンテンツ ===== */}
      <main className="flex-1 flex overflow-hidden">

        {/* ========== 面接モード ========== */}
        {appMode === "interview" && (
          <>
            {/* === 左サイドバー === */}
            <aside
              className="bg-card flex flex-col z-10 border-r shadow-md overflow-hidden"
              style={{ width: sidebarWidth, minWidth: 350, maxWidth: 900 }}
            >
              {/* 録音コントロール */}
              <div className="p-4 border-b bg-muted/30">
                <RecordingControl
                  onSelfTranscript={(text) => addLog(text, "self")}
                  onOtherTranscript={(text) => addLog(text, "other")}
                  onInterimChange={handleInterimChange}
                  onRecordingStateChange={setIsRecording}
                  groqApiKey={state.groqApiKey}
                />
              </div>

              {/* スクロール可能エリア */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* 書類アップロード */}
                <div className="grid grid-cols-2 gap-4">
                  <DocumentUpload
                    type="resume"
                    label="履歴書"
                    onTextExtracted={(text, base64) => handleDocumentExtracted("resume", text, base64)}
                  />
                  <DocumentUpload
                    type="es"
                    label="ES"
                    onTextExtracted={(text, base64) => handleDocumentExtracted("es", text, base64)}
                  />
                </div>

                {/* AI候補者プロフィール */}
                <CandidateProfile
                  html={state.candidateProfile}
                  isLoading={isAnalyzingProfile}
                />

                <div className="h-6" />
              </div>
            </aside>

            {/* === リサイザー === */}
            <div
              className="w-1.5 cursor-col-resize bg-border hover:bg-indigo-500 transition-colors shrink-0 z-50"
              onMouseDown={startResize}
            />

            {/* === 中央パネル（メモ・評価） === */}
            <div className="flex-1 flex flex-col relative min-w-0 bg-amber-50/30 dark:bg-amber-950/10">

              <div className="flex-1 flex flex-col overflow-y-auto">
                {/* 深掘りガイド */}
                {state.deepDiveHTML && (
                  <div className="px-3 pt-3 shrink-0">
                    <div className="bg-card/90 border-l-4 border-l-red-500 border rounded-md shadow-sm overflow-hidden">
                      <div
                        onClick={() => setDeepDiveCollapsed(!deepDiveCollapsed)}
                        className="px-3 py-2 flex justify-between items-center cursor-pointer hover:bg-muted/50 transition select-none"
                      >
                        <h4 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          面接深掘りガイド
                        </h4>
                        <ChevronDown
                          className={`h-3 w-3 text-muted-foreground transition-transform ${deepDiveCollapsed ? "-rotate-90" : ""
                            }`}
                        />
                      </div>
                      {!deepDiveCollapsed && (
                        <div
                          className="p-3 pt-0 text-xs text-foreground leading-relaxed space-y-2"
                          dangerouslySetInnerHTML={{ __html: state.deepDiveHTML }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* フリーメモヘッダー */}
                <div className="px-4 py-2 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <StickyNote className="h-3.5 w-3.5" />
                      フリーメモ
                    </span>
                    <span
                      className={`text-[9px] text-muted-foreground font-mono transition-opacity ${saveVisible ? "opacity-100" : "opacity-0"
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

                {/* フリーメモ本文 */}
                <Textarea
                  value={state.freeMemo}
                  onChange={handleMemoChange}
                  className="min-h-[200px] w-full px-6 py-2 bg-transparent resize-none focus-visible:ring-0 border-0 text-base leading-relaxed font-mono rounded-none shrink-0"
                  placeholder="自由メモエリア..."
                />

                {/* 評価シート */}
                <div className="border-t px-5 py-4 space-y-3 shrink-0 bg-background/50">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      📋 評価シート
                    </h3>
                    <TemplateEditor
                      templates={templates}
                      activeTemplateId={state.activeTemplateId}
                      onAdd={addTemplate}
                      onUpdate={updateTemplate}
                      onDelete={deleteTemplate}
                      onApply={applyTemplate}
                      maxItems={MAX_ITEMS}
                    />
                  </div>
                  <EvaluationSheet
                    evaluations={state.evaluations}
                    scoreOptions={activeScoreOptions}
                    onUpdate={(i, f, v) => {
                      updateEvaluation(i, f, v);
                      showSaveStatus();
                    }}
                    onDelete={(index) => {
                      if (confirm("この評価項目を削除してもよろしいですか？")) {
                        deleteEvaluationItem(index);
                        showSaveStatus();
                      }
                    }}
                    onSingleAiAssist={async (index) => {
                      const item = state.evaluations[index];
                      if (!item) return;

                      // 会話ログをテキスト化
                      const transcript = state.logs
                        .map((log) => {
                          const speaker = log.speaker === "self" ? "自分" : "相手";
                          return `[${log.time}] ${speaker}: ${log.text}`;
                        })
                        .join("\n");

                      // スコア選択肢のラベル一覧
                      const scoreLabels = activeScoreOptions.map((o) => o.label);

                      const result = await generateSingleEvaluationAssist(
                        transcript,
                        item.label,
                        scoreLabels,
                        state.apiKey,
                        state.geminiModel
                      );

                      if (result) {
                        if (result.score) updateEvaluation(index, "score", result.score);
                        if (result.text) updateEvaluation(index, "text", result.text);
                        showSaveStatus();
                      }
                    }}
                    onAiAssist={async () => {
                      // 会話ログをテキスト化
                      const transcript = state.logs
                        .map((log) => {
                          const speaker = log.speaker === "self" ? "自分" : "相手";
                          return `[${log.time}] ${speaker}: ${log.text}`;
                        })
                        .join("\n");
                      // 評価項目のラベル一覧
                      const labels = state.evaluations.map((e) => e.label);
                      // スコア選択肢のラベル一覧
                      const scoreLabels = activeScoreOptions.map((o) => o.label);
                      // AI生成
                      const result = await generateEvaluationAssist(
                        transcript,
                        labels,
                        scoreLabels,
                        state.apiKey,
                        state.geminiModel
                      );
                      if (result) {
                        result.forEach((item, i) => {
                          if (i < state.evaluations.length) {
                            if (item.score) updateEvaluation(i, "score", item.score);
                            if (item.text) updateEvaluation(i, "text", item.text);
                          }
                        });
                        showSaveStatus();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* === 右サイドバー === */}
            <aside className="w-80 bg-card border-l flex flex-col z-10 shrink-0 shadow-lg">
              <div className="h-1/2 flex flex-col border-b">
                <TopicAnalysis onAnalyze={handleTopicAnalyze} />
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <TranscriptLog
                  logs={state.logs}
                  interimText={interimText}
                  onClear={clearLogs}
                />
              </div>
            </aside>
          </>
        )}

        {/* ========== MTGモード ========== */}
        {appMode === "meeting" && (
          <>
            {/* === 左パネル: 録音+メモ === */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* 録音コントロール */}
              <div className="p-4 border-b bg-muted/30 shrink-0">
                <RecordingControl
                  onSelfTranscript={(text) => addLog(text, "self")}
                  onOtherTranscript={(text) => addLog(text, "other")}
                  onInterimChange={handleInterimChange}
                  onRecordingStateChange={setIsRecording}
                  groqApiKey={state.groqApiKey}
                />
              </div>

              {/* メモ */}
              <div className="flex-1 flex flex-col overflow-y-auto bg-emerald-50/20 dark:bg-emerald-950/10">
                <div className="px-4 pt-3 pb-1 shrink-0 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" />
                    MTGメモ
                  </h3>
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
                  placeholder="議事メモを自由に入力..."
                />
                <div className="px-4 py-2 border-t shrink-0">
                  <span
                    className={`text-[9px] text-muted-foreground font-mono transition-opacity ${saveVisible ? "opacity-100" : "opacity-0"
                      }`}
                  >
                    保存完了
                  </span>
                </div>
              </div>
            </div>

            {/* === 右パネル: Topics+ログ === */}
            <aside className="w-96 bg-card border-l flex flex-col z-10 shrink-0 shadow-lg">
              {/* Topics */}
              <div className="h-1/2 flex flex-col border-b">
                <TopicAnalysis onAnalyze={handleTopicAnalyze} />
              </div>
              {/* 会話ログ */}
              <div className="flex-1 flex flex-col min-h-0">
                <TranscriptLog
                  logs={state.logs}
                  interimText={interimText}
                  onClear={clearLogs}
                />
              </div>
            </aside>
          </>
        )}

      </main>
    </div>
  );
}
