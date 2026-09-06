import Link from "next/link";
import {
  ArrowRight,
  Radio,
  Router,
  ShieldCheck,
  Smartphone,
  Sun,
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

const pillars = [
  {
    icon: Radio,
    title: "No Cell Towers Needed",
    description:
      "Radios communicate directly device-to-device on public, license-free radio frequencies. No internet connection, cellular contract, or subscription required.",
  },
  {
    icon: Zap,
    title: "Community Relays",
    description:
      "Every node helps relay messages across the network. Packets hop from pocket radios to rooftops to span entire neighborhoods and coastal towns.",
  },
  {
    icon: Sun,
    title: "Built for Storm Resilience",
    description:
      "Designed specifically for hurricane season and severe weather. Radios sip tiny amounts of power and keep running on small solar panels or portable USB power banks.",
  },
];

const hardwareTiers = [
  {
    title: "Pocket Radio",
    description:
      "A handheld radio that connects to your smartphone via Bluetooth. Text off-grid and check in with family when cellular service is down.",
    href: "/setup",
    cta: "Setup a radio",
    icon: Smartphone,
  },
  {
    title: "Rooftop Repeater",
    description:
      "A weather-resistant solar node installed on a roof, mast, or chimney to extend coverage and bridge your neighborhood to the wider net.",
    href: "/docs/meshcore-repeater-setup",
    cta: "Repeater build guide",
    icon: Router,
  },
  {
    title: "Base Station",
    description:
      "A permanent station or server for your home or workshop, providing continuous monitoring and regional emergency bulletin broadcasts.",
    href: "/docs/devicerecs",
    cta: "Device recommendations",
    icon: ShieldCheck,
  },
];

export default async function HomePage() {
  const mesh = await getMeshStats();

  const stats = mesh.ok
    ? [
        { value: fmt(mesh.totalMapped), label: "Mapped Nodes" },
        { value: fmt(mesh.repeaters), label: "Active Repeaters" },
        { value: fmt(mesh.activeLast24h), label: "Active Today" },
        { value: fmt(mesh.historyEdges), label: "Observed Links" },
      ]
    : [
        { value: "5", label: "Gulf States" },
        { value: "1,600+", label: "Miles of Coastline" },
        { value: "32", label: "Max Mesh Hops" },
        { value: "100%", label: "Open Source" },
      ];

  return (
    <div className="space-y-24 pb-24 sm:space-y-32">
      {/* HERO SECTION ---------------------------------------------------- */}
      <section className="container">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <h1 className="font-display text-display-xl font-semibold tracking-tight text-balance text-ink-900 dark:text-white">
              Off-grid communications for the Gulf Coast.
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-600 dark:text-ink-300">
              Gulf Coast Mesh is a free, decentralized wireless network built and run by volunteers.
              Send messages and stay connected across Texas, Louisiana, Mississippi, Alabama, and Florida — with
              no cellular towers, no internet, and no monthly fees.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/setup" className="btn-primary">
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/meshmap" className="btn-ghost">
                View Live Map
              </Link>
              <a
                href="https://discord.gulfcoastmesh.org"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Join Discord
              </a>
              <a
                href="https://www.facebook.com/groups/gulfcoastmesh"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Facebook Group
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <LiveMap
              src="https://explorer.gulfcoastmesh.org/embed-light"
              srcDark="https://explorer.gulfcoastmesh.org/embed-dark"
              openUrl="https://explorer.gulfcoastmesh.org"
              title="Gulf Coast Mesh Explorer (live)"
              label="Live Network Activity"
              sub={
                mesh.ok
                  ? `${fmt(mesh.totalMapped)} nodes · ${fmt(mesh.activeLast24h)} active today`
                  : "Live nodes and packets"
              }
              aspect="aspect-[4/3] sm:aspect-[16/11]"
            />
            <p className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-[11px] text-ink-500 dark:text-ink-400">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gulf-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gulf-500" />
                </span>
                Background lines show live mesh traffic
              </span>
              <span className="inline-flex items-center gap-2.5 text-[10px] text-ink-400 dark:text-ink-500">
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#0d9488] dark:bg-[#00f5d4]" />Ads</span>
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#2563eb] dark:bg-[#38bdf8]" />Messages</span>
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#7c3aed] dark:bg-[#c084fc]" />Routing</span>
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#d97706] dark:bg-[#fbbf24]" />Control</span>
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* STATS BAR ------------------------------------------------------- */}
      <section className="container">
        <dl className="surface grid grid-cols-2 divide-y divide-ink-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-ink-800">
          {stats.map((s) => (
            <div key={s.label} className="p-6 text-center sm:text-left">
              <dd className="tabular font-display text-3xl font-semibold text-ink-900 sm:text-4xl dark:text-white">
                {s.value}
              </dd>
              <dt className="mt-1 text-sm font-medium text-ink-600 dark:text-ink-300">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* HOW IT WORKS ---------------------------------------------------- */}
      <section className="container">
        <div className="max-w-xl">
          <h2 className="font-display text-display-lg font-semibold text-ink-900 dark:text-white">
            How it works
          </h2>
          <p className="mt-3 text-pretty text-ink-600 dark:text-ink-300">
            A reliable, neighborhood-powered radio network that continues operating when traditional infrastructure fails.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="surface p-7">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gulf-500/10 text-gulf-700 dark:text-gulf-300">
                <p.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-ink-900 dark:text-white">
                {p.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HARDWARE TIERS -------------------------------------------------- */}
      <section
        className="border-y py-20"
        style={{ borderColor: "rgb(var(--line))", background: "rgb(var(--bg-sunken))" }}
      >
        <div className="container">
          <div className="max-w-xl">
            <h2 className="font-display text-display-lg font-semibold text-ink-900 dark:text-white">
              Get started at your own pace
            </h2>
            <p className="mt-3 text-pretty text-ink-600 dark:text-ink-300">
              Choose the setup that fits your needs — from a personal handheld carry to a rooftop solar repeater.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {hardwareTiers.map((tier) => (
              <div key={tier.title} className="surface flex flex-col p-7">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gulf-500/10 text-gulf-700 dark:text-gulf-300">
                  <tier.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink-900 dark:text-white">
                  {tier.title}
                </h3>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {tier.description}
                </p>
                <div className="mt-6 pt-5 border-t" style={{ borderColor: "rgb(var(--line))" }}>
                  <Link
                    href={tier.href}
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-gulf-700 dark:text-gulf-300"
                  >
                    {tier.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY SPOTLIGHT --------------------------------------------- */}
      <section className="container">
        <div className="surface p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl dark:text-white">
            Weekly Monday Voice Net · 8:00 PM CST
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-ink-600 dark:text-ink-300">
            Curious about mesh radio or need help with your first device? Join our weekly Discord voice call.
            Volunteers and beginners gather every Monday to test links, answer questions, and welcome new operators.
          </p>
          <div className="mt-8 flex flex-wrap justify-center items-center gap-3">
            <a
              href="https://discord.gulfcoastmesh.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Join the Discord Net
            </a>
            <a
              href="https://www.facebook.com/groups/gulfcoastmesh"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Facebook Group
            </a>
            <Link href="/meetings" className="btn-ghost">
              Meeting Schedule
            </Link>
          </div>
        </div>
      </section>

      {/* REGIONAL COVERAGE ----------------------------------------------- */}
      <section className="container">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16 items-start">
          <div>
            <h2 className="font-display text-display-lg font-semibold text-ink-900 dark:text-white">
              Growing across the Gulf Coast
            </h2>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              The network is actively expanding from South Texas to the Florida Panhandle.
              If you have a rooftop or tall site and want to help cover your town, connect with us on Discord.
            </p>
            <div className="mt-6">
              <Link href="/meshmap" className="btn-ghost inline-flex items-center gap-1.5">
                Explore Regional Map &rarr;
              </Link>
            </div>
          </div>

          <ul className="surface divide-y divide-ink-200 overflow-hidden dark:divide-ink-800">
            {regions.map((r) => {
              const count = mesh.byState[r.code] ?? 0;
              const live = count > 0 || r.forceLive === true;
              return (
                <li
                  key={r.code}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <span className="font-mono text-xs font-bold text-ink-400 dark:text-ink-500 w-6">
                    {r.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">{r.name}</p>
                    <p className="truncate text-xs text-ink-500 dark:text-ink-400">{r.cities}</p>
                  </div>
                  <span className="tabular font-mono text-xs font-medium text-ink-600 dark:text-ink-300">
                    {live ? (count > 0 ? `${fmt(count)} nodes` : "Active") : "Expanding"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* CLOSING CALL-TO-ACTION ------------------------------------------ */}
      <section
        className="border-t py-20 text-center"
        style={{ borderColor: "rgb(var(--line))", background: "rgb(var(--bg-sunken))" }}
      >
        <div className="container max-w-2xl">
          <h2 className="font-display text-display-lg font-semibold text-ink-900 dark:text-white">
            Ready to get connected?
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-ink-600 dark:text-ink-300">
            No radio license or technical background required. We’re here to help you get on the air.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/setup" className="btn-primary">
              Set Up Your Radio
            </Link>
            <a
              href="https://discord.gulfcoastmesh.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Join Discord
            </a>
            <a
              href="https://www.facebook.com/groups/gulfcoastmesh"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Facebook Group
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
