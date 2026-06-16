"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "reserve", label: "Reserve" },
  { id: "lookup", label: "My prefixes" },
  { id: "duplicates", label: "Duplicates" },
  { id: "reports", label: "Network reports" },
] as const;

const DEFAULT_SECTION = "reserve";

export function MeshMonitorSectionNav() {
  const [active, setActive] = useState(DEFAULT_SECTION);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (SECTIONS.some((s) => s.id === hash)) {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    }

    const sections = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Mesh monitor sections"
      className="sticky top-[5.5rem] z-40 -mx-4 mb-10 border-b bg-[rgb(var(--bg)/0.92)] px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 dark:border-white/10"
      style={{ borderColor: "rgb(var(--line) / 0.7)" }}
    >
      <ul className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={() => setActive(s.id)}
              className={
                "inline-flex rounded-full px-4 py-2 text-sm font-semibold transition " +
                (active === s.id
                  ? "bg-gradient-to-r from-gulf-400 via-gulf-500 to-gulf-600 text-ink-950 shadow-glow"
                  : "text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-white/5")
              }
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
