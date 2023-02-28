/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["math-helpers"],
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
