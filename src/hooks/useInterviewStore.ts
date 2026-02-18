/**
 * 面接データの状態管理カスタムフック
 * localStorage ベースの永続化を提供
 * 評価項目はテンプレートから動的に生成
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";

/** ログアイテムの型 */
export interface LogItem {
    time: string;
    text: string;
    /** 話者ラベル: "self" = 自分（マイク）, "other" = 相手（システム音声） */
    speaker: "self" | "other";
}

/** 評価項目の型（ラベルも動的に管理） */
export interface EvaluationItem {
    /** 項目ラベル（テンプレートから設定） */
    label: string;
    /** 所見テキスト */
    text: string;
    /** スコア */
    score: string;
}

/** スコア選択肢の型 */
export interface ScoreOption {
    value: string;
    label: string;
}

/** ストア全体の状態型 */
export interface InterviewState {
    logs: LogItem[];
    evaluations: EvaluationItem[];
    /** 現在使用中のテンプレートID */
    activeTemplateId: string;
    freeMemo: string;
    resumeText: string;
    esText: string;
    /** PDFのBase64データ（テキスト抽出失敗時用） */
    resumeData?: string;
    esData?: string;
    resumeHTML: string;
    esHTML: string;
    deepDiveHTML: string;
    /** 候補者プロフィール（AI要約） */
    candidateProfile: string | null;
    aiBuffer: string;
    apiKey: string;
    /** Geminiモデル名（固定: gemini-3-flash-preview） */
    geminiModel: string;
    groqApiKey: string;
    /** カスタムスコア選択肢 */
    scoreOptions: ScoreOption[];
}

const STORAGE_KEY = "interview_hub_nextjs_v1";

/** デフォルトのスコア選択肢（5段階） */
export const DEFAULT_SCORE_OPTIONS: ScoreOption[] = [
    { value: "", label: "-" },
    { value: "5", label: "5 (非常に良い)" },
    { value: "4", label: "4 (良い)" },
    { value: "3", label: "3 (普通)" },
    { value: "2", label: "2 (やや不足)" },
    { value: "1", label: "1 (不足)" },
];

/** 後方互換性のため SCORE_OPTIONS もエクスポート */
export const SCORE_OPTIONS = DEFAULT_SCORE_OPTIONS;

/** デフォルト状態 */
function getDefaultState(): InterviewState {
    return {
        logs: [],
        evaluations: [],
        activeTemplateId: "",
        freeMemo: "",
        resumeText: "",
        esText: "",
        resumeData: "",
        esData: "",
        resumeHTML: "",
        esHTML: "",
        deepDiveHTML: "",
        candidateProfile: null,
        aiBuffer: "",
        apiKey: "",
        geminiModel: "gemini-3-flash-preview",
        groqApiKey: "",
        scoreOptions: [...DEFAULT_SCORE_OPTIONS],
    };
}

/**
 * 面接データの状態管理フック
 * 全データを localStorage に自動保存する
 */
