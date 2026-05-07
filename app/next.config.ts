import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/linktree',
        destination: '/linktree.html',
      },
    ]
  },
};

export default nextConfig;
