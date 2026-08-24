import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnalyticsScript } from "@/components/analytics-script";

// preload: false skips the <link rel="preload"> hint for each font and loads
// it lazily via @font-face when the CSS that references it is parsed. We do
// this for all three families because dev-mode compilation is slow enough
// that preloads often expire before the browser claims them, producing
// "preloaded with link preload was not used within a few seconds" warnings.
// `display: "swap"` keeps text visible the whole time using the fallback
// stack; the swap to the web font happens whenever it lands.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gulfcoastmesh.org"),
  title: {
    default: "Gulf Coast Mesh — Resilient communications for the entire Gulf Coast",
    template: "%s · Gulf Coast Mesh",
  },
  description:
    "A volunteer mesh-network community serving the US Gulf Coast from South Texas to the Florida Panhandle. Open hardware, decentralized messaging, live maps, and friendly mentorship.",
  openGraph: {
    title: "Gulf Coast Mesh",
    description:
      "A volunteer mesh-network community serving the US Gulf Coast — open hardware, decentralized messaging, live maps.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f9fd" },
    { media: "(prefers-color-scheme: dark)", color: "#03080f" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Reading the request headers opts the layout into dynamic rendering, which
  // is required for the per-request CSP nonce from proxy.ts to flow into the
  // <Script> tag below and into Next's own internal inline scripts. Without
  // this, the static HTML would ship with no nonce attributes and the strict
  // CSP would block React hydration entirely.
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  // Apex only — skip Clicky on beta/preview so tracker blockers don't
  // spam the console with a failed <script> load.
  const host = (requestHeaders.get("host") ?? "").split(":")[0].toLowerCase();
  const enableAnalytics = host === "gulfcoastmesh.org" || host === "www.gulfcoastmesh.org";

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/*
          Tell the Dark Reader browser extension to leave this site alone:
          we already implement a designed dark theme (see <ThemeToggle /> +
          tailwind.config.ts gulf/ink/sand palettes), and Dark Reader's
          inversion fights it AND injects DOM attributes pre-hydration that
          trigger React hydration mismatches.
          https://github.com/darkreader/darkreader#how-to-disable-dark-reader-on-some-pages
        */}
        <meta name="darkreader-lock" />
        <Script src="/theme-init.js" strategy="beforeInteractive" nonce={nonce} />
      </head>
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} bg-canvas relative min-h-screen font-sans text-ink-900 antialiased dark:text-ink-50`}
      >
        <div className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-60 dark:opacity-30" aria-hidden />
        <div className="pointer-events-none fixed inset-0 z-0 bg-noise" aria-hidden />
        <div className="relative z-10 flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1 pt-28 sm:pt-32">
            {children}
          </main>
          <SiteFooter />
        </div>
        <AnalyticsScript nonce={nonce} enabled={enableAnalytics} />
      </body>
    </html>
  );
}
