import type { NextConfig } from 'next';

const apiDestination =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8787/v1/:path*'
    : 'https://goyo-api.seokjun.kim/v1/:path*';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        destination: apiDestination,
        source: '/api/v1/:path*',
      },
    ];
  },
  output: 'standalone',
  transpilePackages: ['@writer/editor'],
};

export default nextConfig;
