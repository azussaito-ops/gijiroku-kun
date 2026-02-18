/**
 * 設定ダイアログコンポーネント
 * - Gemini APIキー（トピック分析・書類分析用）
 * - Groq APIキー（相手の音声認識用・無料）+ 接続テスト
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, ExternalLink, Key, Eye, EyeOff, Activity, CheckCircle2, XCircle } from "lucide-react";
import { testGeminiConnection, testGroqConnection } from "@/lib/ai-service";

/** Gemini接続テストボタン */
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

/** Groq接続テストボタン */
function GroqTestButton({ groqApiKey }: { groqApiKey: string }) {
    const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleTest = async () => {
        if (!groqApiKey) {
            alert("Groq APIキーを入力してください");
            return;
        }
        setStatus("testing");
        setMessage("接続確認中...");

        const result = await testGroqConnection(groqApiKey);

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
            setTimeout(() => {
                alert(result.message);
                setStatus("idle");
                setMessage("");
            }, 500);
        }
    };

    return (
        <Button
            onClick={handleTest}
            disabled={status === "testing" || !groqApiKey}
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
    /** Gemini APIキー変更コールバック */
    onApiKeyChange: (key: string) => void;
    /** Geminiモデル変更コールバック */
    onGeminiModelChange: (model: string) => void;
    /** Groq APIキー変更コールバック */
    onGroqApiKeyChange: (key: string) => void;
}

export default function SettingsDialog({
    apiKey,
    geminiModel,
    groqApiKey,
    onApiKeyChange,
    onGeminiModelChange,
    onGroqApiKeyChange,
}: SettingsDialogProps) {
    const [showApiKey, setShowApiKey] = useState(false);
    const [showGroqKey, setShowGroqKey] = useState(false);

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

                        {/* Groq接続テストボタン */}
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-muted-foreground">
                                ※ Whisperモデル使用
                            </p>
                            <GroqTestButton groqApiKey={groqApiKey} />
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
