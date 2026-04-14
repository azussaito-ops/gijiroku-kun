"use client";

import { FileDown, Headphones, HelpCircle, KeyRound, Mic, RotateCcw, Settings, StickyNote } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ManualSection {
  icon: React.ReactNode;
  title: string;
  steps: string[];
}

const sections: ManualSection[] = [
  {
    icon: <Settings className="h-4 w-4 text-indigo-500" />,
    title: "1. 初期設定",
    steps: [
      "右上の「設定」を開きます。",
      "相手側の音声も文字起こしする場合は、Groq APIキーを入力します。",
      "自分のマイクだけを使う場合は、Groq APIキーなしでも使えます。",
    ],
  },
  {
    icon: <Mic className="h-4 w-4 text-red-500" />,
    title: "2. 録音と文字起こし",
    steps: [
      "「マイク録音開始」で自分の声を文字起こしします。",
      "「相手の声も取得」を使うと、ブラウザタブや会議アプリの音声も文字起こしできます。",
      "認識された会話は右側のログに時刻付きで追加されます。",
    ],
  },
  {
    icon: <StickyNote className="h-4 w-4 text-emerald-500" />,
    title: "3. メモ",
    steps: [
      "中央のMTGメモ欄に議題、決定事項、TODOなどを自由に入力します。",
      "メモはブラウザに自動保存されます。",
      "メモ欄右上のゴミ箱アイコンでメモだけを消去できます。",
    ],
  },
  {
    icon: <FileDown className="h-4 w-4 text-blue-500" />,
    title: "4. 保存と出力",
    steps: [
      "「コピー」でメモと会話ログをクリップボードにコピーできます。",
      "「TXT」で会話ログをテキストファイルとして保存できます。",
      "「Word出力」でメモと会話ログをWord形式で保存できます。",
    ],
  },
];

const faqs = [
  {
    q: "相手の声が取れない",
    a: "「相手の声も取得」を押したあと、画面共有の選択画面で「音声を共有」を有効にしてください。",
  },
  {
    q: "データはどこに保存されますか？",
    a: "メモ、会話ログ、APIキーはブラウザのlocalStorageに保存されます。外部サーバーには保存されません。",
  },
  {
    q: "全部消したい",
    a: "右上の「リセット」を押すと、メモと会話ログをまとめて消去できます。APIキーなどの設定は保持されます。",
  },
];

export default function ManualTab() {
  return (
    <div className="h-full overflow-y-auto p-5 space-y-6 bg-background/50">
      <div className="space-y-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-indigo-500" />
          使い方
        </h2>
        <p className="text-xs text-muted-foreground">
          録音、メモ、文字起こしログ、出力だけに絞った軽量版です。
        </p>
      </div>

      <div className="bg-card border rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-bold flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5" />
          できること
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Headphones className="h-3 w-3 text-muted-foreground" />
            <span>マイクと相手音声の文字起こし</span>
          </div>
          <div className="flex items-center gap-2">
            <StickyNote className="h-3 w-3 text-muted-foreground" />
            <span>自動保存メモ</span>
          </div>
          <div className="flex items-center gap-2">
            <FileDown className="h-3 w-3 text-muted-foreground" />
            <span>Word / TXT出力</span>
          </div>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-3 w-3 text-muted-foreground" />
            <span>リセット</span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-5">
        {sections.map((section, index) => (
          <div key={index} className="space-y-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              {section.icon}
              {section.title}
            </h3>
            <ol className="space-y-1 ml-6">
              {section.steps.map((step, stepIndex) => (
                <li
                  key={stepIndex}
                  className="text-xs text-muted-foreground leading-relaxed list-decimal"
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-bold">FAQ</h3>
        {faqs.map((faq, index) => (
          <div key={index} className="bg-card border rounded-md p-3 space-y-1">
            <p className="text-xs font-bold text-foreground">Q. {faq.q}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">A. {faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
