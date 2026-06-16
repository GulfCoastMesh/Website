import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  BookOpen,
  CalendarCheck,
  CircuitBoard,
  Compass,
  Cpu,
  Map as MapIcon,
  Router,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wind,
  Zap,
} from "lucide-react";
import { LiveMap } from "@/components/live-map";
import { getMeshStats, fmt, type StateCode } from "@/lib/mesh-stats";

type Region = {
  code: StateCode;
  name: string;
  cities: string;
  forceLive?: boolean;
};

const regions: Region[] = [
  { code: "TX", name: "South Texas", cities: "Corpus Christi · Houston · Galveston" },
  { code: "LA", name: "Louisiana", cities: "Lake Charles · Lafayette · Baton Rouge · New Orleans" },
  { code: "MS", name: "Mississippi Coast", cities: "Gulfport · Biloxi · Pascagoula", forceLive: true },
  { code: "AL", name: "Alabama Shore", cities: "Mobile · Dauphin Island · Gulf Shores" },
  { code: "FL", name: "Northwest Florida", cities: "Pensacola · Destin · Panama City" },
];

const steps = [
  {
    n: "01",
    icon: CircuitBoard,
    title: "Pick your hardware",
    body: "New to LoRa? Start with our recommended devices and the antenna guide so your first radio just works.",
    links: [
      { label: "Recommended devices", href: "/docs/devicerecs", internal: true },
      { label: "Antenna guide", href: "/docs/antenna", internal: true },
    ],
  },
  {
    n: "02",
    icon: Smartphone,
    title: "Set up a daily-carry companion",
    body: "Get a MeshCore companion on your belt or in your bag — paired with your phone, ready to message neighbors.",
    links: [
      { label: "Setup wizard", href: "/setup", internal: true },
      { label: "Companion setup guide", href: "/docs/setting-up-meshcore-companion", internal: true },
      { label: "Frequency settings", href: "/docs/freq-settings", internal: true },
    ],
  },
  {
    n: "03",
    icon: Router,
    title: "Stand up a repeater",
    body: "Have a place with sky? Run a repeater and extend the network. We’ll help you plan, build, and tune it.",
    links: [
      { label: "Setup wizard", href: "/setup", internal: true },
      { label: "Repeater setup", href: "/docs/meshcore-repeater-setup", internal: true },
      { label: "Estimate coverage", href: "/docs/estimate-coverage-with-meshmapper", internal: true },
    ],
  },
];

