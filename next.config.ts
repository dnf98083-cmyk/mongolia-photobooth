import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 영상 업로드를 위해 body 크기 제한 해제
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
};

export default nextConfig;
