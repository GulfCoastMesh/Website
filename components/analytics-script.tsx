"use client";

import Script from "next/script";

// Clicky analytics, wrapped in a Client Component so we can attach an
// onError handler. The script is frequently blocked at the DNS layer
// (NextDNS, AdGuard, Pi-hole) or by browser tracker protection
// (Firefox ETP, uBlock Origin, Brave Shields) since clicky.com is on
// every major tracker blocklist. The onError swallows the load failure
// so blocked users don't see a red error in DevTools; analytics still
// works normally for everyone else.
//
// nonce is threaded down from the root layout so this script passes the
// strict CSP set in proxy.ts. enabled is decided server-side (apex host
// only) so beta/preview don't request a tracker that often fails loudly.
export function AnalyticsScript({
  nonce,
  enabled = true,
}: {
  nonce?: string;
  enabled?: boolean;
}) {
  // Skip Clicky in local/dev — no analytics value, and the script often
  // fails to load (tracker blockers), which clutters the console.
  if (!enabled || process.env.NODE_ENV !== "production") {
    return null;
  }

  return (
    <Script
      async
      src="https://static.getclicky.com/js"
      data-id="101506255"
      strategy="afterInteractive"
      nonce={nonce}
      onError={() => {
        /* silently ignore — almost always a tracker blocker */
      }}
    />
  );
}
