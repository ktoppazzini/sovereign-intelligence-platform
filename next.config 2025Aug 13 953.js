// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yourdomain.com', // ⬅️ replace this with the real domain you're using for remote images
        pathname: '/**',
      },
    ],
  },
};
/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Keep dev lighter/faster
  experimental: {
    turbo: {
      // helpful default; Turbopack is already enabled via --turbo
    },
  },

  // Don’t generate heavy client source maps in production (defaults off in dev)
  productionBrowserSourceMaps: false,

  // If you transpile big UI libs, list them here to speed cold starts:
  // transpilePackages: ['some-heavy-lib'],
};

module.exports = nextConfig;
