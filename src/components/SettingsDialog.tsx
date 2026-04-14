"use client";

import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Settings,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { testGeminiConnection } from "@/lib/gemini-service";
import { testGroqConnection } from "@/lib/groq-service";

interface SettingsDialogProps {
  groqApiKey: string;
  geminiApiKey: string;
  geminiModel: string;
  onGroqApiKeyChange: (key: string) => void;
  onGeminiApiKeyChange: (key: string) => void;
}

type TestStatus = "idle" | "testing" | "success" | "error";

export default function SettingsDialog({
  groqApiKey,
  geminiApiKey,
  geminiModel,
  onGroqApiKeyChange,
  onGeminiApiKeyChange,
}: SettingsDialogProps) {
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [groqStatus, setGroqStatus] = useState<TestStatus>("idle");
  const [geminiStatus, setGeminiStatus] = useState<TestStatus>("idle");

  const testGroq = async () => {
    setGroqStatus("testing");
    const result = await testGroqConnection(groqApiKey);
    setGroqStatus(result.success ? "success" : "error");
    setTimeout(() => {
      alert(result.message);
      setGroqStatus("idle");
    }, 300);
  };

  const testGemini = async () => {
    setGeminiStatus("testing");
    const result = await testGeminiConnection(geminiApiKey, geminiModel);
    setGeminiStatus(result.success ? "success" : "error");
    setTimeout(() => {
      alert(result.message);
      setGeminiStatus("idle");
    }, 300);
  };

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
            APIキーは一度入力するとこのブラウザに保存されます。外部サーバーには保存されません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <ApiKeyField
            label="Gemini API（履歴書・職務経歴書の要約）"
            description={`使用モデル: ${geminiModel}`}
            href="https://aistudio.google.com/app/apikey"
            placeholder="AIza..."
            value={geminiApiKey}
            visible={showGeminiKey}
            status={geminiStatus}
            onVisibleChange={setShowGeminiKey}
            onChange={onGeminiApiKeyChange}
            onTest={testGemini}
          />

          <ApiKeyField
            label="Groq API（相手側音声の文字起こし）"
            description="Whisperモデルでブラウザタブやアプリ音声を文字起こしします。"
            href="https://console.groq.com/keys"
            placeholder="gsk_..."
            value={groqApiKey}
            visible={showGroqKey}
            status={groqStatus}
            onVisibleChange={setShowGroqKey}
            onChange={onGroqApiKeyChange}
            onTest={testGroq}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ApiKeyField({
  label,
  description,
  href,
  placeholder,
  value,
  visible,
  status,
  onVisibleChange,
  onChange,
  onTest,
}: {
  label: string;
  description: string;
  href: string;
  placeholder: string;
  value: string;
  visible: boolean;
  status: TestStatus;
  onVisibleChange: (visible: boolean) => void;
  onChange: (value: string) => void;
  onTest: () => void;
}) {
  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-bold">{label}</Label>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-emerald-700 hover:underline flex items-center gap-1 shrink-0"
        >
          取得ページ <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="pr-10 text-sm font-mono"
        />
        <button
          type="button"
          onClick={() => onVisibleChange(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "APIキーを隠す" : "APIキーを表示"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-muted-foreground">{description}</p>
        <Button
          onClick={onTest}
          disabled={status === "testing" || !value}
          variant="ghost"
          size="sm"
          className={`h-6 text-[10px] gap-1 border border-input ${
            status === "success"
              ? "text-emerald-600 bg-emerald-50 border-emerald-200"
              : status === "error"
                ? "text-red-600 bg-red-50 border-red-200"
                : ""
          }`}
        >
          {status === "testing" ? (
            <Activity className="h-3 w-3 animate-pulse" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : status === "error" ? (
            <XCircle className="h-3 w-3" />
          ) : (
            <Activity className="h-3 w-3" />
          )}
          接続テスト
        </Button>
      </div>
    </div>
  );
}
