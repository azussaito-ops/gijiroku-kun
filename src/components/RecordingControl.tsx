/**
 * 録音コントロールコンポーネント
 * マイク録音（自分の声）+ システム音声キャプチャ（相手の声）
 * 相手の声は Groq Whisper API で認識
 */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Monitor, MonitorOff, Square } from "lucide-react";
import { SpeechRecognitionEngine } from "@/lib/speech-recognition";
import { AudioCaptureEngine, type SystemAudioChunk, type AudioCaptureState } from "@/lib/audio-capture";
import { transcribeWithGroq } from "@/lib/ai-service";

/** 音声波形ビジュアライザー */
function AudioVisualizer({ analyser }: { analyser: AnalyserNode | null }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // クリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!analyser) {
            // アナライザーがない場合は待機状態の描画（フラットな線など）
            ctx.fillStyle = "rgba(100, 100, 100, 0.1)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let animationId: number;

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 背景（オプション）
            // ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            // ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height;

                // 色: 音量に応じて緑〜黄色〜赤
                const r = barHeight + (25 * (i / bufferLength));
                const g = 250 * (i / bufferLength);
                const b = 50;

                // Tailwind colorsに近い色味で
                ctx.fillStyle = `rgb(99, 102, 241)`; // Indigo-500
                ctx.globalAlpha = 0.6;

                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };

        draw();
        return () => cancelAnimationFrame(animationId);
    }, [analyser]);

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={50}
            className="w-full h-12 bg-muted/50 rounded-md border"
        />
    );
}

interface RecordingControlProps {
    /** 確定テキスト（自分の声）が得られた時 */
    onSelfTranscript: (text: string) => void;
    /** 確定テキスト（相手の声）が得られた時 */
    onOtherTranscript: (text: string) => void;
    /** インテリムテキストが変化した時 */
    onInterimChange: (text: string) => void;
    /** 録音状態が変わった時 */
    onRecordingStateChange?: (isRecording: boolean) => void;
    /** Groq APIキー（相手の音声認識用） */
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
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

    const speechEngineRef = useRef<SpeechRecognitionEngine | null>(null);
    const audioCaptureRef = useRef<AudioCaptureEngine | null>(null);

    // 録音状態が変わったことを通知
    useEffect(() => {
        onRecordingStateChange?.(micActive || systemAudioActive);
    }, [micActive, systemAudioActive, onRecordingStateChange]);

    /** エンジン状態変更ハンドラ */
    const handleEngineStateChange = useCallback((state: AudioCaptureState) => {
        console.log("AudioCaptureState Changed:", state);
        setMicActive(state.micActive);
        setSystemAudioActive(state.systemAudioActive);
    }, []);

    /** システム音声チャンク受信時 → Groq Whisper で認識 */
    const handleAudioChunk = useCallback(
        async (chunk: SystemAudioChunk) => {
            if (!groqApiKey) return;
            const text = await transcribeWithGroq(chunk.blob, groqApiKey);
            if (text) {
                onOtherTranscript(text);
            }
        },
        [groqApiKey, onOtherTranscript]
    );

    /** マイク録音の開始/停止 */
    const toggleMicrophone = useCallback(() => {
        if (micActive) {
            speechEngineRef.current?.stop();
            audioCaptureRef.current?.stopMicrophone();
            setMicActive(false);
        } else {
            if (!speechEngineRef.current) {
                speechEngineRef.current = new SpeechRecognitionEngine({
                    onFinalResult: onSelfTranscript,
                    onInterimResult: onInterimChange,
                    onError: (err) => console.error("音声認識エラー:", err),
                });
            }

            if (!audioCaptureRef.current) {
                audioCaptureRef.current = new AudioCaptureEngine({
                    onChunk: handleAudioChunk,
                    onStateChange: handleEngineStateChange,
                });
            }

            const started = speechEngineRef.current.start();
            if (started) {
                audioCaptureRef.current.startMicrophone();
                // 状態更新は onStateChange に任せるが、即時反映のためここでもセット
                // ただし、非同期で onStateChange が呼ばれるのでこちらはなくても良いが、念のため
                setMicActive(true);
            }
        }
    }, [micActive, onSelfTranscript, onInterimChange, handleAudioChunk, handleEngineStateChange]);

    /** システム音声キャプチャの開始/停止 */
    const toggleSystemAudio = useCallback(async () => {
        if (systemAudioActive) {
            audioCaptureRef.current?.stopSystemAudio();
            // onStateChangeで更新される
        } else {
            if (!audioCaptureRef.current) {
                audioCaptureRef.current = new AudioCaptureEngine({
                    onChunk: handleAudioChunk,
                    onStateChange: handleEngineStateChange,
                });
            }
            // startSystemAudio はユーザーアクションが必要なので await する
            const started = await audioCaptureRef.current.startSystemAudio();

            if (started && audioCaptureRef.current.analyserNode) {
                setAnalyser(audioCaptureRef.current.analyserNode);
            }
        }
    }, [systemAudioActive, handleAudioChunk, handleEngineStateChange]);

    /** 全停止 */
    const stopAll = useCallback(() => {
        speechEngineRef.current?.stop();
        audioCaptureRef.current?.stopAll();
        setAnalyser(null);
    }, []);

    // クリーンアップ
    useEffect(() => {
        return () => {
            speechEngineRef.current?.stop();
            audioCaptureRef.current?.stopAll();
        };
    }, []);

    const isAnyActive = micActive || systemAudioActive;

    return (
        <div className="space-y-3">
            {/* メイン録音ボタン */}
            <Button
                onClick={toggleMicrophone}
                variant={micActive ? "destructive" : "default"}
                className={`w-full py-6 text-lg font-bold shadow-lg transition-all ${micActive
                    ? "animate-pulse bg-red-600 hover:bg-red-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
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

            {/* システム音声キャプチャボタン */}
            <div className="flex gap-2">
                <Button
                    onClick={toggleSystemAudio}
                    variant="outline"
                    className={`flex-1 transition-all ${systemAudioActive
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
                            <Monitor className="mr-2 h-4 w-4" /> 相手の声も取得
                        </>
                    )}
                </Button>

                {isAnyActive && (
                    <Button onClick={stopAll} variant="destructive" size="icon">
                        <Square className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* ステータスバッジ */}
            <div className="flex gap-2 flex-wrap">
                <Badge variant={micActive ? "default" : "secondary"} className="text-xs">
                    <Mic className="mr-1 h-3 w-3" />
                    CH1 自分: {micActive ? "録音中" : "停止"}
                </Badge>
                <Badge
                    variant={systemAudioActive ? "default" : "secondary"}
                    className="text-xs"
                >
                    <Monitor className="mr-1 h-3 w-3" />
                    CH2 相手: {systemAudioActive ? "キャプチャ中" : "停止"}
                </Badge>
            </div>

            {/* ヒント */}
            {!groqApiKey && systemAudioActive && (
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 p-2 rounded-md">
                    ⚠️ Groq APIキーが未設定のため、相手の声はキャプチャのみで認識は行われません。
                    設定画面からAPIキーを入力してください。
                </p>
            )}

            {/* 音声波形ビジュアライザー（システム音声Active時のみ表示） */}
            {systemAudioActive && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-muted-foreground font-bold">音声波形モニター</span>
                        <span className="text-[9px] text-muted-foreground">波形が動かない場合、共有時に「音声」チェックが入っているか確認してください</span>
                    </div>
                    <AudioVisualizer analyser={analyser} />
                </div>
            )}
        </div>
    );
}
