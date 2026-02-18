import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  // GitHub Pagesで画像を表示するために必要
  images: {
    unoptimized: true,
  },

  // ★重要★: GitHubのリポジトリ名が "my-app" の場合、以下のように設定してください
  // basePath: "/my-app",
  // assetPrefix: "/my-app",
};

export default nextConfig;
