"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
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
  /** Drop the card chrome (border, padding, header) and render only the
   *  frame. Used when the caller already supplies a panel header, so the
   *  page doesn't stack two headers on one map. */
  bare?: boolean;
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
  bare = false,
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

  const frame = (
    <div
      className={"relative w-full overflow-hidden " + (bare ? "" : "rounded-lg border ") + aspect}
      style={{
        borderColor: bare ? undefined : "rgb(var(--line))",
        background: "rgb(var(--bg-sunken))",
      }}
    >
      {/* Skeleton / loading overlay */}
      <div
        aria-hidden
        className={
          "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500 " +
          (loaded ? "opacity-0" : "opacity-100")
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-500 dark:text-ink-400">
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
            "absolute inset-0 h-full w-full transition-opacity duration-500 " +
            (loaded ? "opacity-100" : "opacity-0")
          }
        />
      ) : errored ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="font-display text-sm font-semibold text-ink-900 dark:text-white">
            Couldn’t load the live map
          </p>
          <a href={resolvedSrc} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Open {label}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      ) : null}
    </div>
  );

  if (bare) return <div className={className}>{frame}</div>;

  return (
    <div className={"surface overflow-hidden " + className}>
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3"
        style={{ borderColor: "rgb(var(--line))" }}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
            <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gulf-500 opacity-40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gulf-600 dark:bg-gulf-400" />
            </span>
            {label}
          </p>
          {sub ? <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{sub}</p> : null}
        </div>
        {showOpenLink ? (
          <a
            href={resolvedSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-gulf-700 dark:text-gulf-300"
            aria-label={`Open ${label} in a new tab`}
          >
            Open
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>
        ) : null}
      </div>

      <div className="p-3 sm:p-4">{frame}</div>
    </div>
  );
}
