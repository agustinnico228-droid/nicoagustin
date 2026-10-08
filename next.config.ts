import type { NextConfig } from "next";

/*
 * Security headers for every page except the dashboard demos (they run in a sandboxed iframe with an opaque
 * origin and keep their own headers below). 'unsafe-inline' scripts are needed for Next's inline bootstrap and
 * the theme script on a statically rendered site (no per-request nonce); everything else is same-origin only.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Next 16 requires an allow-list of qualities.
    qualities: [75, 82],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/((?!demos/).*)",
        headers: securityHeaders,
      },
      {
        // Live dashboard demos: sample data, never indexed (each page also has <meta name="robots" content="noindex">).
        source: "/demos/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          // The demos run in a sandboxed iframe (an opaque origin), so their self-hosted fonts are cross-origin
          // requests. These are public static files.
          { key: "Access-Control-Allow-Origin", value: "*" },
          // Only this site may frame them (the case studies embed them); no fetch directives, so their self-hosted
          // fonts and images keep loading inside the sandboxed iframe.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'none'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
