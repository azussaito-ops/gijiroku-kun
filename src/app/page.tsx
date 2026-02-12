/**
 * 議事録君 - メインページ
 * 面接モード: 3カラム + タブ切替レイアウト
 * MTGモード: 2カラム（メモ+録音 | トピクス+ログ）
 */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Headset,
  FileDown,
  FileText,
  Trash2,
  ChevronDown,
  StickyNote,
  Target,
  BookOpen,
  Copy,
  Moon,
  Sun,
  Users,
  Briefcase,
} from "lucide-react";
import RecordingControl from "@/components/RecordingControl";
import DocumentUpload from "@/components/DocumentUpload";
import EvaluationSheet from "@/components/EvaluationSheet";
import TemplateEditor from "@/components/TemplateEditor";
import TopicAnalysis from "@/components/TopicAnalysis";
import TranscriptLog from "@/components/TranscriptLog";
import CandidateProfile from "@/components/CandidateProfile";
import SettingsDialog from "@/components/SettingsDialog";
import ManualTab from "@/components/ManualTab";
import { useInterviewStore, DEFAULT_SCORE_OPTIONS } from "@/hooks/useInterviewStore";
import { useEvalTemplates } from "@/hooks/useEvalTemplates";
import {
  analyzeTopics,
  generateCandidateProfile,
  type TopicItem,
} from "@/lib/ai-service";
import { downloadAsWord, downloadAsText } from "@/lib/export";

/** 中央パネルのタブ */
type CenterTab = "memo" | "manual";

/** アプリモード */
type AppMode = "interview" | "meeting";

