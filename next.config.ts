import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      // The Library became You, the account centre, at /you. Saved sets
      // still play at /library/[id], so only the index moves.
      { source: "/library", destination: "/you", permanent: false },
    ];
  },
};

export default nextConfig;
