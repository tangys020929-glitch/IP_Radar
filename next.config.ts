import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "cloudflare:workers": "./vercel/cloudflare-workers.ts",
    },
  },
};

export default nextConfig;
