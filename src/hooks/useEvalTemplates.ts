/**
 * 評価テンプレート管理フック
 * - テンプレートの作成・編集・削除
 * - 各テンプレートは最大10個の評価項目を持つ
 * - localStorageに永続化
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { type ScoreOption, DEFAULT_SCORE_OPTIONS } from "./useInterviewStore";

/** 評価テンプレート項目の定義 */
export interface EvalTemplateItem {
    /** 項目名（例: "基礎能力・専門性"） */
    label: string;
}

/** 評価テンプレート */
export interface EvalTemplate {
    /** テンプレートID */
    id: string;
    /** テンプレート名（例: "新卒エンジニア面接"） */
    name: string;
    /** 評価項目リスト（最大10個） */
    items: EvalTemplateItem[];
    /** テンプレートごとのスコア選択肢 */
    scoreOptions?: ScoreOption[];
    /** 作成日時 */
    createdAt: string;
}

const TEMPLATE_STORAGE_KEY = "interview_hub_templates_v1";
const MAX_ITEMS = 10;

/** デフォルトテンプレート（初期状態で1つ用意） */
function getDefaultTemplates(): EvalTemplate[] {
    return [
        {
            id: "default",
            name: "標準テンプレート",
            items: [
                { label: "基礎能力・専門性" },
                { label: "志向性" },
                { label: "ヒューマンスキル" },
                { label: "性格" },
                { label: "総合評価・生い立ち" },
            ],
            scoreOptions: [...DEFAULT_SCORE_OPTIONS],
            createdAt: new Date().toISOString(),
        },
    ];
}

/**
 * 評価テンプレート管理フック
 */
export function useEvalTemplates() {
    const [templates, setTemplates] = useState<EvalTemplate[]>(getDefaultTemplates);
    const isInitialized = useRef(false);

    // localStorage から読み込み
    useEffect(() => {
        try {
            const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as EvalTemplate[];
                if (parsed.length > 0) {
                    setTemplates(parsed);
                }
            }
        } catch (error) {
            console.error("テンプレート読み込みエラー:", error);
        }
        isInitialized.current = true;
    }, []);

    // 変更時に保存
    useEffect(() => {
        if (!isInitialized.current) return;
        try {
            localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
        } catch (error) {
            console.error("テンプレート保存エラー:", error);
        }
    }, [templates]);

    /** テンプレートを追加する */
    const addTemplate = useCallback((name: string, items: EvalTemplateItem[], scoreOptions?: ScoreOption[]) => {
        const trimmed = items.slice(0, MAX_ITEMS);
        const newTemplate: EvalTemplate = {
            id: `tmpl_${Date.now()}`,
            name,
            items: trimmed,
            scoreOptions: scoreOptions || [...DEFAULT_SCORE_OPTIONS],
            createdAt: new Date().toISOString(),
        };
        setTemplates((prev) => [...prev, newTemplate]);
        return newTemplate;
    }, []);

    /** テンプレートを更新する */
    const updateTemplate = useCallback(
        (id: string, name: string, items: EvalTemplateItem[], scoreOptions?: ScoreOption[]) => {
            const trimmed = items.slice(0, MAX_ITEMS);
            setTemplates((prev) =>
                prev.map((t) => (t.id === id ? { ...t, name, items: trimmed, scoreOptions: scoreOptions || t.scoreOptions } : t))
            );
        },
        []
    );

    /** テンプレートを削除する（最低1つは残す） */
    const deleteTemplate = useCallback((id: string) => {
        setTemplates((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((t) => t.id !== id);
        });
    }, []);

    return {
        templates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        MAX_ITEMS,
    };
}
