"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronDown, Home } from "lucide-react";
import type { DocPageMeta, DocSection } from "@/lib/docs-nav";

function isActive(pathname: string, slug: string): boolean {
  if (slug === "index") return pathname === "/docs" || pathname === "/docs/";
  return pathname === `/docs/${slug}`;
}

export function DocsSideNav({
  home,
  sections,
}: {
  home: DocPageMeta;
  sections: DocSection[];
}) {
  const pathname = usePathname() ?? "/docs";
  const [open, setOpen] = useState(false);
  const closeMobile = () => setOpen(false);

  return (
    <>
      {/* Mobile collapsible nav */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border bg-[rgb(var(--bg-elevated))] px-4 py-3 text-left text-sm font-semibold text-ink-800 shadow-soft transition hover:bg-[rgb(var(--bg-sunken))] dark:text-ink-100"
          style={{ borderColor: "rgb(var(--line))" }}
        >
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gulf-600 dark:text-gulf-300" aria-hidden />
            Browse the docs
          </span>
          <ChevronDown
            className={"h-4 w-4 transition " + (open ? "rotate-180" : "")}
            aria-hidden
          />
        </button>
        {open ? (
          <div className="mt-3 rounded-lg border bg-[rgb(var(--bg-elevated))] p-4 shadow-soft"
               style={{ borderColor: "rgb(var(--line))" }}>
            <NavList pathname={pathname} home={home} sections={sections} onNavigate={closeMobile} />
          </div>
        ) : null}
      </div>

      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-28">
          <div className="rounded-lg border bg-[rgb(var(--bg-elevated))] p-5 shadow-soft"
               style={{ borderColor: "rgb(var(--line))" }}>
            <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-gulf-700 dark:text-gulf-300">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              Documentation
            </p>
            <NavList pathname={pathname} home={home} sections={sections} />
          </div>
        </div>
      </aside>
    </>
  );
}

function NavList({
  pathname,
  home,
  sections,
  onNavigate,
}: {
  pathname: string;
  home: DocPageMeta;
  sections: DocSection[];
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Documentation">
      <ul className="space-y-1">
        <li>
          <NavLink
            href="/docs"
            label={home.title}
            icon={<Home className="h-3.5 w-3.5" aria-hidden />}
            active={isActive(pathname, "index")}
            onClick={onNavigate}
          />
        </li>
      </ul>

      {sections.map((section) => (
        <div key={section.title} className="mt-5">
          <p className="px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-500 dark:text-ink-400">
            {section.title}
          </p>
          <ul className="mt-2 space-y-1">
            {section.pages.map((page) => (
              <li key={page.slug}>
                <NavLink
                  href={`/docs/${page.slug}`}
                  label={page.title}
                  active={isActive(pathname, page.slug)}
                  onClick={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
  icon,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={
        "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition " +
        (active
          ? "bg-gulf-500/10 font-semibold text-gulf-700 ring-1 ring-gulf-500/30 dark:bg-gulf-400/10 dark:text-gulf-200 dark:ring-gulf-400/30"
          : "text-ink-700 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-200 dark:hover:text-white")
      }
    >
      {icon ? <span className="text-gulf-600 dark:text-gulf-300">{icon}</span> : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}
