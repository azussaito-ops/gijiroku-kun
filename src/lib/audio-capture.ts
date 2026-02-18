/**
 * 音声キャプチャ管理モジュール
 * - CH1: マイク（getUserMedia）→ 自分の声
 * - CH2: システム音声（getDisplayMedia）→ 相手の声（Zoom/Teams等）
 * - MediaRecorder でシステム音声チャンクを生成し、外部STT APIに送信可能
 */

export interface AudioCaptureState {
    /** マイクストリームが有効か */
    micActive: boolean;
    /** システム音声ストリームが有効か */
    systemAudioActive: boolean;
}

export interface SystemAudioChunk {
    /** 音声データ（Blob） */
    blob: Blob;
    /** タイムスタンプ */
    timestamp: number;
}

/**
 * 音声キャプチャエンジン
 * マイクとシステム音声の取得・管理を担当
 */
export class AudioCaptureEngine {
    private micStream: MediaStream | null = null;
    private systemStream: MediaStream | null = null;

    // ダブルバッファリング用
    private recorders: MediaRecorder[] = [];
    private recorderChunks: Blob[][] = [[], []];
    private activeRecorderIndex = 0;
    private switchInterval: NodeJS.Timeout | null = null;

    private audioContext: AudioContext | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private inputGainNode: GainNode | null = null;
    private destinationNode: MediaStreamAudioDestinationNode | null = null;
    private keepAliveOscillator: OscillatorNode | null = null;

    /** 音声解析用ノード（可視化に使用） */
    public analyserNode: AnalyserNode | null = null;

    private onChunkCallback: ((chunk: SystemAudioChunk) => void) | null = null;
    private onStateChange: ((state: AudioCaptureState) => void) | null = null;

    constructor(options?: {
        onChunk?: (chunk: SystemAudioChunk) => void;
        onStateChange?: (state: AudioCaptureState) => void;
    }) {
        this.onChunkCallback = options?.onChunk ?? null;
        this.onStateChange = options?.onStateChange ?? null;
    }

    /** マイクアクセスを開始（CH1: 自分の声用） */
    async startMicrophone(): Promise<boolean> {
        try {
            this.micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            this.notifyStateChange();
            return true;
        } catch (error) {
            console.error("マイクアクセス失敗:", error);
            return false;
        }
    }

