/**
 * 書類アップロードコンポーネント
 * 履歴書/ESのPDFをドラッグ＆ドロップまたはクリックでアップロード
 * テキスト抽出結果をセクションごとに構造化して表示
 */
"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { FileText, Upload, Loader2, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { extractTextFromPdf } from "@/lib/pdf-parser";
import { Badge } from "@/components/ui/badge";

interface DocumentUploadProps {
    /** ドキュメントタイプ */
    type: "resume" | "es";
    /** ラベル */
    label: string;
    /** テキスト抽出完了時のコールバック */
    onTextExtracted: (text: string, base64?: string) => void;
    /** 分析HTMLの表示内容 */
    analysisHTML?: string;
}

/** 構造化されたセクション */
interface Section {
    title: string;
    content: string;
}

export default function DocumentUpload({
    type,
    label,
    onTextExtracted,
    analysisHTML,
}: DocumentUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [rawText, setRawText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /** PDFテキストを簡易構造化パーサー */
    const sections = useMemo(() => {
        if (!rawText) return [];

        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        const parsedSections: Section[] = [];
        let currentTitle = "基本情報";
        let currentContent = "";

        for (const line of lines) {
            // 見出し判定: 25文字以下かつ末尾が句読点でない
            // ※ より高度な判定ロジックが必要ならここを調整
            if (line.length < 25 && !line.match(/[、。,.]$/) && !line.match(/^[-・]/)) {
                if (currentContent) {
                    parsedSections.push({ title: currentTitle, content: currentContent });
                    currentContent = "";
                }
                currentTitle = line;
            } else {
                currentContent += line + "\n";
            }
        }
        if (currentContent || (currentTitle && currentTitle !== "基本情報")) {
            parsedSections.push({ title: currentTitle, content: currentContent });
        }
        return parsedSections;
    }, [rawText]);

    /** PDFファイルを処理する */
    const processFile = useCallback(
        async (file: File) => {
            if (file.type !== "application/pdf") {
                alert("PDFファイルを選択してください");
                return;
            }

            setIsProcessing(true);
            setFileName(file.name);
            setError(null);
            setRawText(null);

            try {
                // 動的インポートが必要なため、一度インポートしてから使う
                const { extractTextFromPdf, fileToBase64 } = await import("@/lib/pdf-parser");

                const text = await extractTextFromPdf(file);

                if (text && text.length > 0) {
                    setRawText(text);
                    onTextExtracted(text);
                } else {
                    // テキスト抽出失敗 -> 画像PDFとして扱う
                    console.warn("テキスト抽出失敗、画像モードで処理します");
                    const base64 = await fileToBase64(file);
                    setRawText("（画像PDFとして読み込みました。AIが直接内容を解析します）");
                    onTextExtracted("", base64);
                }
            } catch (err) {
                console.error("PDF解析エラー:", err);
                setError(
                    err instanceof Error ? err.message : "PDFの解析に失敗しました"
                );
            } finally {
                setIsProcessing(false);
            }
        },
        [onTextExtracted]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    const iconColor =
        type === "resume" ? "text-red-500" : "text-blue-500";
    const bgColor =
        type === "resume"
            ? "bg-red-50 dark:bg-red-950"
            : "bg-blue-50 dark:bg-blue-950";

    return (
        <div className="bg-card rounded-xl border shadow-sm p-3 flex flex-col space-y-2">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs text-card-foreground flex items-center gap-1">
                    <FileText className={`h-3.5 w-3.5 ${iconColor}`} />
                    {label}
                </h3>
                {fileName && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        {fileName}
                    </span>
                )}
            </div>

            {/* ドロップゾーン */}
            <div
                className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all flex flex-col justify-center items-center ${isDragging
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                    : "border-muted hover:bg-muted/50"
                    }`}
                onClick={() => inputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileInput}
                />
                {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                ) : (
                    <Upload className="h-4 w-4 text-muted-foreground/50" />
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                    {isProcessing ? "解析中..." : "PDFをアップロード"}
                </p>
            </div>

            {/* エラー表示 */}
            {error && (
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200">
                    ⚠️ {error}
                </div>
            )}

            {/* 構造化データ表示（見やすいフォーマット） */}
            {sections.length > 0 && !analysisHTML && (
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] h-5 bg-background">抽出プレビュー</Badge>
                        <span className="text-[10px] text-muted-foreground">{rawText?.length}文字</span>
                    </div>
                    {sections.map((section, idx) => (
                        <div key={idx} className="bg-muted/30 border rounded-md overflow-hidden">
                            <div className="bg-muted/50 px-2 py-1.5 border-b flex items-center gap-1">
                                <span className="text-[10px] font-bold text-foreground truncate max-w-[200px]" title={section.title}>
                                    {section.title}
                                </span>
                            </div>
                            <div className="p-2 text-[10px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {section.content}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* AI分析結果表示（ある場合） */}
            {analysisHTML && (
                <div
                    className={`mt-2 ${bgColor} p-3 rounded-lg border text-sm max-h-60 overflow-y-auto animate-in fade-in duration-300`}
                    dangerouslySetInnerHTML={{ __html: analysisHTML }}
                />
            )}
        </div>
    );
}
