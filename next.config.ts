import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['playwright-chromium'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('playwright-chromium');
    }
    return config;
  },
};

export default nextConfig;
