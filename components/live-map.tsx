"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Compass, Loader2 } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useHasMounted } from "@/lib/use-has-mounted";

type LiveMapProps = {
  /** The URL to embed (must allow framing). Used as the light-mode src
   *  when `srcDark` is also provided. */
  src: string;
  /** Optional dark-mode src. When the active theme is `dark` and this is
   *  set, the iframe swaps to it. The skeleton overlay re-shows during
   *  the swap so theme changes feel intentional, not janky. */
  srcDark?: string;
  /** Accessibility title for the iframe. */
  title: string;
  /** Short label shown in the card header. */
  label: string;
  /** Optional subtitle shown next to the label. */
  sub?: string;
  /** Tailwind aspect-ratio classes for the frame, e.g. "aspect-[4/3] lg:aspect-[16/11]". */
  aspect?: string;
  /** Whether to render a "Open ↗" link to the source URL. Defaults to true. */
  showOpenLink?: boolean;
  /** Extra classes on the outer wrapper. */
  className?: string;
};

export function LiveMap({
  src,
  srcDark,
  title,
  label,
  sub,
  aspect = "aspect-[4/3] lg:aspect-[16/11]",
  showOpenLink = true,
  className = "",
}: LiveMapProps) {
  const { theme } = useTheme();
  const mounted = useHasMounted();
  // Wait until after hydration so we don't SSR embed-light then swap to
  // embed-dark (that tears down Leaflet mid-tile-load → _map is null).
  const resolvedSrc = theme === "dark" && srcDark ? srcDark : src;

  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Reset loading + error state when the resolved URL changes (theme swap).
  // This is the official React 19 reset-on-prop-change pattern — setting
  // state during render bails out of the current render and re-runs.
  // It avoids the react-hooks/set-state-in-effect rule entirely.
  const [trackedSrc, setTrackedSrc] = useState(resolvedSrc);
  if (trackedSrc !== resolvedSrc) {
    setTrackedSrc(resolvedSrc);
    setLoaded(false);
    setErrored(false);
  }

  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className={"surface relative overflow-hidden p-3 sm:p-4 " + className}>
      {/* Header */}
      <div className="relative flex items-center justify-between gap-3 px-1 pb-3 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gulf-500/15 text-gulf-700 dark:text-gulf-300">
            <Compass className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-700 sm:tracking-[0.18em] dark:text-ink-100">
              {label}
            </p>
            {sub ? (
              <p className="text-[11px] leading-snug text-ink-500 dark:text-ink-400">{sub}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-gulf-500/30 bg-gulf-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 dark:text-gulf-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gulf-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gulf-500" />
            </span>
            LIVE
          </span>
          {showOpenLink ? (
            <a
              href={resolvedSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-ink-700 transition hover:border-gulf-400/50 hover:text-ink-900 dark:border-white/10 dark:text-ink-100 dark:hover:text-white"
              style={{ borderColor: "rgb(var(--line) / 0.7)" }}
              aria-label={`Open ${label} in a new tab`}
            >
              Open
              <ArrowUpRight className="h-3 w-3 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      {/* Frame */}
      <div className={"relative w-full overflow-hidden rounded-xl border bg-ink-950/40 " + aspect}
        style={{ borderColor: "rgb(var(--line) / 0.5)" }}
      >
        {/* Skeleton / loading overlay */}
        <div
          aria-hidden
          className={
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500 " +
            (loaded ? "opacity-0" : "opacity-100")
          }
        >
          <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_30%_20%,rgba(45,209,189,0.18),transparent_55%),radial-gradient(700px_360px_at_85%_80%,rgba(249,162,40,0.12),transparent_55%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gulf-400/60 to-transparent" />
          <div className="relative flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-gulf-400" />
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300">
              Connecting to the mesh…
            </p>
          </div>
        </div>

        {!errored && mounted ? (
          <iframe
            key={resolvedSrc}
            ref={iframeRef}
            src={resolvedSrc}
            title={title}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            allow="geolocation; fullscreen"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={
              "absolute inset-0 h-full w-full transition-opacity duration-700 " +
              (loaded ? "opacity-100" : "opacity-0")
            }
          />
        ) : errored ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="font-display text-sm font-semibold text-ink-100">Couldn’t load the live map</p>
            <a
              href={resolvedSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Open {label}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
