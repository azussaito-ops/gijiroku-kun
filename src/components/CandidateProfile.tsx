/**
 * 候補者プロフィール表示コンポーネント
 * AIが要約した履歴書・ESの統合情報を表示
 */
"use client";

import { UserCircle, Sparkles } from "lucide-react";

interface CandidateProfileProps {
    /** AI生成されたHTML */
    html: string | null;
    /** ローディング中かどうか */
    isLoading: boolean;
}

export default function CandidateProfile({ html, isLoading }: CandidateProfileProps) {
    if (!html && !isLoading) return null;

    return (
        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
            <h3 className="font-bold text-xs flex items-center gap-2 border-b pb-2 text-indigo-700 dark:text-indigo-300">
                <UserCircle className="h-4 w-4" />
                AI候補者プロフィール
                <Sparkles className="h-3 w-3 text-amber-500" />
            </h3>

            {isLoading ? (
                <div className="space-y-3 animate-pulse">
                    <div className="h-10 bg-muted rounded w-full" />
                    <div className="space-y-1">
                        <div className="h-3 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-5/6" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                    <div className="h-16 bg-muted rounded w-full border border-dashed" />
                </div>
            ) : html ? (
                <div
                    className="text-xs leading-relaxed space-y-2 [&_h4]:font-bold [&_h4]:mt-2 [&_ul]:list-disc [&_ul]:ml-4 [&_strong]:text-indigo-600 [&_strong]:dark:text-indigo-400"
                    dangerouslySetInnerHTML={{ __html: html.replace(/```html|```/g, "") }}
                />
            ) : null}
        </div>
    );
}
