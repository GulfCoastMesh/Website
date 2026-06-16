"use client";

import Link from "next/link";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";

// Bump the version suffix when the message changes so previously-dismissed
// users see the new notice. Keeping a structured key (`scope:topic:version`)
// makes that bookkeeping obvious.
const STORAGE_KEY = "gcm:network-update:sf7-may25-v2:dismissed";
const DOCS_HREF = "/docs/freq-settings";
const DISCORD_HREF = "https://discord.gulfcoastmesh.org";

const listeners = new Set<() => void>();

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}

// Render nothing on the server / first hydration pass so we never flash an
// already-dismissed modal back at the user before localStorage is readable.
function getServerSnapshot(): boolean {
  return false;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", storageHandler);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", storageHandler);
    }
  };
}

function dismissNow() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
  // localStorage's `storage` event only fires in OTHER tabs, so we manually
  // poke our in-tab listeners (same trick as lib/theme.ts).
  listeners.forEach((l) => l());
}

export function NetworkUpdateModal() {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dismiss = useCallback(() => dismissNow(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissNow();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="network-update-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        aria-label="Dismiss network update notice"
        onClick={dismiss}
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-ink-950/70 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border bg-white p-6 shadow-glow sm:p-7 dark:border-white/15 dark:bg-ink-800"
        style={{ borderColor: "rgb(var(--line) / 0.7)" }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-200 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <span className="inline-flex items-center gap-2 rounded-full border border-sand-400/60 bg-sand-400/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-sand-700 dark:border-sand-300/40 dark:bg-sand-300/10 dark:text-sand-200">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Network update — action required
        </span>

        <h2
          id="network-update-title"
          className="mt-5 font-display text-2xl font-semibold tracking-tight text-balance text-ink-900 sm:text-3xl dark:text-white"
        >
          Gulf Coast Mesh has upgraded to{" "}
          <span className="text-gulf-700 dark:text-gulf-200">SF7</span> on{" "}
          <span className="text-sand-700 dark:text-sand-200">May 25, 2026</span>.
        </h2>

        <p className="mt-4 text-[15px] leading-relaxed text-ink-700 dark:text-ink-100">
          All repeater operators must reset their MeshCore settings to the network{" "}
          <strong className="font-semibold text-ink-900 dark:text-white">defaults</strong>{" "}
          &mdash; including{" "}
          <strong className="font-semibold text-ink-900 dark:text-white">SF7</strong>{" "}
          &mdash; if they have not already.
        </p>

        <p className="mt-3 text-[15px] leading-relaxed text-ink-700 dark:text-ink-100">
          <AlertTriangle
            className="-mt-0.5 mr-1 inline h-4 w-4 text-coral-500"
            aria-hidden
          />
          Repeaters that have not been updated are at risk of losing{" "}
          <span className="font-semibold text-coral-500 dark:text-coral-400">
            connection to the mesh
          </span>
          . Check our{" "}
          <Link
            href={DOCS_HREF}
            onClick={dismiss}
            className="font-semibold text-gulf-700 underline-offset-2 hover:underline dark:text-gulf-200"
          >
            docs
          </Link>{" "}
          or join our{" "}
          <a
            href={DISCORD_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gulf-700 underline-offset-2 hover:underline dark:text-gulf-200"
          >
            Discord
          </a>{" "}
          for help.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href={DOCS_HREF} onClick={dismiss} className="btn-primary">
            View docs
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <a
            href={DISCORD_HREF}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="btn-ghost"
          >
            Join Discord
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="ml-auto rounded-full px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-200 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
