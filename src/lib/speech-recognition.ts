/**
 * Web Speech API ラッパー
 * - Chrome の webkitSpeechRecognition を使用
 * - 自動再接続ロジック搭載
 * - 確定テキストとインテリムのコールバック管理
 */

// ブラウザの SpeechRecognition 型定義
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
    onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
    onerror: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
}

declare global {
    interface Window {
        webkitSpeechRecognition: new () => SpeechRecognitionInstance;
        SpeechRecognition: new () => SpeechRecognitionInstance;
    }
}

export interface SpeechRecognitionCallbacks {
    /** 確定テキストが得られた時のコールバック */
    onFinalResult: (text: string) => void;
    /** インテリム（暫定）テキストが変化した時のコールバック */
    onInterimResult: (text: string) => void;
    /** 認識開始時のコールバック */
    onStart?: () => void;
    /** 認識停止時のコールバック */
    onEnd?: () => void;
    /** エラー発生時のコールバック */
    onError?: (error: string) => void;
}

/**
 * 音声認識エンジン（CH1: マイク用）
 * Web Speech API を使ってリアルタイムに日本語音声を認識する
 */
export class SpeechRecognitionEngine {
    private recognition: SpeechRecognitionInstance | null = null;
    private isRunning = false;
    private shouldRestart = false;
    private callbacks: SpeechRecognitionCallbacks;

    constructor(callbacks: SpeechRecognitionCallbacks) {
        this.callbacks = callbacks;
    }

    /** ブラウザが Web Speech API をサポートしているか */
    static isSupported(): boolean {
        if (typeof window === "undefined") return false;
        return !!(window.webkitSpeechRecognition || window.SpeechRecognition);
    }

    /** 認識を開始する */
    start(): boolean {
        if (!SpeechRecognitionEngine.isSupported()) {
            this.callbacks.onError?.("Web Speech API がサポートされていません（Chromeをご利用ください）");
            return false;
        }

        if (this.isRunning) return true;

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "ja-JP";

        this.recognition.onstart = () => {
            this.isRunning = true;
            this.callbacks.onStart?.();
        };

        this.recognition.onend = () => {
            this.isRunning = false;
            // shouldRestart が true なら自動再接続
            if (this.shouldRestart) {
                try {
                    this.recognition?.start();
                } catch {
                    // 連続 start によるエラーを無視
                }
            } else {
                this.callbacks.onEnd?.();
            }
        };

        this.recognition.onerror = () => {
            // ネットワークエラー等でも自動復帰を試みる
            if (this.shouldRestart) {
                setTimeout(() => {
                    try {
                        this.recognition?.start();
                    } catch {
                        // 無視
                    }
                }, 1000);
            }
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalText = "";
            let interimText = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }

            if (interimText) {
                this.callbacks.onInterimResult(interimText);
            }
            if (finalText) {
                this.callbacks.onFinalResult(finalText);
                this.callbacks.onInterimResult(""); // インテリムをクリア
            }
        };

        this.shouldRestart = true;
        try {
            this.recognition.start();
            return true;
        } catch {
            this.callbacks.onError?.("音声認識の開始に失敗しました");
            return false;
        }
    }

    /** 認識を停止する */
    stop(): void {
        this.shouldRestart = false;
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch {
                // 無視
            }
        }
        this.isRunning = false;
    }

    /** 現在認識中かどうかを返す */
    getIsRunning(): boolean {
        return this.isRunning || this.shouldRestart;
    }
}
