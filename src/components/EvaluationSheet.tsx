/**
 * 評価シートコンポーネント
 * テンプレートから読み込んだ動的評価項目を表示・編集
 * スコア選択肢はpropsから受け取り、設定画面でカスタマイズ可能
 */
"use client";

import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { type EvaluationItem, type ScoreOption, DEFAULT_SCORE_OPTIONS } from "@/hooks/useInterviewStore";

interface EvaluationSheetProps {
    /** 評価データ配列（テンプレートから生成） */
    evaluations: EvaluationItem[];
    /** 評価更新コールバック */
    onUpdate: (index: number, field: "text" | "score", value: string) => void;
    /** スコア選択肢（未指定時はデフォルトの5段階） */
    scoreOptions?: ScoreOption[];
}

export default function EvaluationSheet({
    evaluations,
    onUpdate,
    scoreOptions = DEFAULT_SCORE_OPTIONS,
}: EvaluationSheetProps) {
    if (evaluations.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm mb-1">📋 評価項目がありません</p>
                <p className="text-xs">
                    上部の「テンプレート」ボタンからテンプレートを選択してください
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {evaluations.map((evalItem, index) => {
                const isLast = index === evaluations.length - 1;
                return (
                    <div key={index} className="group">
                        <div className="flex justify-between items-center mb-1 ml-1">
                            <label
                                className={`text-[11px] font-bold ${isLast
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-muted-foreground"
                                    }`}
                            >
                                {index + 1}. {evalItem.label}
                            </label>
                            <Select
                                value={evalItem.score}
                                onValueChange={(val) =>
                                    onUpdate(index, "score", val === "_empty" ? "" : val)
                                }
                            >
                                <SelectTrigger className="w-32 h-7 text-xs">
                                    <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                    {scoreOptions.map((opt) => (
                                        <SelectItem
                                            key={opt.value || "empty"}
                                            value={opt.value || "_empty"}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Textarea
                            value={evalItem.text}
                            onChange={(e) => onUpdate(index, "text", e.target.value)}
                            className={`text-xs leading-relaxed resize-none shadow-sm ${isLast
                                ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800 h-40"
                                : "h-28"
                                }`}
                            placeholder={`${evalItem.label}に関する所見を入力...`}
                        />
                    </div>
                );
            })}
        </div>
    );
}
