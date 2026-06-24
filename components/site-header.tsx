"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Github, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = { label: string; href: string; external?: boolean };

const nav: readonly NavItem[] = [
  { label: "Network", href: "/#network" },
  { label: "Maps", href: "/meshmap" },
  { label: "Meetings", href: "/meetings" },
  { label: "Setup", href: "/setup" },
  { label: "Mesh monitoring", href: "/mesh-monitor" },
  { label: "Newsletter", href: "/emailsignup" },
  { label: "Docs", href: "/docs" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5">
      <div
        className={
          "pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 backdrop-blur-2xl transition-all duration-300 sm:px-4 " +
          (scrolled
            ? "border-ink-200/70 bg-white/80 shadow-soft dark:border-white/10 dark:bg-ink-950/70"
            : "border-transparent bg-white/40 dark:bg-ink-950/30")
        }
      >
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 rounded-xl px-1.5 py-1 font-display text-[15px] font-semibold tracking-tight"
          aria-label="Gulf Coast Mesh — home"
        >
          <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-gulf-300 via-gulf-500 to-sand-400 text-ink-950 shadow-glow">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="6" cy="6" r="1.6" fill="currentColor" />
              <circle cx="18" cy="6" r="1.6" fill="currentColor" />
              <circle cx="12" cy="13" r="1.6" fill="currentColor" />
              <circle cx="6" cy="20" r="1.6" fill="currentColor" />
              <circle cx="18" cy="20" r="1.6" fill="currentColor" />
              <path d="M6 6L12 13M18 6L12 13M12 13L6 20M12 13L18 20" />
            </svg>
          </span>
          <span className="hidden text-ink-900 dark:text-white min-[420px]:inline">
            Gulf Coast <span className="font-normal text-ink-500 dark:text-ink-300/80">Mesh</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {nav.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-200 dark:hover:bg-white/5 dark:hover:text-white"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-200 dark:hover:bg-white/5 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/GulfCoastMesh"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border bg-white/70 text-ink-800 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-ink-50 dark:hover:bg-white/10 lg:inline-flex"
            style={{ borderColor: "rgb(var(--line) / 0.7)" }}
            aria-label="GitHub"
          >
            <Github className="h-[18px] w-[18px]" aria-hidden />
          </a>
          <ThemeToggle />
          <div className="hidden items-center gap-2 sm:flex">
            <a
              href="https://discord.gulfcoastmesh.org"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-gradient-to-r from-gulf-400 via-gulf-500 to-gulf-600 px-4 py-2 text-sm font-semibold text-ink-950 shadow-glow transition hover:brightness-110"
            >
              Join Discord
            </a>
            <a
              href="https://www.facebook.com/groups/gulfcoastmesh"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-gradient-to-r from-sand-300 via-sand-400 to-sand-500 px-4 py-2 text-sm font-semibold text-ink-950 shadow-glow-sand transition hover:brightness-110"
            >
              Join the Facebook
            </a>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white/70 text-ink-800 dark:border-white/10 dark:bg-white/5 dark:text-ink-50 lg:hidden"
            style={{ borderColor: "rgb(var(--line) / 0.7)" }}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="pointer-events-auto mx-auto mt-3 max-w-6xl rounded-2xl border bg-white/95 p-3 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-ink-950/95 lg:hidden"
             style={{ borderColor: "rgb(var(--line) / 0.7)" }}>
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            <Link
              href="/"
              className="rounded-xl px-3 py-3 text-base font-medium text-ink-800 hover:bg-ink-100 dark:text-ink-100 dark:hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              Home
            </Link>
            {nav.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl px-3 py-3 text-base font-medium text-ink-800 hover:bg-ink-100 dark:text-ink-100 dark:hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-xl px-3 py-3 text-base font-medium text-ink-800 hover:bg-ink-100 dark:text-ink-100 dark:hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ),
            )}
            <a
              href="https://discord.gulfcoastmesh.org"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 rounded-xl bg-gradient-to-r from-gulf-400 to-gulf-600 px-3 py-3 text-center text-base font-semibold text-ink-950"
              onClick={() => setOpen(false)}
            >
              Join Discord
            </a>
            <a
              href="https://www.facebook.com/groups/gulfcoastmesh"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-gradient-to-r from-sand-300 to-sand-500 px-3 py-3 text-center text-base font-semibold text-ink-950"
              onClick={() => setOpen(false)}
            >
              Join the Facebook
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
