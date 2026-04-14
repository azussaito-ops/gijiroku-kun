"use client";

import { useState } from "react";
import { Activity, CheckCircle2, ExternalLink, Eye, EyeOff, Key, Settings, XCircle } from "lucide-react";
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
import { testGroqConnection } from "@/lib/groq-service";

function GroqTestButton({ groqApiKey }: { groqApiKey: string }) {
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleTest = async () => {
    if (!groqApiKey) {
      alert("Groq APIキーを入力してください。");
      return;
    }

    setStatus("testing");
    setMessage("接続確認中...");

    const result = await testGroqConnection(groqApiKey);

    if (result.success) {
      setStatus("success");
      setMessage("OK");
    } else {
      setStatus("error");
      setMessage("エラー");
    }

    setTimeout(() => {
      alert(result.message);
      setStatus("idle");
      setMessage("");
    }, 500);
  };

  return (
    <Button
      onClick={handleTest}
      disabled={status === "testing" || !groqApiKey}
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
      {message || "接続テスト"}
    </Button>
  );
}

interface SettingsDialogProps {
  groqApiKey: string;
  onGroqApiKeyChange: (key: string) => void;
}

export default function SettingsDialog({
  groqApiKey,
  onGroqApiKeyChange,
}: SettingsDialogProps) {
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
            APIキーはブラウザのlocalStorageに保存され、外部サーバーには保存されません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold">
              Groq API（相手側音声の文字起こし）
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
              onChange={(event) => onGroqApiKeyChange(event.target.value)}
              placeholder="gsk_..."
              className="pr-10 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowGroqKey(!showGroqKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showGroqKey ? "APIキーを隠す" : "APIキーを表示"}
            >
              {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-muted-foreground">
              Whisperモデルでブラウザタブやアプリ音声を文字起こしします。
            </p>
            <GroqTestButton groqApiKey={groqApiKey} />
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
            <p className="font-bold text-foreground">取得手順</p>
            <ol className="list-decimal list-inside space-y-0.5 ml-1">
              <li>
                <a
                  href="https://console.groq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  Groq Console
                </a>
                にアクセス
              </li>
              <li>API Keys画面でキーを作成</li>
              <li>作成されたキー（gsk_...）を上の欄に貼り付け</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
