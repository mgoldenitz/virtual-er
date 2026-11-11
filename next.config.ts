import type { NextConfig } from "next";

// Security headers on every page and route (from Gemini's Phase 2 review):
// - frame-ancestors and X-Frame-Options: no other site may show this app inside a frame, so a
//   hostile page cannot trick a signed-in nurse into clicking "Call back" or "Remove" (clickjacking).
// - nosniff: browsers must not guess a file's type.
// - Referrer-Policy: other sites see only this site's address, never a full page address.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
