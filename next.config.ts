import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // 配置允许的图片域名（使用新的 remotePatterns 方式）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qiniu-storage.weweknow.com',
      },
    ],
  },

  // 生产环境：带 hash 的 JS/CSS 可长期缓存。开发环境不要 immutable，否则 Turbopack 复用文件名时浏览器会吃到旧包。
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
