import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow @sc-site/* workspace packages to be transpiled from source.
  transpilePackages: ["@sc-site/ui", "@sc-site/api"],
  experimental: {
    // Default. Listed for clarity for future agents.
    typedRoutes: false,
  },
};

export default nextConfig;
