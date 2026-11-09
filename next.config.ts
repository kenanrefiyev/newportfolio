import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // the project sits inside a larger git folder; keep Turbopack's root here
  turbopack: { root: process.cwd() },
  async headers() {
    return [
      {
        source: '/projects/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
    ];
  },
};

export default nextConfig;