export default async function HomePage() {
  const mesh = await getMeshStats();

  const stats = mesh.ok
    ? [
        {
          value: fmt(mesh.totalMapped),
          label: "mapped nodes",
          caption: `${fmt(mesh.totalSeen)} ever seen`,
        },
        {
          value: fmt(mesh.repeaters),
          label: "repeaters",
          caption: `${fmt(mesh.rooms)} room servers on the backbone`,
        },
        {
          value: fmt(mesh.activeLast24h),
          label: "active in 24h",
          caption: `${fmt(mesh.onlineNow)} online right now`,
        },
        {
          value: fmt(mesh.historyEdges),
          label: "links observed",
          caption: "across the rolling window",
        },
      ]
    : [
        { value: "5", label: "Gulf states", caption: "TX · LA · MS · AL · FL" },
        { value: "1,600 mi", label: "of coastline", caption: "Brownsville → Apalachicola" },
        { value: "32", label: "max mesh hops", caption: "via Meshcore pathing" },
        { value: "100%", label: "open source", caption: "Hardware + firmware + docs" },
      ];

  return (
    <>
      {/* HERO */}
      <section className="container relative overflow-hidden pb-24 pt-6 sm:pt-10 lg:pb-28">
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
          {/* LEFT — copy */}
          <div className="lg:col-span-5 lg:pt-6">
            <span className="eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gulf-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gulf-500" />
              </span>
              {mesh.ok ? `${fmt(mesh.totalMapped)} nodes live` : "Live on the bayou"}
              <span className="mx-1.5 text-ink-400">·</span>
              expanding the Gulf
            </span>

            <h1 className="mt-6 font-display text-display-xl font-semibold tracking-tight text-balance text-ink-900 dark:text-white">
              Comms that hold
              <br />
              when the <span className="gradient-text">coast does not</span>.
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-600 dark:text-ink-300">
              Gulf Coast Mesh is a volunteer-built communications fabric — anchored in Louisiana, growing across the
              US Gulf Coast. Open hardware. Decentralized routing. Real neighbors on the other end.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href="https://discord.gulfcoastmesh.org"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full sm:w-auto"
              >
                Join the Discord
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <Link href="/meshmap" className="btn-ghost w-full sm:w-auto">
                See the live map
                <MapIcon className="h-4 w-4 opacity-80" aria-hidden />
              </Link>
              <Link
                href="/docs"
                className="group ml-1 inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-950 dark:text-ink-200 dark:hover:text-white"
              >
                Read the docs
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>

            <p className="mt-5 inline-flex items-center gap-2 text-xs text-ink-600 dark:text-ink-300">
              <CalendarCheck className="h-3.5 w-3.5 text-gulf-600 dark:text-gulf-300" />
              <span>
                <span className="font-semibold text-ink-900 dark:text-white">Weekly Monday voice net</span> on Discord —
                everyone welcome.
              </span>
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-500 dark:text-ink-400">
                Stack
              </span>
              <Pill icon={Cpu}>Meshcore</Pill>
              <Pill icon={Boxes}>LoRa · 915 MHz</Pill>
              <Pill icon={ShieldCheck}>End-to-end</Pill>
            </div>
          </div>

          {/* RIGHT — live map (now wider + taller) */}
          <div className="lg:col-span-7">
            <div className="relative">
              <LiveMap
                src="https://explorer.gulfcoastmesh.org/embed-light"
                srcDark="https://explorer.gulfcoastmesh.org/embed-dark"
                title="Gulf Coast Mesh — Explorer (live)"
                label="Gulf Coast Explorer"
                sub={
                  mesh.ok
                    ? `MeshCore · ${fmt(mesh.totalMapped)} nodes · ${fmt(mesh.activeLast24h)} active 24h`
                    : "MeshCore · live packets & nodes"
                }
                aspect="aspect-[5/4] sm:aspect-[4/3] lg:aspect-[5/4] xl:aspect-[6/5]"
                className="lg:min-h-[560px]"
              />
              <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-gulf-400/20 blur-3xl" />
              <div className="pointer-events-none absolute -top-8 -left-6 h-24 w-24 rounded-full bg-sand-400/20 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="container">
        <div className="surface-strong relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-gulf-400/15 via-transparent to-transparent" aria-hidden />
          <div className="relative grid grid-cols-2 divide-x divide-ink-200/60 sm:grid-cols-4 dark:divide-white/10">
            {stats.map((s) => (
              <div key={s.label} className="px-5 py-7 sm:px-7 sm:py-8">
                <p className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
                  {s.value}
                </p>
                <p className="mt-1 text-sm font-medium text-ink-700 dark:text-ink-100">{s.label}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
                  {s.caption}
                </p>
              </div>
            ))}
          </div>
          {mesh.ok ? (
            <p className="border-t border-ink-200/60 px-5 py-2 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500 dark:border-white/10 dark:text-ink-400">
              live snapshot · auto-refreshes every 5 min ·{" "}
              <Link
                href="/meshmap"
                className="text-gulf-700 hover:underline dark:text-gulf-300"
              >
                open live maps
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      {/* NETWORK / FEATURES BENTO */}
      <section id="network" className="container py-20 sm:py-28">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              The network
            </span>
            <h2 className="mt-4 font-display text-display-lg font-semibold tracking-tight text-ink-900 dark:text-white">
              Rooftops, towers, and front porches — all on the same mesh.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            Mesh radios pass messages neighbor-to-neighbor over license-free LoRa. Backbone repeaters live on real
            towers and high rooftops, with three more tower sites coming online in the next three months.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-12 md:grid-rows-[auto_auto]">
          {/* Big feature: maps */}
          <div className="tile tile-accent md:col-span-7 md:row-span-2 md:p-9">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gulf-500/15 text-gulf-700 dark:text-gulf-300">
              <MapIcon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-5 font-display text-2xl font-semibold text-ink-900 dark:text-white">
              Live maps you can actually read
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              Watch Meshcore and Meshtastic activity ripple across the coast in real time. See who heard whom, which
              repeaters are hot, and where the next install would matter most.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/meshmap"
                className="surface group flex items-center justify-between rounded-2xl px-4 py-3 transition hover:-translate-y-0.5"
              >
                <span className="text-sm font-semibold text-ink-900 dark:text-white">Open Analyzer</span>
                <ArrowUpRight className="h-4 w-4 text-gulf-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-gulf-300" aria-hidden />
              </Link>
              <Link
                href="/meshmap"
                className="surface group flex items-center justify-between rounded-2xl px-4 py-3 transition hover:-translate-y-0.5"
              >
                <span className="text-sm font-semibold text-ink-900 dark:text-white">Open Meshview</span>
                <ArrowUpRight className="h-4 w-4 text-gulf-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-gulf-300" aria-hidden />
              </Link>
            </div>
          </div>

          {/* Resilience */}
          <div className="tile md:col-span-5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sand-400/15 text-sand-700 dark:text-sand-300">
              <Wind className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-5 font-display text-lg font-semibold text-ink-900 dark:text-white">
              Built for hurricane season
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              When the cell network drops and the internet goes with it, the mesh keeps moving — on solar, battery, or
              a USB pack — backed by our repeaters on tall sites.
            </p>
          </div>

          {/* Open */}
          <div className="tile md:col-span-5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink-700/10 text-ink-700 dark:text-ink-200">
              <Zap className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-5 font-display text-lg font-semibold text-ink-900 dark:text-white">
              Open and tinkerable
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              Open firmware, open docs, open neighbors. Hack the stack, file a PR, or just show up and ask questions.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-20 sm:py-28">
        <div className="max-w-2xl">
          <span className="eyebrow">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            How it works
          </span>
          <h2 className="mt-4 font-display text-display-lg font-semibold tracking-tight text-ink-900 dark:text-white">
            From box-fresh radio to the coast-wide net in three steps.
          </h2>
        </div>

        <ol className="mt-12 grid gap-4 lg:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="tile group flex h-full flex-col">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gulf-500/10 text-gulf-700 dark:text-gulf-300">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-mono text-xs font-semibold text-ink-400 dark:text-ink-500">{s.n}</span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-ink-900 dark:text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{s.body}</p>
              {s.links?.length ? (
                <ul className="mt-5 flex flex-wrap gap-2 border-t border-ink-200/60 pt-4 dark:border-white/10">
                  {s.links.map((l) => {
                    const linkClass =
                      "group/link inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-gulf-700 transition hover:border-gulf-400/60 hover:bg-gulf-500/5 dark:border-white/10 dark:text-gulf-300";
                    const linkStyle = { borderColor: "rgb(var(--line) / 0.7)" };
                    const arrow = (
                      <ArrowUpRight
                        className="h-3 w-3 transition group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                        aria-hidden
                      />
                    );
                    return (
                      <li key={l.href}>
                        {l.internal ? (
                          <Link href={l.href} className={linkClass} style={linkStyle}>
                            {l.label}
                            {arrow}
                          </Link>
                        ) : (
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkClass}
                            style={linkStyle}
                          >
                            {l.label}
                            {arrow}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {/* REGIONS */}
      <section className="container">
        <div className="surface relative overflow-hidden p-8 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <span className="eyebrow">
                <Compass className="h-3.5 w-3.5" aria-hidden />
                Regions
              </span>
              <h2 className="mt-4 font-display text-display-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                Anchored in Louisiana,
                <br />
                growing the whole Gulf.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                Today the live network is concentrated across Louisiana. The mission is bigger — neighbors helping
                neighbors from Corpus Christi to Panama City. If you’re elsewhere on the Gulf, come build with us.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {regions.map((r) => {
                const count = mesh.byState[r.code] ?? 0;
                const live = count > 0 || r.forceLive === true;
                return (
                  <li
                    key={r.code}
                    className={
                      "group relative flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition hover:-translate-y-0.5 " +
                      (live
                        ? "border-gulf-400/50 bg-gulf-500/5 dark:border-gulf-400/30 dark:bg-gulf-500/10"
                        : "hover:border-gulf-400/30 dark:border-white/10")
                    }
                    style={!live ? { borderColor: "rgb(var(--line) / 0.7)" } : undefined}
                  >
                    <span
                      className={
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold " +
                        (live
                          ? "bg-gulf-500/20 text-gulf-700 dark:text-gulf-200"
                          : "bg-ink-700/5 text-ink-500 dark:bg-white/5 dark:text-ink-400")
                      }
                    >
                      {r.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-semibold text-ink-900 dark:text-white">{r.name}</p>
                        {live ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gulf-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-gulf-700 dark:text-gulf-200">
                            <span className="h-1 w-1 rounded-full bg-gulf-500" />
                            {count > 0 ? `${fmt(count)} live` : "Live"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-sand-700 dark:border-white/10 dark:text-sand-300" style={{ borderColor: "rgb(var(--line) / 0.7)" }}>
                            <span className="h-1 w-1 rounded-full bg-sand-400" />
                            Coming soon™
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-ink-500 dark:text-ink-400">{r.cities}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function Pill({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-ink-700 dark:text-ink-100"
      style={{ borderColor: "rgb(var(--line) / 0.7)" }}
    >
      <Icon className="h-3.5 w-3.5 text-gulf-600 dark:text-gulf-300" />
      {children}
    </span>
  );
}
