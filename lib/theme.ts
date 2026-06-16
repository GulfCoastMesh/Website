"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "gcm-theme";
const listeners = new Set<() => void>();

function getServerSnapshot(): Theme {
  return "light";
}

function getSnapshot(): Theme {
  if (typeof document === "undefined") return "light";
  if (document.documentElement.classList.contains("light")) return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  let mql: MediaQueryList | null = null;
  let storageHandler: ((e: StorageEvent) => void) | null = null;
  if (typeof window !== "undefined") {
    mql = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => cb();
    mql.addEventListener?.("change", onChange);
    storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) cb();
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      listeners.delete(cb);
      mql?.removeEventListener?.("change", onChange);
      if (storageHandler) window.removeEventListener("storage", storageHandler);
    };
  }
  return () => listeners.delete(cb);
}

function applyTheme(next: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", next === "dark");
  root.classList.toggle("light", next === "light");
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setTheme = useCallback((next: Theme) => applyTheme(next), []);
  const toggle = useCallback(() => applyTheme(theme === "dark" ? "light" : "dark"), [theme]);
  return { theme, setTheme, toggle, mounted: typeof document !== "undefined" };
}
