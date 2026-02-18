/**
 * 会話ログ表示コンポーネント
 * チャット形式で会話を表示（自分＝右、相手＝左）
 */
"use client";

import { useEffect, useRef } from "react";
import { Mic, Monitor, User, Bot, Trash2 } from "lucide-react";
import type { LogItem } from "@/hooks/useInterviewStore";

interface TranscriptLogProps {
    /** ログデータ */
    logs: LogItem[];
    /** インテリム（暫定）テキスト */
    interimText: string;
    /** ログクリア関数 */
    onClear: () => void;
}

export default function TranscriptLog({
    logs,
    interimText,
    onClear,
}: TranscriptLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // 新しいログが追加されたら自動スクロール
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [logs, interimText]);

    return (
        <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-zinc-950/50">
            {/* ヘッダー */}
            <div className="h-8 bg-card border-b flex items-center justify-between px-3 shrink-0 shadow-sm z-10">
                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    会話ログ
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded-full">
                        {logs.length} 件
                    </span>
                    <button
                        onClick={onClear}
                        className="p-1 text-muted-foreground hover:text-red-500 transition-colors rounded-sm hover:bg-muted"
                        title="ログをクリア"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* ログ表示エリア */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
            >
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
                        <div className="bg-muted p-4 rounded-full mb-3">
                            <Mic className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground">
                            録音を開始するとここにチャットが表示されます
                        </p>
                    </div>
                ) : (
                    logs.map((log, index) => {
                        const isSelf = log.speaker === "self";
                        return (
                            <div
                                key={index}
                                className={`flex w-full ${isSelf ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                                <div
                                    className={`flex max-w-[85%] md:max-w-[75%] gap-2 ${isSelf ? "flex-row-reverse" : "flex-row"
                                        }`}
                                >
                                    {/* アバターアイコン */}
                                    <div
                                        className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${isSelf
                                            ? "bg-indigo-600 text-white"
                                            : "bg-emerald-600 text-white"
                                            }`}
                                    >
                                        {isSelf ? (
                                            <User className="h-3.5 w-3.5" />
                                        ) : (
                                            <Monitor className="h-3.5 w-3.5" />
                                        )}
                                    </div>

                                    {/* 吹き出し */}
                                    <div className="flex flex-col gap-1">
                                        <div className={`flex items-end gap-2 ${isSelf ? "justify-end" : "justify-start"}`}>
                                            <span className="text-[9px] text-muted-foreground">
                                                {isSelf ? "自分" : "相手"} • {log.time}
                                            </span>
                                        </div>
                                        <div
                                            className={`px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm break-words whitespace-pre-wrap ${isSelf
                                                ? "bg-indigo-600 text-white rounded-tr-none"
                                                : "bg-white dark:bg-zinc-800 text-foreground border rounded-tl-none"
                                                }`}
                                        >
                                            {log.text}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* インテリム（入力中）表示 - 常に自分側の下に表示 */}
                {interimText && (
                    <div className="flex w-full justify-end animate-pulse">
                        <div className="flex max-w-[85%] gap-2 flex-row-reverse">
                            <div className="h-6 w-6 rounded-full bg-indigo-600/50 flex items-center justify-center shrink-0 mt-1">
                                <Mic className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 px-3 py-2 rounded-2xl rounded-tr-none text-xs border border-indigo-100 dark:border-indigo-800">
                                <span className="opacity-70">{interimText}</span>...
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
