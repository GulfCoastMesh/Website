import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Coffee, Heart, Mail } from "lucide-react";
import { partners } from "@/lib/partners";

const supporters = ["ma7", "n5msy", "talwah", "simon", "kyra", "terry", "mike", "rg3120", "Mike Baldwin"];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-ink-200/60 dark:border-white/10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gulf-400/60 to-transparent" />
      <div className="container py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-gulf-300 via-gulf-500 to-sand-400 text-ink-950 shadow-glow">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="6" cy="6" r="1.6" fill="currentColor" />
                  <circle cx="18" cy="6" r="1.6" fill="currentColor" />
                  <circle cx="12" cy="13" r="1.6" fill="currentColor" />
                  <circle cx="6" cy="20" r="1.6" fill="currentColor" />
                  <circle cx="18" cy="20" r="1.6" fill="currentColor" />
                  <path d="M6 6L12 13M18 6L12 13M12 13L6 20M12 13L18 20" />
                </svg>
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                Gulf Coast Mesh
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              A volunteer mesh-network community spanning the entire US Gulf Coast — from South Texas to the Florida
              Panhandle. Open hardware, open docs, real neighbors.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="mailto:contact@louisianamesh.org"
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-gulf-700 transition hover:bg-gulf-50 dark:border-white/10 dark:text-gulf-300 dark:hover:bg-white/5"
                style={{ borderColor: "rgb(var(--line) / 0.7)" }}
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                contact@louisianamesh.org
              </a>
              <a
                href="https://github.com/GulfCoastMesh/Website"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-50 dark:border-white/10 dark:text-ink-200 dark:hover:bg-white/5"
                style={{ borderColor: "rgb(var(--line) / 0.7)" }}
              >
                Source on GitHub
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </div>

          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500 dark:text-ink-400">
              Supporters
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <Heart className="h-4 w-4 text-coral-500" aria-hidden />
              Keeping the network alive.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {supporters.map((name) => (
                <span
                  key={name}
                  className="rounded-full border px-2.5 py-1 text-xs font-medium text-ink-700 dark:border-white/10 dark:text-ink-100"
                  style={{ borderColor: "rgb(var(--line) / 0.7)" }}
                >
                  {name}
                </span>
              ))}
            </div>
            <a
              href="https://ko-fi.com/gulfcoastmesh"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-5 inline-flex items-center gap-2 rounded-full border border-coral-500/30 bg-coral-500/5 px-3 py-1.5 text-xs font-medium text-coral-500 transition hover:border-coral-500/50 hover:bg-coral-500/10"
            >
              <Coffee className="h-3.5 w-3.5" aria-hidden />
              Buy us a coffee
              <ArrowUpRight className="h-3 w-3 opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" aria-hidden />
            </a>
            <p className="mt-2 text-[11px] text-ink-500 dark:text-ink-400">
              Tower fees and antennas — every coffee helps.
            </p>
          </div>

          <div className="lg:text-right">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500 dark:text-ink-400">
              Partners
            </p>
            <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
              Thanks to these businesses for helping us with the mesh.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 lg:justify-end">
              {partners.map((partner) => (
                <a
                  key={partner.name}
                  href={partner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="surface inline-flex items-center px-4 py-3 transition hover:-translate-y-0.5"
                >
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    width={partner.logoWidth}
                    height={partner.logoHeight}
                    className="h-8 w-auto dark:brightness-0 dark:invert"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="hairline mt-14" />
        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-center text-xs text-ink-500 dark:text-ink-400 sm:flex-row sm:text-left">
          <p className="font-mono">© {new Date().getFullYear()} Gulf Coast Mesh Community</p>
          <div className="flex flex-wrap items-center justify-center gap-5 font-medium text-ink-600 dark:text-ink-300">
            <Link href="/meshmap" className="hover:text-ink-900 dark:hover:text-white">
              Live maps
            </Link>
            <Link href="/emailsignup" className="hover:text-ink-900 dark:hover:text-white">
              Newsletter
            </Link>
            <Link href="/docs" className="hover:text-ink-900 dark:hover:text-white">
              Docs
            </Link>
            <a
              href="https://docs.gulfcoastmesh.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink-900 dark:hover:text-white"
            >
              MkDocs site
            </a>
            <Link href="/docs/transparency" className="hover:text-ink-900 dark:hover:text-white">
              Transparency
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
