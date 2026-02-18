# 議事録君 Webアプリ (Gijiroku-kun)

リアルタイム議事録作成・AI評価支援Webアプリケーションです。
Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui を使用して構築されています。

## 🚀 主な機能

### 1. 2つの動作モード
- **面接モード (`Interview Mode`)**:
  - 候補者の評価に特化。
  - 評価シート（スコア・コメント入力）機能。
  - 履歴書/ES分析による深掘り質問提案。
- **MTGモード (`Meeting Mode`)**:
  - 一般的な会議議事録向け。
  - シンプルなメモとトピック分析機能。

### 2. AIアシスト
- **音声認識**: ブラウザ標準のWeb Speech APIに加え、Groq APIなどの高速モデルもサポート予定。
- **リアルタイム分析**: 会話内容から重要なトピックや質問をAIが自動抽出。
- **評価支援**:
  - 全評価項目の一括AI採点・コメント生成。
  - 項目ごとの個別AIアシスト機能（✨ボタン）。

### 3. UI/UXの改善
- **カード型評価シート**: 視認性の高いカードデザインを採用。各項目に直感的なスコア入力とメモ欄を配置。
- **直感的な操作**:
  - ヘッダーにマニュアル、設定、エクスポート機能を集約。
  - マウスオーバーで機能説明が表示されるツールチップ対応。
- **データ管理**:
  - ローカルストレージへの自動保存（ブラウザを閉じてもデータが残ります）。
  - ワンクリックでWord形式(.docx)やテキスト形式(.txt)にエクスポート可能。
  - 不要なメモや評価項目は個別に削除可能。

## 🛠️ 技術スタック
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **AI**: Google Gemini API, Groq API

## 🏁 セットアップ手順

### 必要要件
- Node.js 18以上
- npm / yarn / pnpm / bun

### 開発環境の起動

1. リポジトリをクローンまたはダウンロードします。
2. 依存パッケージをインストールします。

```bash
npm install
# or
yarn install
```

3. 開発サーバーを起動します。

```bash
npm run dev
```

4. ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスします。

### APIキーの設定
右上の「設定（歯車アイコン）」から以下のAPIキーを設定してください。
- **Gemini API Key**: 必須（会話分析、評価生成に使用）
- **Groq API Key**: 任意（より高速な音声認識・応答が必要な場合）

## 📦 デプロイ
Vercel などのホスティングサービスへのデプロイを推奨します。GitHubリポジトリと連携するだけで自動的にデプロイされます。

## 📄 ライセンス
[MIT License](LICENSE)