export function useInterviewStore() {
    const [state, setState] = useState<InterviewState>(getDefaultState);
    const isInitialized = useRef(false);

    // localStorage からデータを読み込む（初回マウント時のみ）
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as Partial<InterviewState>;
                // 既存データに geminiModel がない、または古いモデルの場合の強制アップデート
                // ユーザー要望により gemini-3-flash-preview に固定
                if (!parsed.geminiModel || parsed.geminiModel === "gemini-2.0-flash" || parsed.geminiModel.includes("gemini")) {
                    parsed.geminiModel = "gemini-3-flash-preview";
                }
                setState((prev) => ({ ...prev, ...parsed }));
            }
        } catch (error) {
            console.error("データ読み込みエラー:", error);
        }
        isInitialized.current = true;
    }, []);

    // state が変わるたびに localStorage に保存
    useEffect(() => {
        if (!isInitialized.current) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error("データ保存エラー:", error);
        }
    }, [state]);

    /** ログを追加する */
    const addLog = useCallback((text: string, speaker: "self" | "other" = "self") => {
        const time = new Date().toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
        });
        const logItem: LogItem = { time, text, speaker };
        setState((prev) => ({
            ...prev,
            logs: [...prev.logs, logItem],
            aiBuffer: prev.aiBuffer + text + "\n",
        }));
    }, []);

    /** ログのみをクリアする */
    const clearLogs = useCallback(() => {
        if (confirm("会話ログをクリアしますか？（他のデータは保持されます）")) {
            setState((prev) => ({ ...prev, logs: [], aiBuffer: "" }));
        }
    }, []);

    /** 評価を更新する */
    const updateEvaluation = useCallback(
        (index: number, field: "text" | "score", value: string) => {
            setState((prev) => {
                const newEvals = [...prev.evaluations];
                newEvals[index] = { ...newEvals[index], [field]: value };
                return { ...prev, evaluations: newEvals };
            });
        },
        []
    );

    /** テンプレートを適用して評価項目を初期化する */
    const applyTemplate = useCallback(
        (templateId: string, labels: string[]) => {
            setState((prev) => ({
                ...prev,
                activeTemplateId: templateId,
                evaluations: labels.map((label) => ({ label, text: "", score: "" })),
            }));
        },
        []
    );

    /** フリーメモを更新する */
    const updateFreeMemo = useCallback((value: string) => {
        setState((prev) => ({ ...prev, freeMemo: value }));
    }, []);

    /** 書類データを更新（テキストとBase64） */
    const setDocumentData = useCallback(
        (type: "resume" | "es", text: string, base64?: string) => {
            setState((prev) => ({
                ...prev,
                [type === "resume" ? "resumeText" : "esText"]: text,
                [type === "resume" ? "resumeData" : "esData"]: base64 || "",
            }));
        },
        []
    );

    /** 書類分析HTMLを更新 */
    const setDocumentHTML = useCallback(
        (data: { resumeHTML?: string; esHTML?: string; deepDiveHTML?: string }) => {
            setState((prev) => ({
                ...prev,
                ...(data.resumeHTML !== undefined && { resumeHTML: data.resumeHTML }),
                ...(data.esHTML !== undefined && { esHTML: data.esHTML }),
                ...(data.deepDiveHTML !== undefined && { deepDiveHTML: data.deepDiveHTML }),
            }));
        },
        []
    );

    /** 候補者プロフィールを更新 */
    const setCandidateProfile = useCallback((html: string) => {
        setState((prev) => ({ ...prev, candidateProfile: html }));
    }, []);

    /** AIバッファをクリアして内容を返す */
    const flushAiBuffer = useCallback((): string => {
        let buffer = "";
        setState((prev) => {
            buffer = prev.aiBuffer;
            return { ...prev, aiBuffer: "" };
        });
        return buffer;
    }, []);

    /** APIキーを設定 */
    const setApiKey = useCallback((key: string) => {
        setState((prev) => ({ ...prev, apiKey: key }));
    }, []);

    /** Geminiモデルを設定 */
    const setGeminiModel = useCallback((model: string) => {
        setState((prev) => ({ ...prev, geminiModel: model }));
    }, []);

    /** Groq APIキーを設定 */
    const setGroqApiKey = useCallback((key: string) => {
        setState((prev) => ({ ...prev, groqApiKey: key }));
    }, []);

    /** スコア選択肢を設定 */
    const setScoreOptions = useCallback((options: ScoreOption[]) => {
        setState((prev) => ({ ...prev, scoreOptions: options }));
    }, []);

    /** 全データリセット（設定とテンプレートは保持） */
    const resetAll = useCallback(() => {
        setState((prev) => {
            // 現在の設定を保持
            const preservedSettings = {
                apiKey: prev.apiKey,
                geminiModel: prev.geminiModel,
                groqApiKey: prev.groqApiKey,
                scoreOptions: prev.scoreOptions,
            };
            // 初期状態に設定のみ上書き
            return {
                ...getDefaultState(),
                ...preservedSettings,
            };
        });
        // localStorageはuseEffectで自動反映されるためremoveItemは不要
    }, []);

    /** 評価項目を削除する */
    const deleteEvaluationItem = useCallback((index: number) => {
        setState((prev) => {
            const newEvals = prev.evaluations.filter((_, i) => i !== index);
            return { ...prev, evaluations: newEvals };
        });
    }, []);

    return {
        state,
        addLog,
        clearLogs,
        updateEvaluation,
        deleteEvaluationItem,
        applyTemplate,
        updateFreeMemo,
        setDocumentData,
        setDocumentText: (type: "resume" | "es", text: string) => setDocumentData(type, text), // 互換性のため維持
        setDocumentHTML,
        setCandidateProfile,
        flushAiBuffer,
        setApiKey,
        setGeminiModel,
        setGroqApiKey,
        setScoreOptions,
        resetAll,
    };
}
