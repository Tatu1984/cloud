/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignore ESLint during builds - lint separately in CI
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during builds - check separately in CI
    ignoreBuildErrors: true,
  },
  // Security headers are now handled by middleware.ts
  // These are additional headers for static assets
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ]
  },
  // Optimize for production
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true,
};

export default nextConfig;
