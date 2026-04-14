"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface LogItem {
  time: string;
  text: string;
  speaker: "self" | "other";
}

export interface InterviewState {
  logs: LogItem[];
  freeMemo: string;
  groqApiKey: string;
}

const STORAGE_KEY = "interview_hub_nextjs_v1";
const SAVE_DEBOUNCE_MS = 500;

function getDefaultState(): InterviewState {
  return {
    logs: [],
    freeMemo: "",
    groqApiKey: "",
  };
}

function normalizeSavedState(saved: Partial<InterviewState>): InterviewState {
  return {
    ...getDefaultState(),
    logs: Array.isArray(saved.logs) ? saved.logs : [],
    freeMemo: typeof saved.freeMemo === "string" ? saved.freeMemo : "",
    groqApiKey: typeof saved.groqApiKey === "string" ? saved.groqApiKey : "",
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  const resetAll = useCallback(() => {
    setState((prev) => ({
      ...getDefaultState(),
      groqApiKey: prev.groqApiKey,
    }));
  }, []);

  return {
    state,
    addLog,
    clearLogs,
    updateFreeMemo,
    setGroqApiKey,
    resetAll,
  };
}
