/**
 * PDF解析モジュール
 * pdfjs-dist を使ってクライアントサイドで PDF からテキストを抽出する
 */

/**
 * PDFファイルからテキストを抽出する
 * @param file - アップロードされたPDFファイル
 * @param maxPages - 最大読み取りページ数（デフォルト: 10）
 * @returns 抽出されたテキスト
 */
/**
 * ファイルをBase64文字列に変換する
 */
export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === "string") {
                // "data:application/pdf;base64,..." の部分を除去して純粋なBase64にする
                const base64 = reader.result.split(",")[1];
                resolve(base64);
            } else {
                reject(new Error("Base64変換に失敗しました"));
            }
        };
        reader.onerror = (error) => reject(error);
    });
}

/**
 * PDFファイルからテキストを抽出する
 * @param file - アップロードされたPDFファイル
 * @param maxPages - 最大読み取りページ数（デフォルト: 10）
 * @returns 抽出されたテキスト（抽出失敗時は null を返す）
 */
export async function extractTextFromPdf(
    file: File,
    maxPages: number = 10
): Promise<string | null> {
    // pdfjs-dist を動的にインポート（SSR対応）
    const pdfjsLib = await import("pdfjs-dist");

    // Worker の設定 — CDN を使用してバージョン不整合を防ぐ
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    try {
        const arrayBuffer = await file.arrayBuffer();

        // cMapUrl, cMapPacked を指定して日本語フォント対応を強化
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        const pagesToRead = Math.min(pdf.numPages, maxPages);

        console.log(`PDF読み込み成功: ${pdf.numPages}ページ（${pagesToRead}ページ読み取り）`);

        let fullText = "";

        for (let i = 1; i <= pagesToRead; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // テキストアイテムを結合（改行を許容）
            const pageText = textContent.items
                .map((item) => {
                    if ("str" in item) {
                        return item.hasEOL ? item.str + "\n" : item.str;
                    }
                    return "";
                })
                .join(" ");

            fullText += pageText + "\n\n"; // ページ区切り
        }

        const result = fullText.trim();
        console.log(`テキスト抽出完了: ${result.length}文字`);

        if (result.length === 0) {
            console.warn("テキストが抽出できませんでした（画像のみのPDFの可能性があります）");
            return null;
        }

        return result;
    } catch (error) {
        console.error("PDF解析エラー:", error);
        // エラー時も null を返して呼び出し元でハンドリングさせる（画像として扱うなど）
        return null;
    }
}
