/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gboroly/ui', '@gboroly/types', '@gboroly/validation'],
  experimental: {
    optimizePackageImports: ['@gboroly/ui'],
  },
};

export default nextConfig;
