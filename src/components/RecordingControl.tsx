"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AudioCaptureEngine, type AudioCaptureState, type SystemAudioChunk } from "@/lib/audio-capture";
import { transcribeWithGroq } from "@/lib/groq-service";
import { SpeechRecognitionEngine } from "@/lib/speech-recognition";
import { Mic, MicOff, Monitor, MonitorOff, Square } from "lucide-react";

interface RecordingControlProps {
    onSelfTranscript: (text: string) => void;
    onOtherTranscript: (text: string) => void;
    onInterimChange: (text: string) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
    groqApiKey: string;
}

export default function RecordingControl({
    onSelfTranscript,
    onOtherTranscript,
    onInterimChange,
    onRecordingStateChange,
    groqApiKey,
}: RecordingControlProps) {
    const [micActive, setMicActive] = useState(false);
    const [systemAudioActive, setSystemAudioActive] = useState(false);

    const speechEngineRef = useRef<SpeechRecognitionEngine | null>(null);
    const audioCaptureRef = useRef<AudioCaptureEngine | null>(null);
    const groqApiKeyRef = useRef(groqApiKey);
    const onOtherTranscriptRef = useRef(onOtherTranscript);

    useEffect(() => {
        groqApiKeyRef.current = groqApiKey;
        onOtherTranscriptRef.current = onOtherTranscript;
    }, [groqApiKey, onOtherTranscript]);

    useEffect(() => {
        onRecordingStateChange?.(micActive || systemAudioActive);
    }, [micActive, systemAudioActive, onRecordingStateChange]);

    const handleEngineStateChange = useCallback((state: AudioCaptureState) => {
        setMicActive(state.micActive);
        setSystemAudioActive(state.systemAudioActive);
    }, []);

    const ensureAudioCapture = useCallback(() => {
        if (!audioCaptureRef.current) {
            audioCaptureRef.current = new AudioCaptureEngine({
                onChunk: async (chunk: SystemAudioChunk) => {
                    if (!groqApiKeyRef.current) return;

                    try {
                        const text = await transcribeWithGroq(chunk.blob, groqApiKeyRef.current);
                        if (text) {
                            onOtherTranscriptRef.current(text);
                        }
                    } catch (error) {
                        console.error("相手音声の文字起こしに失敗しました:", error);
                    }
                },
                onStateChange: handleEngineStateChange,
            });
        }

        return audioCaptureRef.current;
    }, [handleEngineStateChange]);

    const toggleMicrophone = useCallback(() => {
        if (micActive) {
            speechEngineRef.current?.stop();
            audioCaptureRef.current?.stopMicrophone();
            setMicActive(false);
            return;
        }

        if (!speechEngineRef.current) {
            speechEngineRef.current = new SpeechRecognitionEngine({
                onFinalResult: onSelfTranscript,
                onInterimResult: onInterimChange,
                onError: (error) => console.error("音声認識エラー:", error),
            });
        }

        const started = speechEngineRef.current.start();
        if (started) {
            void ensureAudioCapture().startMicrophone();
            setMicActive(true);
        }
    }, [ensureAudioCapture, micActive, onInterimChange, onSelfTranscript]);

    const toggleSystemAudio = useCallback(async () => {
        if (systemAudioActive) {
            audioCaptureRef.current?.stopSystemAudio();
            return;
        }

        await ensureAudioCapture().startSystemAudio();
    }, [ensureAudioCapture, systemAudioActive]);

    const stopAll = useCallback(() => {
        speechEngineRef.current?.stop();
        audioCaptureRef.current?.stopAll();
    }, []);

    useEffect(() => {
        return () => {
            speechEngineRef.current?.stop();
            audioCaptureRef.current?.stopAll();
        };
    }, []);

    const isAnyActive = micActive || systemAudioActive;

    return (
        <div className="space-y-3">
            <Button
                onClick={toggleMicrophone}
                variant={micActive ? "destructive" : "default"}
                className={`w-full py-6 text-lg font-bold shadow-lg transition-all ${
                    micActive ? "animate-pulse bg-red-600 hover:bg-red-700" : "bg-emerald-700 hover:bg-emerald-800"
                }`}
            >
                {micActive ? (
                    <>
                        <MicOff className="mr-2 h-5 w-5" /> マイク停止
                    </>
                ) : (
                    <>
                        <Mic className="mr-2 h-5 w-5" /> マイク録音開始
                    </>
                )}
            </Button>

            <div className="flex gap-2">
                <Button
                    onClick={toggleSystemAudio}
                    variant="outline"
                    className={`flex-1 transition-all ${
                        systemAudioActive
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : ""
                    }`}
                >
                    {systemAudioActive ? (
                        <>
                            <MonitorOff className="mr-2 h-4 w-4" /> 画面共有停止
                        </>
                    ) : (
                        <>
                            <Monitor className="mr-2 h-4 w-4" /> 相手の音声も取得
                        </>
                    )}
                </Button>

                {isAnyActive && (
                    <Button onClick={stopAll} variant="destructive" size="icon">
                        <Square className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900">
                イヤホン利用時は、相手の音声がマイクに回り込みません。相手の音声は「相手の音声も取得」から共有し、共有画面で「音声を共有」を有効にしてください。
            </p>

            <div className="flex flex-wrap gap-2">
                <Badge variant={micActive ? "default" : "secondary"} className="text-xs">
                    <Mic className="mr-1 h-3 w-3" />
                    CH1 自分: {micActive ? "録音中" : "停止"}
                </Badge>
                <Badge variant={systemAudioActive ? "default" : "secondary"} className="text-xs">
                    <Monitor className="mr-1 h-3 w-3" />
                    CH2 相手: {systemAudioActive ? "キャプチャ中" : "停止"}
                </Badge>
            </div>

            {!groqApiKey && systemAudioActive && (
                <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                    Groq APIキーが未設定のため、相手の音声はキャプチャのみで文字起こしされません。設定画面からAPIキーを入力してください。
                </p>
            )}
        </div>
    );
}
