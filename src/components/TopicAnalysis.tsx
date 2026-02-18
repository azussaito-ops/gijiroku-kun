/**
 * トピック分析コンポーネント
 * AIが抽出した会話トピックと深掘り質問を表示
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, RefreshCw, CircleHelp } from "lucide-react";
import type { TopicItem } from "@/lib/ai-service";

interface TopicAnalysisProps {
    /** 分析実行コールバック */
    onAnalyze: () => Promise<TopicItem[] | null>;
}

export default function TopicAnalysis({ onAnalyze }: TopicAnalysisProps) {
    const [topics, setTopics] = useState<(TopicItem & { time: string })[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const result = await onAnalyze();
            if (result) {
                const time = new Date().toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                });
                const newTopics = result.map((t) => ({ ...t, time }));
                setTopics((prev) => [...newTopics, ...prev]);
            }
        } catch (error) {
            console.error("分析エラー:", error);
            alert("分析中にエラーが発生しました。コンソールログを確認してください。");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* ヘッダー */}
            <div className="h-10 bg-muted/50 border-b flex items-center justify-between px-3 shrink-0">
                <h2 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Topics
                </h2>
                <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6 px-2"
                >
                    {isAnalyzing ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-1 h-3 w-3" />
                    )}
                    分析
                </Button>
            </div>

            {/* トピックリスト */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/20">
                {topics.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-40">
                        <Lightbulb className="h-8 w-8 mb-2 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">
                            会話が溜まったら「分析」
                        </p>
                    </div>
                ) : (
                    topics.map((item, index) => (
                        <div
                            key={index}
                            className="bg-card p-3 rounded-lg border shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 border-l-4 border-l-amber-400"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-xs text-foreground flex items-center gap-1">
                                    <Lightbulb className="h-3 w-3 text-amber-400" />
                                    {item.text}
                                </span>
                                <span className="text-[9px] text-muted-foreground">
                                    {item.time}
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                                💡 推奨質問
                            </p>
                            <div className="bg-indigo-50 dark:bg-indigo-950 p-2 rounded-md border border-indigo-100 dark:border-indigo-800 flex gap-2 items-start">
                                <CircleHelp className="h-3 w-3 text-indigo-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 block">
                                        深掘りヒント
                                    </span>
                                    <p className="text-[10px] text-indigo-800 dark:text-indigo-200 font-bold">
                                        {item.suggestedQuestion}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
