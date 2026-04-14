"use client";

import {
  Briefcase,
  FileDown,
  FileText,
  Headphones,
  HelpCircle,
  KeyRound,
  Mic,
  RotateCcw,
  Settings,
  StickyNote,
  Users,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ManualSection {
  icon: React.ReactNode;
  title: string;
  steps: string[];
}

const sections: ManualSection[] = [
  {
    icon: <Settings className="h-4 w-4 text-emerald-700" />,
    title: "1. 初期設定",
    steps: [
      "右上の「設定」を開きます。",
      "相手側の音声も文字起こしする場合は、Groq APIキーを入力します。",
      "面接モードで履歴書と職務経歴書を要約する場合は、Gemini APIキーを入力します。",
    ],
  },
  {
    icon: <Users className="h-4 w-4 text-emerald-500" />,
    title: "2. MTGモード",
    steps: [
      "録音、メモ、会話ログ、出力だけを使う軽量モードです。",
      "議事メモは中央のメモ欄に自由に入力できます。",
    ],
  },
  {
    icon: <Briefcase className="h-4 w-4 text-teal-700" />,
    title: "3. 面接モード",
    steps: [
      "履歴書と職務経歴書をPDFまたはTXTでアップロードします。",
      "「基本情報・要約・質問を作成」を押すと、氏名や学校名などの基本情報、要約、質問候補が作られます。",
      "録音、面接メモ、会話ログはMTGモードと同じように使えます。",
    ],
  },
  {
    icon: <Mic className="h-4 w-4 text-red-500" />,
    title: "4. 録音と文字起こし",
    steps: [
      "「マイク録音開始」で自分の声を文字起こしします。",
      "「相手の声も取得」を使うと、ブラウザタブや会議アプリの音声も文字起こしできます。",
      "イヤフォン利用時は相手の声がマイクに入りにくいため、相手音声は画面共有の音声から取得してください。",
      "認識された会話は右側のログに時刻付きで追加されます。",
    ],
  },
  {
    icon: <FileDown className="h-4 w-4 text-emerald-700" />,
    title: "5. 保存と出力",
    steps: [
      "「コピー」でメモ、基本情報、要約、質問候補、会話ログをコピーできます。",
      "「TXT」で会話ログをテキストファイルとして保存できます。",
      "「Word出力」でメモ、基本情報、要約、質問候補、会話ログをWord形式で保存できます。",
    ],
  },
];

const faqs = [
  {
    q: "相手の声が取れない",
    a: "イヤフォン利用時は相手の声がマイクに回り込みません。「相手の声も取得」を押したあと、画面共有の選択画面で「音声を共有」を有効にしてください。",
  },
  {
    q: "履歴書や職務経歴書はどこに送られますか？",
    a: "要約を作成するときだけ、入力したGemini APIキーを使ってGoogle Gemini APIに送信されます。このアプリのサーバーには保存されません。",
  },
  {
    q: "データはどこに保存されますか？",
    a: "メモ、会話ログ、APIキー、要約結果はブラウザのlocalStorageに保存されます。アップロードしたPDF本体は永続保存しません。",
  },
];

export default function ManualTab() {
  return (
    <div className="h-full overflow-y-auto p-5 space-y-6 bg-background/50">
      <div className="space-y-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-emerald-700" />
          使い方
        </h2>
        <p className="text-xs text-muted-foreground">
          MTGは軽く、面接は履歴書・職務経歴書の基本情報、要約、質問候補を使えます。
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
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span>書類の基本情報・要約</span>
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
