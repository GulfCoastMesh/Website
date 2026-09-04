"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Github, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = { label: string; href: string; external?: boolean };

// Six destinations, ordered by how most visitors arrive: see the network,
// then build a node, then read up, then get involved.
const nav: readonly NavItem[] = [
  { label: "Maps", href: "/meshmap" },
  { label: "Setup", href: "/setup" },
  { label: "Docs", href: "/docs" },
  { label: "Monitoring", href: "/mesh-monitor" },
  { label: "Meetings", href: "/meetings" },
  { label: "Newsletter", href: "/emailsignup" },
];

const linkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:text-ink-900 dark:text-ink-300 dark:hover:text-white";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "sticky top-0 z-50 border-b bg-[rgb(var(--bg))] transition-shadow " +
        (scrolled ? "shadow-soft" : "")
      }
      style={{ borderColor: "rgb(var(--line))" }}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 font-display text-[15px] font-semibold tracking-tight text-ink-900 dark:text-white"
          aria-label="Gulf Coast Mesh — home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="hidden min-[420px]:inline">Gulf Coast Mesh</span>
        </Link>

        <nav className="hidden items-center lg:flex" aria-label="Primary">
          {nav.map((item) => (
            <Link key={item.label} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href="https://github.com/GulfCoastMesh"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-9 w-9 items-center justify-center rounded-md text-ink-500 transition-colors hover:text-ink-900 dark:text-ink-400 dark:hover:text-white lg:inline-flex"
            aria-label="GitHub"
          >
            <Github className="h-[18px] w-[18px]" aria-hidden />
          </a>
          <ThemeToggle />
          {/* One primary action in the bar. Facebook and the rest of the
              community links live in the hero and the footer. */}
          <a
            href="https://discord.gulfcoastmesh.org"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary hidden px-4 py-2 sm:inline-flex"
          >
            Join Discord
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-ink-700 dark:text-ink-100 lg:hidden"
            style={{ borderColor: "rgb(var(--line-strong))" }}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t lg:hidden" style={{ borderColor: "rgb(var(--line))" }}>
          <nav className="container flex flex-col py-2" aria-label="Mobile">
            <Link
              href="/"
              className="rounded-md px-1 py-3 text-base font-medium text-ink-700 dark:text-ink-100"
              onClick={() => setOpen(false)}
            >
              Home
            </Link>
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-md px-1 py-3 text-base font-medium text-ink-700 dark:text-ink-100"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://discord.gulfcoastmesh.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary my-3 sm:hidden"
              onClick={() => setOpen(false)}
            >
              Join Discord
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
