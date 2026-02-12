/**
 * 設定ダイアログコンポーネント
 * - Gemini APIキー（トピック分析・書類分析用）
 * - Groq APIキー（相手の音声認識用・無料）
 * - スコア評価設定（5段階/3段階/10段階/カスタム）
 */
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, ExternalLink, Key, Eye, EyeOff, Activity, CheckCircle2, XCircle } from "lucide-react";
import { testGeminiConnection } from "@/lib/ai-service";
import { type ScoreOption, DEFAULT_SCORE_OPTIONS } from "@/hooks/useInterviewStore";

/** スコアプリセット定義 */
const SCORE_PRESETS: { id: string; label: string; options: ScoreOption[] }[] = [
    {
        id: "5scale",
        label: "5段階 (1〜5)",
        options: [...DEFAULT_SCORE_OPTIONS],
    },
    {
        id: "3scale",
        label: "3段階 (A/B/C)",
        options: [
            { value: "", label: "-" },
            { value: "A", label: "A (優秀)" },
            { value: "B", label: "B (標準)" },
            { value: "C", label: "C (要改善)" },
        ],
    },
    {
        id: "4scale",
        label: "4段階 (S/A/B/C)",
        options: [
            { value: "", label: "-" },
            { value: "S", label: "S (非常に優秀)" },
            { value: "A", label: "A (優秀)" },
            { value: "B", label: "B (標準)" },
            { value: "C", label: "C (要改善)" },
        ],
    },
    {
        id: "passfail",
        label: "合否 (合格/不合格)",
        options: [
            { value: "", label: "-" },
            { value: "pass", label: "✅ 合格" },
            { value: "fail", label: "❌ 不合格" },
            { value: "pending", label: "⏳ 保留" },
        ],
    },
];

function GeminiTestButton({ apiKey, model }: { apiKey: string; model: string }) {
    const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleTest = async () => {
        if (!apiKey) {
            alert("APIキーを入力してください");
            return;
        }
        setStatus("testing");
        setMessage("接続確認中...");

        const result = await testGeminiConnection(apiKey, model);

        if (result.success) {
            setStatus("success");
            setMessage("OK");
            setTimeout(() => {
                alert(result.message);
                setStatus("idle");
                setMessage("");
            }, 500);
        } else {
            setStatus("error");
            setMessage("エラー");

            // エラーメッセージの解析と整形
            let displayMessage = result.message;
            if (result.message.includes("429") || result.message.includes("Quota exceeded")) {
                displayMessage = "⚠️ API利用制限（レートリミット）に達しました。\n\n・しばらく時間を置いてから再試行してください。";
            } else if (result.message.includes("404") || result.message.includes("Not Found")) {
                displayMessage = `⚠️ 指定されたモデル「${model}」が見つかりません。\nモデル名が正しいか確認してください。`;
            }

            setTimeout(() => {
                alert(displayMessage);
                setStatus("idle");
                setMessage("");
            }, 500);
        }
    };

    return (
        <Button
            onClick={handleTest}
            disabled={status === "testing" || !apiKey}
            variant="ghost"
            size="sm"
            className={`h-6 text-[10px] gap-1 border border-input ${status === "success" ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                status === "error" ? "text-red-600 bg-red-50 border-red-200" : ""
                }`}
        >
            {status === "testing" ? <Activity className="h-3 w-3 animate-pulse" /> :
                status === "success" ? <CheckCircle2 className="h-3 w-3" /> :
                    status === "error" ? <XCircle className="h-3 w-3" /> :
                        <Activity className="h-3 w-3" />
            }
            {message || "接続テスト"}
        </Button>
    );
}

