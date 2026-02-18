/**
 * 評価シートコンポーネント (コンテナ)
 * 評価項目のリスト管理と一括操作を担当
 * 個別の項目表示は EvaluationCard に委譲
 */
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { type EvaluationItem, type ScoreOption, DEFAULT_SCORE_OPTIONS } from "@/hooks/useInterviewStore";
import EvaluationCard from "./EvaluationCard";

interface EvaluationSheetProps {
    /** 評価データ配列（テンプレートから生成） */
    evaluations: EvaluationItem[];
    /** 評価更新コールバック */
    onUpdate: (index: number, field: "text" | "score", value: string) => void;
    /** スコア選択肢（未指定時はデフォルトの5段階） */
    scoreOptions?: ScoreOption[];
    /** 削除コールバック */
    onDelete?: (index: number) => void;
    /** 全体AI評価アシストコールバック */
    onAiAssist?: () => Promise<void>;
    /** 単体AI評価アシストコールバック */
    onSingleAiAssist?: (index: number) => Promise<void>;
}

export default function EvaluationSheet({
    evaluations,
    onUpdate,
    scoreOptions = DEFAULT_SCORE_OPTIONS,
    onAiAssist,
    onDelete,
    onSingleAiAssist,
}: EvaluationSheetProps) {
    const [isAssisting, setIsAssisting] = useState(false);
    const [processingIndex, setProcessingIndex] = useState<number | null>(null);

    /** AI評価アシストボタン押下（一括） */
    const handleAiAssist = useCallback(async () => {
        if (!onAiAssist) return;
        setIsAssisting(true);
        try {
            await onAiAssist();
        } catch (error) {
            console.error("AI評価アシストエラー:", error);
            alert(error instanceof Error ? error.message : "AI評価アシストに失敗しました");
        } finally {
            setIsAssisting(false);
        }
    }, [onAiAssist]);

    /** AI評価アシストボタン押下（単体） */
    const handleSingleAiAssist = useCallback(async (index: number) => {
        if (!onSingleAiAssist) return;
        setProcessingIndex(index);
        try {
            await onSingleAiAssist(index);
        } catch (error) {
            console.error("単体AI評価アシストエラー:", error);
            alert(error instanceof Error ? error.message : "AI評価アシストに失敗しました");
        } finally {
            setProcessingIndex(null);
        }
    }, [onSingleAiAssist]);

    if (evaluations.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                <p className="text-sm font-medium mb-1">📋 評価項目がありません</p>
                <p className="text-xs text-muted-foreground/80">
                    上部の「テンプレート」ボタンからテンプレートを選択するか、<br />
                    新しいテンプレートを作成してください。
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-10">
            {/* ヘッダーエリア: 全体操作ボタン */}
            {onAiAssist && (
                <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-medium text-muted-foreground">
                        全{evaluations.length}項目
                    </span>
                    <Button
                        onClick={handleAiAssist}
                        disabled={isAssisting || processingIndex !== null}
                        size="sm"
                        className="text-[10px] h-7 gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-sm transition-all hover:shadow-md"
                    >
                        {isAssisting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Sparkles className="h-3 w-3" />
                        )}
                        {isAssisting ? "全項目分析中..." : "全項目AI評価"}
                    </Button>
                </div>
            )}

            <div className="grid gap-3">
                {evaluations.map((evalItem, index) => (
                    <EvaluationCard
                        key={index} // 本当はユニークIDが望ましいが、配列インデックスに依存する仕様なら仕方ない
                        index={index}
                        item={evalItem}
                        totalCount={evaluations.length}
                        scoreOptions={scoreOptions}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onSingleAiAssist={onSingleAiAssist ? handleSingleAiAssist : undefined}
                        isAssisting={isAssisting}
                        processingIndex={processingIndex}
                    />
                ))}
            </div>
        </div>
    );
}
