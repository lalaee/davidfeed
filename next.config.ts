import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      // The iOS app's association with dafod.app (webcredentials), which lets
      // it take Google's sign-in return at /auth/google. Apple fetches the
      // file and expects JSON; served without an extension it would otherwise
      // go out as application/octet-stream.
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
  async redirects() {
    return [
      // The Library became You, the account centre, at /you. Saved sets
      // still play at /library/[id], so only the index moves.
      { source: "/library", destination: "/you", permanent: false },
    ];
  },
};

export default nextConfig;
