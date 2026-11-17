import type { NextConfig } from "next";

// CSP itself lives in proxy.ts so it can issue per-request nonces for
// Next.js's inline RSC bootstrap scripts. Everything else here is a
// static header that's safe to apply uniformly to every route, including
// /_next/static and other static assets the proxy skips.

const PERMISSIONS_POLICY = [
  'geolocation=(self "https://analyzer.gulfcoastmesh.org" "https://meshview.gulfcoastmesh.org")',
  "serial=(self)",
  "usb=(self)",
  "bluetooth=(self)",
  "camera=()",
  "microphone=()",
  "payment=()",
  "midi=()",
  "accelerometer=()",
  "gyroscope=()",
  "magnetometer=()",
  "interest-cohort=()",
].join(", ");

const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "heltec.org" },
    ],
  },
  async redirects() {
    return [
      // The docs live on the MkDocs site. Old /docs links (including the
      // pages this site used to mirror) go straight to the matching page.
      { source: "/docs", destination: "https://docs.gulfcoastmesh.org/", permanent: true },
      { source: "/docs/:slug+", destination: "https://docs.gulfcoastmesh.org/:slug+/", permanent: true },
      { source: "/links", destination: "https://docs.gulfcoastmesh.org/", permanent: true },
      { source: "/reports", destination: "/mesh-monitor#reports", permanent: false },
      { source: "/duplicates", destination: "/mesh-monitor#duplicates", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
