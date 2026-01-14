import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)?',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
      // {
      //   source: '/:all*(js)',
      //   locale: false,
      //   headers: [
      //     {
      //       key: 'Cross-Origin-Embedder-Policy',
      //       value: 'require-corp',
      //     },
      //   ],
      // },
      // {
      //   source: '/(.*)?', // Matches all pages
      //   headers: [
      //     {
      //       key: 'X-Frame-Options',
      //       value: 'SAMEORIGIN',
      //     },
      //   ],
      // },
    ];
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'node:fs/promises': false,
        'node:fs': false,
        'node:path': false,
      };

      // 添加这个插件来处理 node: 协议的导入
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: any) => {
          resource.request = resource.request.replace(/^node:/, '');
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
