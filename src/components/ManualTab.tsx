/**
 * マニュアルタブコンポーネント
 * アプリの使い方・操作手順・FAQ を表示する
 */
"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Mic,
    Monitor,
    FileUp,
    Brain,
    FileDown,
    Settings,
    HelpCircle,
    Headphones,
    KeyRound,
    RotateCcw,
    Layout,
    StickyNote
} from "lucide-react";

/** マニュアルのセクション */
interface ManualSection {
    icon: React.ReactNode;
    title: string;
    steps: string[];
}

const sections: ManualSection[] = [
    {
        icon: <Settings className="h-4 w-4 text-indigo-500" />,
        title: "1. 初回セットアップ",
        steps: [
            "右上の「設定」ボタンを開く",
            "Gemini APIキーを入力（必須）：Google AI Studio で無料取得",
            "Groq APIキーを入力（任意）：Groq Console で無料取得",
            "→ Groqを設定すると相手の声もリアルタイムで認識可能になります",
        ],
    },
    {
        icon: <Layout className="h-4 w-4 text-blue-500" />,
        title: "2. モード選択",
        steps: [
            "ヘッダーの「面接」「MTG」タブでモードを切り替え",
            "💼 面接モード: 履歴書分析・評価シート・深掘り質問機能が有効",
            "👥 MTGモード: 議事録作成に特化したシンプル画面（録音＋メモ＋Topics）",
        ],
    },
    {
        icon: <Mic className="h-4 w-4 text-red-500" />,
        title: "3. 録音・文字起こし",
        steps: [
            "「マイク録音開始」ボタンを押す → 自分の声を認識",
            "「相手の声も取得」ボタン → ブラウザタブやアプリの音声を認識（Zoom/Teams等）",
            "認識された会話は自動的にタイムラインに追加されます",
        ],
    },
    {
        icon: <StickyNote className="h-4 w-4 text-amber-500" />,
        title: "4. メモ・評価（面接モード）",
        steps: [
            "中央パネルで自由にメモを取れます",
            "「評価シート」でスコアとコメントを入力（ゴミ箱アイコンで項目削除可能）",
            "項目名横の✨ボタンで、その項目だけAIが評価します",
            "履歴書・ESをアップロードすると、AIが深掘り質問を提案します",
        ],
    },
    {
        icon: <Brain className="h-4 w-4 text-purple-500" />,
        title: "5. Topics分析",
        steps: [
            "右パネルの「Topics分析」ボタンを押す",
            "会話の内容からトピックと重要な質問/論点をAIが抽出",
            "議論の整理や、次の質問のヒントとして活用できます",
        ],
    },
    {
        icon: <FileDown className="h-4 w-4 text-emerald-500" />,
        title: "6. 保存・エクスポート",
        steps: [
            "データは自動的にブラウザに保存されます（リロードしても消えません）",
            "ヘッダーの「コピー」ボタンで全データをクリップボードにコピー",
            "「Word出力」で整形されたドキュメントとしてダウンロード可能",
        ],
    },
];

/** FAQ */
const faqs = [
    {
        q: "相手の声が取れない",
        a: "「相手の声も取得」を押し、画面共有の際に「音声を共有」にチェックを入れているか確認してください。",
    },
    {
        q: "スコアの選択肢を変えたい",
        a: "評価シート上の「テンプレート」ボタン → 編集アイコン → 「スコア設定」から変更できます。",
    },
    {
        q: "ダークモードにしたい",
        a: "ヘッダーの月アイコン（🌙）をクリックするとダークモードに切り替わります。",
    },
    {
        q: "データはどこに保存されますか？",
        a: "すべてブラウザ内（localStorage）に保存され、サーバーには送信されません。機密情報も安全です。",
    },
];

export default function ManualTab() {
    return (
        <div className="h-full overflow-y-auto p-5 space-y-6 bg-background/50">
            {/* ヘッダー */}
            <div className="space-y-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-indigo-500" />
                    使い方マニュアル
                </h2>
                <p className="text-xs text-muted-foreground">
                    議事録君 の基本操作と機能を説明します。
                </p>
            </div>

            {/* キーボードショートカット */}
            <div className="bg-card border rounded-lg p-3 space-y-2">
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    特徴
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <Headphones className="h-3 w-3 text-muted-foreground" />
                        <span>イヤホン対応</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                        <span>自動保存</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Layout className="h-3 w-3 text-muted-foreground" />
                        <span>2つのモード</span>
                    </div>
                </div>
            </div>

            <Separator />

            {/* 操作手順 */}
            <div className="space-y-5">
                {sections.map((section, i) => (
                    <div key={i} className="space-y-2">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            {section.icon}
                            {section.title}
                        </h3>
                        <ol className="space-y-1 ml-6">
                            {section.steps.map((step, j) => (
                                <li
                                    key={j}
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

            {/* FAQ */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                        FAQ
                    </Badge>
                    よくある質問
                </h3>
                <div className="space-y-3">
                    {faqs.map((faq, i) => (
                        <div key={i} className="space-y-0.5">
                            <p className="text-xs font-bold">Q. {faq.q}</p>
                            <p className="text-xs text-muted-foreground ml-4">A. {faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-4" />
        </div>
    );
}
