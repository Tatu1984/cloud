/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Only ignore ESLint in development for faster builds
    // Production builds should fail on lint errors
    ignoreDuringBuilds: process.env.NODE_ENV !== 'production',
  },
  typescript: {
    // Never ignore TypeScript errors
    ignoreBuildErrors: false,
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
