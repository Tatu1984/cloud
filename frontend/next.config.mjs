/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker deployment
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
      {
        // Disable caching for HTML pages to ensure fresh content
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  // Proxy MDC API requests to avoid CORS issues
  async rewrites() {
    return [
      {
        source: '/mdc-api/:path*',
        destination: 'https://www.microdatacluster.com/:path*',
      },
    ]
  },
  // Optimize for production
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true,
};

export default nextConfig;
