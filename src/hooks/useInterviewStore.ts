"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface LogItem {
  time: string;
  text: string;
  speaker: "self" | "other";
}

export interface InterviewAnalysis {
  resumeSummary: string;
  workHistorySummary: string;
  suggestedQuestions: string[];
}

export interface DocumentPayload {
  text: string;
  fileName: string;
  base64?: string;
  mimeType?: string;
}

export interface InterviewState {
  logs: LogItem[];
  freeMemo: string;
  groqApiKey: string;
  geminiApiKey: string;
  geminiModel: string;
  resumeText: string;
  resumeFileName: string;
  resumeData?: string;
  resumeMimeType?: string;
  workHistoryText: string;
  workHistoryFileName: string;
  workHistoryData?: string;
  workHistoryMimeType?: string;
  interviewAnalysis: InterviewAnalysis | null;
}

const STORAGE_KEY = "interview_hub_nextjs_v1";
const SAVE_DEBOUNCE_MS = 500;
const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

function getDefaultState(): InterviewState {
  return {
    logs: [],
    freeMemo: "",
    groqApiKey: "",
    geminiApiKey: "",
    geminiModel: DEFAULT_GEMINI_MODEL,
    resumeText: "",
    resumeFileName: "",
    resumeData: "",
    resumeMimeType: "",
    workHistoryText: "",
    workHistoryFileName: "",
    workHistoryData: "",
    workHistoryMimeType: "",
    interviewAnalysis: null,
  };
}

type LegacySavedState = Partial<InterviewState> & {
  apiKey?: string;
  esText?: string;
  esData?: string;
};

function normalizeSavedState(saved: LegacySavedState): InterviewState {
  return {
    ...getDefaultState(),
    logs: Array.isArray(saved.logs) ? saved.logs : [],
    freeMemo: typeof saved.freeMemo === "string" ? saved.freeMemo : "",
    groqApiKey: typeof saved.groqApiKey === "string" ? saved.groqApiKey : "",
    geminiApiKey:
      typeof saved.geminiApiKey === "string"
        ? saved.geminiApiKey
        : typeof saved.apiKey === "string"
          ? saved.apiKey
          : "",
    geminiModel:
      typeof saved.geminiModel === "string" && saved.geminiModel
        ? saved.geminiModel
        : DEFAULT_GEMINI_MODEL,
    resumeText: typeof saved.resumeText === "string" ? saved.resumeText : "",
    resumeFileName: typeof saved.resumeFileName === "string" ? saved.resumeFileName : "",
    workHistoryText:
      typeof saved.workHistoryText === "string"
        ? saved.workHistoryText
        : typeof saved.esText === "string"
          ? saved.esText
          : "",
    workHistoryFileName:
      typeof saved.workHistoryFileName === "string" ? saved.workHistoryFileName : "",
    interviewAnalysis: saved.interviewAnalysis ?? null,
  };
}

function toPersistedState(state: InterviewState): InterviewState {
  return {
    ...state,
    resumeData: "",
    resumeFileName: state.resumeText ? state.resumeFileName : "",
    resumeMimeType: state.resumeText ? state.resumeMimeType : "",
    workHistoryData: "",
    workHistoryFileName: state.workHistoryText ? state.workHistoryFileName : "",
    workHistoryMimeType: state.workHistoryText ? state.workHistoryMimeType : "",
  };
}

function getInitialState(): InterviewState {
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return normalizeSavedState(JSON.parse(saved) as Partial<InterviewState>);
    }
  } catch (error) {
    console.error("保存データの読み込みに失敗しました:", error);
  }

  return getDefaultState();
}

export function useInterviewStore() {
  const [state, setState] = useState<InterviewState>(getInitialState);
  const isInitialized = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isInitialized.current = true;
  }, []);

  useEffect(() => {
    if (!isInitialized.current) return;

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedState(state)));
      } catch (error) {
        console.error("保存に失敗しました:", error);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [state]);

  useEffect(() => {
    const handlePageHide = () => {
      if (!isInitialized.current) return;

      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedState(state)));
      } catch (error) {
        console.error("保存に失敗しました:", error);
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [state]);

  const addLog = useCallback((text: string, speaker: "self" | "other" = "self") => {
    const time = new Date().toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setState((prev) => ({
      ...prev,
      logs: [...prev.logs, { time, text, speaker }],
    }));
  }, []);

  const clearLogs = useCallback(() => {
    if (confirm("会話ログをクリアしますか？メモと設定は残ります。")) {
      setState((prev) => ({ ...prev, logs: [] }));
    }
  }, []);

  const updateFreeMemo = useCallback((value: string) => {
    setState((prev) => ({ ...prev, freeMemo: value }));
  }, []);

  const setGroqApiKey = useCallback((key: string) => {
    setState((prev) => ({ ...prev, groqApiKey: key }));
  }, []);

  const setGeminiApiKey = useCallback((key: string) => {
    setState((prev) => ({ ...prev, geminiApiKey: key }));
  }, []);

  const setGeminiModel = useCallback((model: string) => {
    setState((prev) => ({ ...prev, geminiModel: model || DEFAULT_GEMINI_MODEL }));
  }, []);

  const setResumeDocument = useCallback((document: DocumentPayload) => {
    setState((prev) => ({
      ...prev,
      resumeText: document.text,
      resumeFileName: document.fileName,
      resumeData: document.base64 || "",
      resumeMimeType: document.mimeType || "",
    }));
  }, []);

  const setWorkHistoryDocument = useCallback((document: DocumentPayload) => {
    setState((prev) => ({
      ...prev,
      workHistoryText: document.text,
      workHistoryFileName: document.fileName,
      workHistoryData: document.base64 || "",
      workHistoryMimeType: document.mimeType || "",
    }));
  }, []);

  const setInterviewAnalysis = useCallback((analysis: InterviewAnalysis | null) => {
    setState((prev) => ({ ...prev, interviewAnalysis: analysis }));
  }, []);

  const resetAll = useCallback(() => {
    setState((prev) => ({
      ...getDefaultState(),
      groqApiKey: prev.groqApiKey,
      geminiApiKey: prev.geminiApiKey,
      geminiModel: prev.geminiModel,
    }));
  }, []);

  return {
    state,
    addLog,
    clearLogs,
    updateFreeMemo,
    setGroqApiKey,
    setGeminiApiKey,
    setGeminiModel,
    setResumeDocument,
    setWorkHistoryDocument,
    setInterviewAnalysis,
    resetAll,
  };
}
