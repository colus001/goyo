import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        destination: 'https://goyo-api.seokjun.kim/v1/:path*',
        source: '/api/v1/:path*',
      },
    ];
  },
  output: 'standalone',
};

export default nextConfig;