export default function InterviewPage() {
  const {
    state,
    addLog,
    updateEvaluation,
    applyTemplate,
    updateFreeMemo,
    setDocumentText,
    setDocumentHTML, // 後方互換性のため残す
    setCandidateProfile,
    clearLogs,
    flushAiBuffer,
    setApiKey,
    setGeminiModel,
    setGroqApiKey,
    setScoreOptions,
    resetAll,
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
  const [centerTab, setCenterTab] = useState<CenterTab>("memo");
  const [isAnalyzingProfile, setIsAnalyzingProfile] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("interview");
  const isResizing = useRef(false);

  // 保存完了表示
  const showSaveStatus = useCallback(() => {
    setSaveVisible(true);
    const timer = setTimeout(() => setSaveVisible(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // フリーメモ更新
  const handleMemoChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateFreeMemo(e.target.value);
      showSaveStatus();
    },
    [updateFreeMemo, showSaveStatus]
  );

  // 書類アップロード処理（統合プロフィール生成）
  const handleDocumentExtracted = useCallback(
    async (type: "resume" | "es", text: string, base64?: string) => {
      // 互換性のため setDocumentText は残っているが、新しい setDocumentData を使うべき
      // useInterviewStore 側で setDocumentData を公開する必要あり
      // ここでは setDocumentData がまだ公開されていない場合を考慮して、
      // 既存の setDocumentText を使いつつ、anyキャストで無理やり呼ぶか、
      // ストアの型定義を信じて setDocumentData を呼ぶ。
      // 先ほどの修正で setDocumentData は公開されているはず。

      // @ts-ignore - setDocumentData が型定義に含まれていない可能性があるため
      const { setDocumentData } = useInterviewStore.getState ? useInterviewStore.getState() : { setDocumentData: null };

      if (setDocumentData) {
        setDocumentData(type, text, base64);
      } else {
        setDocumentText(type, text);
      }

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
    [state.apiKey, state.geminiModel, state.resumeText, state.esText, state.resumeData, state.esData, setDocumentText, setCandidateProfile]
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

  // ダークモード初期化
  useEffect(() => {
    const saved = localStorage.getItem("interview_hub_dark");
    if (saved === "true" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  // ダークモード切替
  const toggleDarkMode = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("interview_hub_dark", String(next));
  }, [isDark]);

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
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-base flex items-center gap-2">
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
              className={`px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 transition-colors ${appMode === "interview"
                ? isRecording
                  ? "bg-white/20 text-white"
                  : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                : isRecording
                  ? "text-white/60 hover:bg-white/10"
                  : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <Briefcase className="h-3 w-3" />
              面接
            </button>
            <button
              onClick={() => setAppMode("meeting")}
              className={`px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 transition-colors ${appMode === "meeting"
                ? isRecording
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : isRecording
                  ? "text-white/60 hover:bg-white/10"
                  : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <Users className="h-3 w-3" />
              MTG
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SettingsDialog
            apiKey={state.apiKey}
            geminiModel={state.geminiModel}
            groqApiKey={state.groqApiKey}
            scoreOptions={state.scoreOptions}
            onApiKeyChange={setApiKey}
            onGeminiModelChange={setGeminiModel}
            onGroqApiKeyChange={setGroqApiKey}
            onScoreOptionsChange={setScoreOptions}
          />
          <Button
            onClick={toggleDarkMode}
            variant="outline"
            size="sm"
            className={`text-xs gap-1 ${isRecording
              ? "border-white/30 text-white/90 hover:bg-white/10 bg-transparent"
              : ""
              }`}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
          <Button
            onClick={handleCopyAll}
            variant="outline"
            size="sm"
            className={`text-xs gap-1 ${isRecording
              ? "border-white/30 text-white/90 hover:bg-white/10 bg-transparent"
              : ""
              }`}
          >
            <Copy className="h-3.5 w-3.5" />
            コピー
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className={`text-xs gap-1 ${isRecording
              ? "border-white/30 text-white/90 hover:bg-white/10 bg-transparent"
              : "text-red-600 border-red-200 hover:bg-red-50"
              }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            リセット
          </Button>
          <Button
            onClick={() =>
              downloadAsWord(state.logs, state.evaluations, state.freeMemo)
            }
            size="sm"
            className={`text-xs gap-1 ${isRecording
              ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
              : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            <FileDown className="h-3.5 w-3.5" />
            Word出力
          </Button>
          <Button
            onClick={() => downloadAsText(state.logs)}
            variant="secondary"
            size="sm"
            className={`text-xs gap-1 ${isRecording
              ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
              : ""
              }`}
          >
            <FileText className="h-3.5 w-3.5" />
            テキスト保存
          </Button>
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
                  onInterimChange={setInterimText}
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

            {/* === 中央パネル（タブ切替） === */}
            <div className="flex-1 flex flex-col relative min-w-0">
              {/* タブヘッダー */}
              <div className="h-10 bg-card border-b flex items-center px-2 shrink-0 justify-between">
                <div className="flex gap-0.5">
                  <button
                    onClick={() => setCenterTab("memo")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-t transition-colors flex items-center gap-1.5 ${centerTab === "memo"
                      ? "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                    メモ
                  </button>
                  <button
                    onClick={() => setCenterTab("manual")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-t transition-colors flex items-center gap-1.5 ${centerTab === "manual"
                      ? "text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    マニュアル
                  </button>
                </div>
                {centerTab === "memo" && (
                  <span
                    className={`text-[9px] text-muted-foreground font-mono transition-opacity ${saveVisible ? "opacity-100" : "opacity-0"
                      }`}
                  >
                    保存完了
                  </span>
                )}
              </div>

              {/* メモタブ */}
              {centerTab === "memo" && (
                <div className="flex-1 flex flex-col overflow-y-auto bg-amber-50/30 dark:bg-amber-950/10">
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

                  {/* フリーメモ */}
                  <Textarea
                    value={state.freeMemo}
                    onChange={handleMemoChange}
                    className="min-h-[300px] w-full p-6 bg-transparent resize-none focus-visible:ring-0 border-0 text-base leading-relaxed font-mono rounded-none shrink-0"
                    placeholder="自由メモエリア..."
                  />

                  {/* 評価シート */}
                  <div className="border-t px-5 py-4 space-y-3 shrink-0">
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
                    />
                  </div>
                </div>
              )}

              {/* マニュアルタブ */}
              {centerTab === "manual" && (
                <div className="flex-1 overflow-hidden">
                  <ManualTab />
                </div>
              )}
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
                  onInterimChange={setInterimText}
                  onRecordingStateChange={setIsRecording}
                  groqApiKey={state.groqApiKey}
                />
              </div>

              {/* メモ */}
              <div className="flex-1 flex flex-col overflow-y-auto bg-emerald-50/20 dark:bg-emerald-950/10">
                <div className="px-4 pt-3 pb-1 shrink-0">
                  <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" />
                    MTGメモ
                  </h3>
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
