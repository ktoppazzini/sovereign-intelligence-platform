/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  // Turbopack is stable now
  turbopack: {},

  // Optional: transpile heavy libs to speed dev
  // transpilePackages: ['some-heavy-lib'],
};

export default nextConfig;