interface SettingsDialogProps {
    /** Gemini APIキー */
    apiKey: string;
    /** Geminiモデル名 */
    geminiModel: string;
    /** Groq APIキー */
    groqApiKey: string;
    /** 現在のスコア選択肢 */
    scoreOptions: ScoreOption[];
    /** Gemini APIキー変更コールバック */
    onApiKeyChange: (key: string) => void;
    /** Geminiモデル変更コールバック */
    onGeminiModelChange: (model: string) => void;
    /** Groq APIキー変更コールバック */
    onGroqApiKeyChange: (key: string) => void;
    /** スコア選択肢変更コールバック */
    onScoreOptionsChange: (options: ScoreOption[]) => void;
}

export default function SettingsDialog({
    apiKey,
    geminiModel,
    groqApiKey,
    scoreOptions,
    onApiKeyChange,
    onGeminiModelChange,
    onGroqApiKeyChange,
    onScoreOptionsChange,
}: SettingsDialogProps) {
    const [showApiKey, setShowApiKey] = useState(false);
    const [showGroqKey, setShowGroqKey] = useState(false);
    const [showCustomEditor, setShowCustomEditor] = useState(false);
    const [customText, setCustomText] = useState("");

    /** 現在のスコア設定に一致するプリセットIDを返す */
    const getCurrentPresetId = useCallback((): string | null => {
        for (const preset of SCORE_PRESETS) {
            if (preset.options.length !== scoreOptions.length) continue;
            const match = preset.options.every((opt, i) =>
                opt.value === scoreOptions[i]?.value && opt.label === scoreOptions[i]?.label
            );
            if (match) return preset.id;
        }
        return null;
    }, [scoreOptions]);

    /** プリセット選択 */
    const handlePresetSelect = (presetId: string) => {
        const preset = SCORE_PRESETS.find((p) => p.id === presetId);
        if (preset) {
            onScoreOptionsChange([...preset.options]);
            setShowCustomEditor(false);
        }
    };

    /** カスタム入力を開く */
    const handleOpenCustomEditor = () => {
        // 現在の設定を「値:ラベル」形式でテキストに変換
        const text = scoreOptions
            .filter((opt) => opt.value !== "") // 空値（未選択）は除外
            .map((opt) => `${opt.value}:${opt.label}`)
            .join("\n");
        setCustomText(text);
        setShowCustomEditor(true);
    };

    /** カスタムテキストを適用 */
    const handleApplyCustom = () => {
        const lines = customText.split("\n").filter((l) => l.trim() !== "");
        const options: ScoreOption[] = [{ value: "", label: "-" }]; // 先頭に未選択を追加
        for (const line of lines) {
            const colonIdx = line.indexOf(":");
            if (colonIdx > 0) {
                const value = line.substring(0, colonIdx).trim();
                const label = line.substring(colonIdx + 1).trim();
                if (value && label) {
                    options.push({ value, label });
                }
            }
        }
        if (options.length > 1) {
            onScoreOptionsChange(options);
            setShowCustomEditor(false);
        } else {
            alert("有効なスコア定義が見つかりません。「値:ラベル」の形式で入力してください。");
        }
    };

    const currentPresetId = getCurrentPresetId();

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1">
                    <Settings className="h-3.5 w-3.5" />
                    設定
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        API設定
                    </DialogTitle>
                    <DialogDescription>
                        各APIキーは<strong>ブラウザのlocalStorage</strong>に保存されます（外部には送信されません）
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* ===== Gemini API ===== */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold">
                                🧠 Gemini API（トピック分析・書類分析）
                            </Label>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
                            >
                                取得ページ <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                        <div className="relative">
                            <Input
                                type={showApiKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => onApiKeyChange(e.target.value)}
                                placeholder="AIza..."
                                className="pr-10 text-sm font-mono"
                            />
                            <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-muted-foreground">
                                ※ モデル: gemini-3-flash-preview (固定)
                            </p>
                            <GeminiTestButton apiKey={apiKey} model={geminiModel} />
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                            <p className="font-bold text-foreground">📖 取得手順:</p>
                            <ol className="list-decimal list-inside space-y-0.5 ml-1">
                                <li>
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                        Google AI Studio
                                    </a> にアクセス
                                </li>
                                <li>Googleアカウントでログイン</li>
                                <li>「APIキーを作成」ボタンをクリック</li>
                                <li>作成されたキー（AIza...）をコピーして上に貼り付け</li>
                            </ol>
                            <p className="text-emerald-600 dark:text-emerald-400 mt-1">💡 無料枠あり。個人利用なら十分です。</p>
                        </div>
                    </div>

                    {/* ===== Groq API ===== */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold">
                                🎤 Groq API（相手の音声認識・Whisper）
                            </Label>
                            <a
                                href="https://console.groq.com/keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
                            >
                                取得ページ <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                        <div className="relative">
                            <Input
                                type={showGroqKey ? "text" : "password"}
                                value={groqApiKey}
                                onChange={(e) => onGroqApiKeyChange(e.target.value)}
                                placeholder="gsk_..."
                                className="pr-10 text-sm font-mono"
                            />
                            <button
                                onClick={() => setShowGroqKey(!showGroqKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p className="font-bold text-foreground">📖 取得手順:</p>
                            <ol className="list-decimal list-inside space-y-0.5 ml-1">
                                <li>
                                    <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                        Groq Console
                                    </a> にアクセス
                                </li>
                                <li>Google or GitHubアカウントでログイン</li>
                                <li>左メニューの「API Keys」→「Create API Key」</li>
                                <li>生成されたキー（gsk_...）をコピーして上に貼り付け</li>
                            </ol>
                            <p className="text-emerald-600 dark:text-emerald-400 mt-1">💡 完全無料！無料枠が非常に大きく、面接用途なら余裕です。</p>
                            <p className="text-muted-foreground mt-1">
                                ⓘ 未設定でも動作します（自分の声のみ認識）。
                                相手の声も認識したい場合に設定してください。
                            </p>
                        </div>
                    </div>

                    {/* ===== スコア評価設定 ===== */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                        <Label className="text-sm font-bold">
                            📊 スコア評価設定
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                            評価シートで使用するスコアの選択肢を設定できます。
                        </p>

                        {/* プリセット選択 */}
                        <div className="flex flex-wrap gap-1.5">
                            {SCORE_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetSelect(preset.id)}
                                    className={`px-2.5 py-1 text-[10px] rounded-md border transition-colors ${currentPresetId === preset.id
                                            ? "bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-300 font-bold"
                                            : "bg-background hover:bg-muted border-input text-foreground"
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                            <button
                                onClick={handleOpenCustomEditor}
                                className={`px-2.5 py-1 text-[10px] rounded-md border transition-colors ${currentPresetId === null
                                        ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300 font-bold"
                                        : "bg-background hover:bg-muted border-input text-foreground"
                                    }`}
                            >
                                ✏️ カスタム
                            </button>
                        </div>

                        {/* 現在の設定表示 */}
                        <div className="flex flex-wrap gap-1 mt-1">
                            {scoreOptions
                                .filter((opt) => opt.value !== "")
                                .map((opt) => (
                                    <span
                                        key={opt.value}
                                        className="px-1.5 py-0.5 text-[9px] bg-muted rounded border font-mono"
                                    >
                                        {opt.label}
                                    </span>
                                ))}
                        </div>

                        {/* カスタムエディタ */}
                        {showCustomEditor && (
                            <div className="space-y-2 pt-2 border-t">
                                <p className="text-[10px] text-muted-foreground">
                                    「値:ラベル」の形式で1行ずつ入力（例: 5:非常に良い）
                                </p>
                                <Textarea
                                    value={customText}
                                    onChange={(e) => setCustomText(e.target.value)}
                                    className="text-xs font-mono h-24 resize-none"
                                    placeholder={"5:非常に良い\n4:良い\n3:普通\n2:やや不足\n1:不足"}
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px]"
                                        onClick={() => setShowCustomEditor(false)}
                                    >
                                        キャンセル
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-6 text-[10px]"
                                        onClick={handleApplyCustom}
                                    >
                                        適用
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