    /**
     * システム音声キャプチャを開始（CH2: 相手の声用）
     * getDisplayMedia で画面共有ダイアログを表示し、音声を取得する
     * ユーザーが「音声を共有」にチェックを入れる必要あり
     */
    async startSystemAudio(): Promise<boolean> {
        try {
            // AudioContextの初期化（ブラウザ互換性対応）
            if (!this.audioContext) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                this.audioContext = new AudioContextClass();
            }
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.systemStream = await navigator.mediaDevices.getDisplayMedia({
                audio: {
                    echoCancellation: false, // システム音声はそのまま取り込みたい
                    autoGainControl: false,
                    noiseSuppression: false,
                },
                video: true, // Chrome では video: true が必要な場合がある
            });

            // 音声トラックが存在するか確認
            const audioTracks = this.systemStream.getAudioTracks();
            if (audioTracks.length === 0) {
                console.warn("システム音声トラックが検出されませんでした。「音声を共有」にチェックを入れてください。");
                this.stopSystemAudio();
                return false;
            }

            // 映像トラックを無効化（音声のみ必要）
            // ※ stop() するとChrome等では音声も止まってしまうため、enabled=falseのみにする
            this.systemStream.getVideoTracks().forEach((track) => {
                track.enabled = false;
            });

            // AudioContextを使用したミキシング（Keep-Alive対策）
            this.setupAudioMixing(this.systemStream);

            // ストリーム終了時（ユーザーが共有を停止した時）のハンドリング
            audioTracks[0].onended = () => {
                this.stopSystemAudio();
            };

            this.notifyStateChange();
            return true;
        } catch (error) {
            console.error("システム音声キャプチャ失敗:", error);
            return false;
        }
    }

    /**
     * Web Audio APIを使用して無音信号をミックスし、途切れを防ぐ
     */
    private setupAudioMixing(stream: MediaStream): void {
        if (!this.audioContext) return;

        try {
            // ソース作成
            this.sourceNode = this.audioContext.createMediaStreamSource(stream);
            this.destinationNode = this.audioContext.createMediaStreamDestination();

            // ゲイン調整（音量増幅）
            this.inputGainNode = this.audioContext.createGain();
            this.inputGainNode.gain.value = 5.0; // システム音量は小さい傾向があるため5倍に増幅

            // 解析用ノード作成
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 256;

            // source -> inputGain -> destination & analyser
            this.sourceNode.connect(this.inputGainNode);
            this.inputGainNode.connect(this.destinationNode);
            this.inputGainNode.connect(this.analyserNode);

            // Keep-Alive用オシレーター（ごく微細なノイズを混ぜてストリームを持続させる）
            this.keepAliveOscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0.0001; // 人間には聞こえないレベル
            this.keepAliveOscillator.connect(gainNode);
            gainNode.connect(this.destinationNode);
            this.keepAliveOscillator.start();

            // MediaRecorder開始（ダブルバッファリング）
            this.startDualRecording(this.destinationNode.stream);
        } catch (error) {
            console.error("AudioContext設定エラー:", error);
            // エラー時は生のストリームでフォールバック（ダブルバッファリングせず簡易版で）
            this.startSimpleRecording(stream);
        }
    }

    /**
     * ダブルバッファリング録音
     * 2つのMediaRecorderを交互に使って、途切れなく、かつヘッダー付きの完全なファイルを生成する
     */
    private startDualRecording(stream: MediaStream): void {
        const audioStream = new MediaStream(stream.getAudioTracks());

        // レコーダー初期化ヘルパー
        const createRecorder = (index: number) => {
            let recorder: MediaRecorder;
            try {
                recorder = new MediaRecorder(audioStream, { mimeType: "audio/webm;codecs=opus" });
            } catch {
                recorder = new MediaRecorder(audioStream);
            }

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.recorderChunks[index].push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(this.recorderChunks[index], { type: "audio/webm;codecs=opus" });
                this.recorderChunks[index] = []; // クリア

                if (blob.size > 0 && this.onChunkCallback) {
                    this.onChunkCallback({
                        blob,
                        timestamp: Date.now()
                    });
                }
            };

            return recorder;
        };

        this.recorders = [createRecorder(0), createRecorder(1)];
        this.activeRecorderIndex = 0;

        // 最初のレコーダー開始
        this.recorders[0].start();

        // 3秒ごとに切り替え
        this.switchInterval = setInterval(() => {
            const nextIndex = (this.activeRecorderIndex + 1) % 2;
            const currentIndex = this.activeRecorderIndex;

            // 次のレコーダーを開始してから、今のレコーダーを止める（オーバーラップではないが、隙間を最小限に）
            // ※ MediaStreamは共有されているので、同時にstartして良い
            // しかし、完全にオーバーラップさせると重複録音になるので、
            // 「次を開始」→「即座に前を停止」とする。

            if (this.recorders[nextIndex].state === "inactive") {
                this.recorders[nextIndex].start();
            }

            if (this.recorders[currentIndex].state !== "inactive") {
                this.recorders[currentIndex].stop();
            }

            this.activeRecorderIndex = nextIndex;
        }, 3000);
    }

    /**
     * 簡易録音（AudioContext失敗時のフォールバック）
     * timesliceを使うため、ヘッダー欠落のリスクがあるが、最低限動作させる
     */
    private startSimpleRecording(stream: MediaStream): void {
        const audioStream = new MediaStream(stream.getAudioTracks());
        let recorder: MediaRecorder;
        try {
            recorder = new MediaRecorder(audioStream, { mimeType: "audio/webm;codecs=opus" });
        } catch {
            recorder = new MediaRecorder(audioStream);
        }

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0 && this.onChunkCallback) {
                this.onChunkCallback({
                    blob: event.data,
                    timestamp: Date.now(),
                });
            }
        };

        recorder.start(3000);
        this.recorders = [recorder]; // 管理配列に入れておく（stop時用）
    }

    /** マイクを停止 */
    stopMicrophone(): void {
        if (this.micStream) {
            this.micStream.getTracks().forEach((track) => track.stop());
            this.micStream = null;
        }
        this.notifyStateChange();
    }

    /** システム音声キャプチャを停止 */
    stopSystemAudio(): void {
        // ダブルバッファリングの停止
        if (this.switchInterval) {
            clearInterval(this.switchInterval);
            this.switchInterval = null;
        }

        this.recorders.forEach(rec => {
            if (rec && rec.state !== "inactive") {
                rec.stop();
            }
        });
        this.recorders = [];
        this.recorderChunks = [[], []];

        // Web Audio API リソースの解放
        if (this.keepAliveOscillator) {
            try { this.keepAliveOscillator.stop(); } catch { }
            this.keepAliveOscillator.disconnect();
            this.keepAliveOscillator = null;
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.destinationNode) {
            this.destinationNode = null;
        }
        if (this.inputGainNode) {
            this.inputGainNode.disconnect();
            this.inputGainNode = null;
        }
        if (this.analyserNode) {
            this.analyserNode.disconnect();
            this.analyserNode = null;
        }
        // AudioContextは使い回すのでcloseしない（あるいはアプリ終了時のみ）

        if (this.systemStream) {
            this.systemStream.getTracks().forEach((track) => track.stop());
            this.systemStream = null;
        }
        this.notifyStateChange();
    }

    /** すべてを停止 */
    stopAll(): void {
        this.stopMicrophone();
        this.stopSystemAudio();

        // Contextも閉じる
        if (this.audioContext && this.audioContext.state !== "closed") {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    /** 現在の状態を取得 */
    getState(): AudioCaptureState {
        return {
            micActive: this.micStream !== null && this.micStream.active,
            systemAudioActive: this.systemStream !== null && this.systemStream.active,
        };
    }

    /** 状態変更を通知 */
    private notifyStateChange(): void {
        this.onStateChange?.(this.getState());
    }
}
