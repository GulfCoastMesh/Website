import Image from "next/image";
import Link from "next/link";
import { Coffee, Mail } from "lucide-react";
import { partners } from "@/lib/partners";

const supporters = ["ma7", "n5msy", "talwah", "simon", "kyra", "terry", "mike", "rg3120", "Mike Baldwin"];

const explore: Array<{ label: string; href: string; external?: boolean }> = [
  { label: "Live maps", href: "/meshmap" },
  { label: "Setup wizard", href: "/setup" },
  { label: "Documentation", href: "/docs" },
  { label: "Mesh monitoring", href: "/mesh-monitor" },
  { label: "Meetings", href: "/meetings" },
  { label: "Newsletter", href: "/emailsignup" },
];

const community: Array<{ label: string; href: string; external?: boolean }> = [
  { label: "Discord", href: "https://discord.gulfcoastmesh.org", external: true },
  { label: "Facebook group", href: "https://www.facebook.com/groups/gulfcoastmesh", external: true },
  { label: "GitHub", href: "https://github.com/GulfCoastMesh", external: true },
  { label: "MkDocs site", href: "https://docs.gulfcoastmesh.org", external: true },
  { label: "Transparency", href: "/docs/transparency" },
  { label: "Privacy policy", href: "/privacy" },
];

const linkClass =
  "text-sm text-ink-600 transition-colors hover:text-ink-900 dark:text-ink-300 dark:hover:text-white";

function FooterLink({ label, href, external }: { label: string; href: string; external?: boolean }) {
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {label}
    </a>
  ) : (
    <Link href={href} className={linkClass}>
      {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t" style={{ borderColor: "rgb(var(--line))" }}>
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pr-6">
            <Link href="/" className="inline-flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" className="h-8 w-8" />
              <span className="font-display text-base font-semibold tracking-tight text-ink-900 dark:text-white">
                Gulf Coast Mesh
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              A volunteer, non-profit mesh-network community spanning the US Gulf Coast, from South Texas to the
              Florida Panhandle.
            </p>
            <a
              href="mailto:support@gulfcoastmesh.org"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gulf-700 dark:text-gulf-300"
            >
              <Mail className="h-4 w-4" aria-hidden />
              support@gulfcoastmesh.org
            </a>
          </div>

          <nav aria-label="Explore">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500 dark:text-ink-400">
              Explore
            </h2>
            <ul className="mt-4 space-y-2.5">
              {explore.map((l) => (
                <li key={l.label}>
                  <FooterLink {...l} />
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Community">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500 dark:text-ink-400">
              Community
            </h2>
            <ul className="mt-4 space-y-2.5">
              {community.map((l) => (
                <li key={l.label}>
                  <FooterLink {...l} />
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500 dark:text-ink-400">
              Support
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              The network runs on donated time, hardware, and rooftops.
            </p>
            <a
              href="https://ko-fi.com/gulfcoastmesh"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gulf-700 dark:text-gulf-300"
            >
              <Coffee className="h-4 w-4" aria-hidden />
              Buy us a coffee
            </a>

            <h3 className="mt-8 text-xs font-semibold uppercase tracking-[0.1em] text-ink-500 dark:text-ink-400">
              Partners
            </h3>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {partners.map((partner) => (
                // Partner artwork is supplied as-is (one is an opaque JPEG),
                // so it sits on a light chip in both themes rather than being
                // inverted — inverting flattened the JPEG to a white block.
                <a
                  key={partner.name}
                  href={partner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md bg-white px-3 py-2 ring-1 ring-ink-200 transition-opacity hover:opacity-80"
                >
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    width={partner.logoWidth}
                    height={partner.logoHeight}
                    className="h-6 w-auto"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="hairline mt-12" />

        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500 dark:text-ink-400">
            Supporters
          </h2>
          <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
            {supporters.join(" · ")}
          </p>
        </div>

        <p className="mt-8 text-xs text-ink-500 dark:text-ink-400">
          © {new Date().getFullYear()} Gulf Coast Mesh Community
        </p>
      </div>
    </footer>
  );
}
