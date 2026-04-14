import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "議事録くん - MTG・面接メモ",
  description: "録音、メモ、文字起こしログ、面接書類の基本情報・要約・質問候補を扱える議事録ツール。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} font-sans antialiased`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
