import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
};

export default nextConfig;
