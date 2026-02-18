/**
 * 個別の評価項目カードコンポーネント
 * React.memo を使用して再レンダリングを抑制
 */
"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Trash2 } from "lucide-react";
import { type EvaluationItem, type ScoreOption } from "@/hooks/useInterviewStore";

interface EvaluationCardProps {
    /** インデックス番号 */
    index: number;
    /** 評価データ */
    item: EvaluationItem;
    /** 全体のアイテム数（最後のアイテム判定用） */
    totalCount: number;
    /** スコア選択肢 */
    scoreOptions: ScoreOption[];
    /** 更新コールバック */
    onUpdate: (index: number, field: "text" | "score", value: string) => void;
    /** 削除コールバック */
    onDelete?: (index: number) => void;
    /** 単体AI評価アシストコールバック */
    onSingleAiAssist?: (index: number) => Promise<void>;
    /** AI処理中フラグ */
    isAssisting: boolean;
    /** 現在処理中のインデックス */
    processingIndex: number | null;
}

const EvaluationCard = memo(function EvaluationCard({
    index,
    item,
    totalCount,
    scoreOptions,
    onUpdate,
    onDelete,
    onSingleAiAssist,
    isAssisting,
    processingIndex,
}: EvaluationCardProps) {
    const isLast = index === totalCount - 1;
    const isProcessingThis = processingIndex === index;

    return (
        <Card
            className={`group relative overflow-hidden transition-all duration-300 hover:shadow-md border-muted/60 ${isLast ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                }`}
        >
            {/* カード右上アクションエリア (ホバー時に強調) */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity z-10 bg-background/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm border border-transparent group-hover:border-border">
                {/* 単体AIアシスト */}
                {onSingleAiAssist && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSingleAiAssist(index)}
                        disabled={isAssisting || processingIndex !== null}
                        className="h-7 w-7 text-purple-500 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                        title="この項目だけAI評価"
                        aria-label={`${item.label}をAI評価`}
                    >
                        {isProcessingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                        )}
                    </Button>
                )}

                {/* 削除ボタン */}
                {onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(index)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="この項目を削除"
                        aria-label={`${item.label}を削除`}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            <CardHeader className="p-3 pb-0 space-y-1">
                <div className="flex justify-between items-start pr-16">
                    <CardTitle className="text-xs font-bold leading-tight flex items-center gap-2 text-foreground/90">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-mono text-muted-foreground shrink-0 border">
                            {index + 1}
                        </span>
                        {item.label}
                    </CardTitle>
                </div>

                {/* スコア選択エリア */}
                <div className="pt-2 flex items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground shrink-0">評価スコア:</span>
                    <Select
                        value={item.score}
                        onValueChange={(val) =>
                            onUpdate(index, "score", val === "_empty" ? "" : val)
                        }
                    >
                        <SelectTrigger className="h-7 text-xs w-[140px] border-muted/60 bg-background/50 focus:ring-1">
                            <SelectValue placeholder="選択..." />
                        </SelectTrigger>
                        <SelectContent>
                            {scoreOptions.map((opt) => (
                                <SelectItem
                                    key={opt.value || "empty"}
                                    value={opt.value || "_empty"}
                                    className="text-xs"
                                >
                                    <span className="font-medium mr-1">{opt.value || "-"}</span>
                                    <span className="text-muted-foreground text-[10px]">{opt.label}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent className="p-3 pt-2">
                <Textarea
                    value={item.text}
                    onChange={(e) => onUpdate(index, "text", e.target.value)}
                    className={`text-xs leading-relaxed resize-none shadow-none border-t-0 border-x-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 px-1 py-2 transition-colors ${isLast
                            ? "border-indigo-200 focus:border-indigo-500 h-32"
                            : "border-muted focus:border-primary/50 h-24"
                        }`}
                    placeholder={`${item.label}に関する詳細な所見、評価コメントを入力してください...`}
                />
            </CardContent>
        </Card>
    );
});

export default EvaluationCard;
