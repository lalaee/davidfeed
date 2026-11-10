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
      // The films' sound and share copies are reached from the page's film
      // catalog, and Google was crawling them as pages ("crawled, not
      // indexed"). They are media, not results. The films' pictures (.mp4 in
      // /assets/films) stay indexable: each is the video of its film page
      // (app/film), and a noindexed file can't be.
      {
        source: "/assets/:path(.*\\.(?:m4a|mp3)$)",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      {
        source: "/assets/share/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
  async redirects() {
    return [
      // The Library became You, the account centre, at /you, for good (308).
      // Saved sets still play at /library/[id], so only the index moves.
      { source: "/library", destination: "/you", permanent: true },
    ];
  },
};

export default nextConfig;
