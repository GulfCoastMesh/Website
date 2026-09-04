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
    { media: "(prefers-color-scheme: light)", color: "#f4f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#061a28" },
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
        className={`${sans.variable} ${display.variable} ${mono.variable} bg-canvas min-h-screen font-sans antialiased`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-900 focus:shadow-lift dark:focus:bg-ink-800 dark:focus:text-white"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          {/* One texture band sits under the header for every page, rather
              than each page re-declaring its own. Both layers are radially
              masked, so the fixed height just bounds the fade. */}
          <main id="main" className="relative flex-1 pt-10 sm:pt-14">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] grid-tech" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] wash-brand" aria-hidden />
            <div className="relative">{children}</div>
          </main>
          <SiteFooter />
        </div>
        <AnalyticsScript nonce={nonce} enabled={enableAnalytics} />
      </body>
    </html>
  );
}
