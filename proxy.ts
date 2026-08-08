import { NextResponse, type NextRequest } from "next/server";

// Per-request CSP nonces (production) and a relaxed CSP (development).
//
// Production:
//   Every HTML response gets a fresh random nonce that Next.js threads onto
//   every inline <script> it emits. script-src is nonce + 'strict-dynamic'
//   (no 'unsafe-eval'). Host allowlists are omitted — browsers ignore them
//   under 'strict-dynamic' and Firefox warns if they are present.
//
// Development:
//   React's dev build uses eval() for callstack reconstruction, Turbopack's
//   HMR client connects over WebSocket, and the React DevTools / Next dev
//   overlay write inline styles and inline scripts that don't carry nonces.
//   We relax script-src to allow 'unsafe-inline' + 'unsafe-eval' and add
//   ws:/wss: to connect-src. We also DROP the nonce entirely in dev so we
//   don't trip React's hydration mismatch warning (browsers blank the
//   `nonce` attribute after the CSP engine reads it, so the hydrating
//   client sees nonce="" while the SSR HTML had nonce="abc..."; React
//   complains. With no nonce, no mismatch).
//
// The dev CSP is still useful: it keeps frame-ancestors, object-src, the
// img/connect/frame allowlists, etc. so we still catch regressions in
// origin allowlisting before they ship.

const isDev = process.env.NODE_ENV !== "production";

function buildCsp(nonce: string): string {
  // Production: nonce + strict-dynamic only. Host allowlists ('self',
  // https://static.getclicky.com, …) are ignored by browsers once
  // 'strict-dynamic' is present, and Firefox logs noisy warnings for them.
  // Clicky still loads because AnalyticsScript carries the nonce; any
  // scripts it pulls in are then trusted via the strict-dynamic chain.
  // 'unsafe-inline' + https: are ignored by modern browsers when a nonce
  // is present — they exist only as a fallback for older ones.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.getclicky.com https://in.getclicky.com"
    : `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:`;

  const connectSrc = [
    "connect-src 'self'",
    "https://in.getclicky.com",
    "https://lists.gulfcoastmesh.org",
    "https://explorer.gulfcoastmesh.org",
    "https://meeting.gulfcoastmesh.org",
    "https://raw.githubusercontent.com",
    // Turbopack / webpack HMR websocket in dev.
    ...(isDev ? ["ws://localhost:*", "ws://127.0.0.1:*", "wss://localhost:*"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self' https://lists.gulfcoastmesh.org",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    [
      "img-src 'self' data: blob:",
      "https://raw.githubusercontent.com",
      "https://tile.openstreetmap.org",
      "https://heltec.org",
      "https://static.getclicky.com",
      "https://in.getclicky.com",
    ].join(" "),
    connectSrc,
    "frame-src 'self' https://analyzer.gulfcoastmesh.org https://meshview.gulfcoastmesh.org https://explorer.gulfcoastmesh.org",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  // In dev we still generate a nonce so the layout's headers() read works,
  // but we don't put it in the CSP -- so React doesn't try to hydrate it.
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  if (!isDev) {
    requestHeaders.set("x-nonce", nonce);
    // Next reads CSP from the request header to know which nonce to inject
    // into its inline scripts.
    requestHeaders.set("Content-Security-Policy", csp);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Run on every path except static asset prefixes that are safe to cache
    // and never contain inline scripts.
    {
      source: "/((?!_next/static|_next/image|firmware|files|favicon.ico|theme-init.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
