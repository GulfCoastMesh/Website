import Link from "next/link";
import {
  ArrowRight,
  CircuitBoard,
  Radio,
  Router,
  Smartphone,
  Wind,
  Wrench,
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

const work = [
  {
    icon: Wind,
    title: "Communications that survive the storm",
    body:
      "When the cell network drops and the internet goes with it, the mesh keeps moving on solar, battery, or a USB pack, backed by volunteer repeaters on tall sites across the coast.",
  },
  {
    icon: Radio,
    title: "A public, live view of the network",
    body:
      "Anyone can watch Meshcore and Meshtastic activity in real time — who heard whom, which repeaters are carrying traffic, and where the next install would matter most.",
  },
  {
    icon: Wrench,
    title: "Open hardware, open docs, open help",
    body:
      "Every guide, tool, and firmware recommendation we publish is free and open source. Bring a question to the weekly net and someone will walk you through it.",
  },
];

// One next step per stage. The old build offered up to three competing links
// per card, which made the fastest path through the page hard to find.
const steps = [
  {
    n: "01",
    icon: CircuitBoard,
    title: "Pick your hardware",
    body: "New to LoRa? Start with our recommended devices so your first radio just works.",
    href: "/docs/devicerecs",
    cta: "Recommended devices",
  },
  {
    n: "02",
    icon: Smartphone,
    title: "Set up a daily carry",
    body:
      "Get a MeshCore companion in your bag, paired with your phone, ready to message neighbors on the network.",
    href: "/setup",
    cta: "Open the setup wizard",
  },
  {
    n: "03",
    icon: Router,
    title: "Stand up a repeater",
    body:
      "Have a place with sky? Run a repeater and extend the network. We will help you plan, build, and tune it.",
    href: "/docs/meshcore-repeater-setup",
    cta: "Repeater setup guide",
  },
];

export default async function HomePage() {
  const mesh = await getMeshStats();

  const stats = mesh.ok
    ? [
        { value: fmt(mesh.totalMapped), label: "Mapped nodes", caption: `${fmt(mesh.totalSeen)} ever seen` },
        { value: fmt(mesh.repeaters), label: "Repeaters", caption: `${fmt(mesh.rooms)} room servers` },
        { value: fmt(mesh.activeLast24h), label: "Active in 24h", caption: `${fmt(mesh.onlineNow)} online now` },
        { value: fmt(mesh.historyEdges), label: "Links observed", caption: "Rolling window" },
      ]
    : [
        { value: "5", label: "Gulf states", caption: "TX · LA · MS · AL · FL" },
        { value: "1,600 mi", label: "Of coastline", caption: "Brownsville → Apalachicola" },
        { value: "32", label: "Max mesh hops", caption: "Via Meshcore pathing" },
        { value: "100%", label: "Open source", caption: "Hardware, firmware, docs" },
      ];

  return (
    <>
      {/* HERO ------------------------------------------------------------
          Copy on the left, the live map on the right, as on the original
          site. The stats it produces sit in a band directly underneath. */}
      <section className="container pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gulf-500 opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gulf-600 dark:bg-gulf-400" />
              </span>
              {mesh.ok ? `${fmt(mesh.totalMapped)} nodes live` : "Live on the bayou"}
              <span aria-hidden>·</span>
              Expanding the Gulf
            </p>

            <h1 className="mt-5 font-display text-display-xl font-semibold text-balance text-ink-900 dark:text-white">
              Comms that hold
              <br />
              when the <span className="gradient-text">coast does not</span>.
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-600 dark:text-ink-300">
              Gulf Coast Mesh is a volunteer-built, non-profit communications fabric anchored in Louisiana, growing
              across the US Gulf Coast. Open hardware. Decentralized routing. Real neighbors on the other end.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="https://discord.gulfcoastmesh.org"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Join the Discord
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="https://www.facebook.com/groups/gulfcoastmesh"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Join the Facebook
              </a>
              <Link
                href="/meshmap"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-gulf-700 dark:text-gulf-300"
              >
                See the live map
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>

            <p className="mt-6 text-sm text-ink-500 dark:text-ink-400">
              <span className="font-semibold text-ink-800 dark:text-ink-100">Weekly Monday voice net</span> on Discord.
              Everyone welcome, including people who have never touched a radio.{" "}
              <Link href="/meetings" className="font-medium text-gulf-700 underline underline-offset-2 dark:text-gulf-300">
                See the schedule
              </Link>
              .
            </p>
          </div>

          <div className="lg:col-span-7">
            <LiveMap
              src="https://explorer.gulfcoastmesh.org/embed-light"
              srcDark="https://explorer.gulfcoastmesh.org/embed-dark"
              title="Gulf Coast Mesh Explorer (live)"
              label="Gulf Coast Explorer"
              sub={
                mesh.ok
                  ? `MeshCore · ${fmt(mesh.totalMapped)} nodes · ${fmt(mesh.activeLast24h)} active in 24h`
                  : "MeshCore · live packets & nodes"
              }
              aspect="aspect-[4/3] lg:aspect-[5/4] xl:aspect-[6/5]"
            />
          </div>
        </div>
      </section>

      {/* NETWORK STATS ----------------------------------------------------- */}
      <section id="network" className="container">
        <dl className="surface grid grid-cols-2 overflow-hidden sm:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={
                "px-5 py-6 sm:px-6 " +
                // Odd cells start the second mobile column; cells 2-3 start
                // the second mobile row. At sm every cell is in one row.
                (i % 2 === 1 ? "border-l " : "sm:border-l ") +
                (i >= 2 ? "border-t sm:border-t-0 " : "") +
                (i === 0 ? "sm:border-l-0 " : "")
              }
              style={{ borderColor: "rgb(var(--line))" }}
            >
              <dd className="tabular font-display text-3xl font-semibold text-ink-900 sm:text-4xl dark:text-white">
                {s.value}
              </dd>
              <dt className="mt-1 text-sm font-medium text-ink-700 dark:text-ink-200">{s.label}</dt>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{s.caption}</p>
            </div>
          ))}
        </dl>

        <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
          Live snapshot, refreshed every 5 minutes.{" "}
          <Link href="/meshmap" className="font-medium text-gulf-700 underline underline-offset-2 dark:text-gulf-300">
            Open the full maps
          </Link>{" "}
          for the packet analyzer and the Meshtastic view.
        </p>
      </section>

      {/* WHAT WE DO ------------------------------------------------------- */}
      <section className="container py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">What we do</p>
          <h2 className="mt-3 font-display text-display-lg font-semibold text-ink-900 dark:text-white">
            Rooftops, towers, and front porches, all on the same mesh.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {work.map((w) => (
            <div key={w.title}>
              <w.icon className="h-5 w-5 text-gulf-700 dark:text-gulf-300" aria-hidden />
              <h3 className="mt-4 font-display text-lg font-semibold text-ink-900 dark:text-white">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GET STARTED ------------------------------------------------------ */}
      <section
        className="border-y py-20"
        style={{ borderColor: "rgb(var(--line))", background: "rgb(var(--bg-sunken))" }}
      >
        <div className="container">
          <div className="max-w-2xl">
            <p className="eyebrow">Get started</p>
            <h2 className="mt-3 font-display text-display-lg font-semibold text-ink-900 dark:text-white">
              From a box-fresh radio to the coast-wide net in three steps.
            </h2>
          </div>

          <ol className="mt-10 grid gap-5 lg:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="tile flex h-full flex-col">
                <div className="flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-gulf-700 dark:text-gulf-300" aria-hidden />
                  <span className="font-mono text-xs font-semibold text-ink-400 dark:text-ink-500">{s.n}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{s.body}</p>
                <Link
                  href={s.href}
                  className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gulf-700 dark:text-gulf-300"
                >
                  {s.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* COVERAGE --------------------------------------------------------- */}
      <section className="container py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <div>
            <p className="eyebrow">Coverage</p>
            <h2 className="mt-3 font-display text-display-lg font-semibold text-ink-900 dark:text-white">
              Anchored in Louisiana, growing the whole Gulf.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              Today the live network is concentrated across Louisiana. The mission is bigger: neighbors helping
              neighbors from Corpus Christi to Panama City. If you are elsewhere on the Gulf, come build with us.
            </p>
          </div>

          <ul className="surface divide-y" style={{ borderColor: "rgb(var(--line))" }}>
            {regions.map((r) => {
              const count = mesh.byState[r.code] ?? 0;
              const live = count > 0 || r.forceLive === true;
              return (
                <li
                  key={r.code}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{ borderColor: "rgb(var(--line))" }}
                >
                  <span className="w-7 shrink-0 font-mono text-xs font-bold text-ink-500 dark:text-ink-400">
                    {r.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">{r.name}</p>
                    <p className="truncate text-xs text-ink-500 dark:text-ink-400">{r.cities}</p>
                  </div>
                  {live ? (
                    <span className="tabular shrink-0 font-mono text-xs font-semibold text-gulf-700 dark:text-gulf-300">
                      {count > 0 ? `${fmt(count)} live` : "Live"}
                    </span>
                  ) : (
                    <span className="shrink-0 font-mono text-xs text-ink-400 dark:text-ink-500">Planned</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* GET INVOLVED ----------------------------------------------------- */}
      <section
        className="relative overflow-hidden border-t py-20"
        style={{ borderColor: "rgb(var(--line))", background: "rgb(var(--bg-sunken))" }}
      >
        <div className="pointer-events-none absolute inset-0 grid-tech" aria-hidden />
        <div className="container relative max-w-3xl text-center">
          <h2 className="font-display text-display-lg font-semibold text-ink-900 dark:text-white">
            No radio required to get involved.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-ink-600 dark:text-ink-300">
            Come to the Monday net, ask questions, lend a rooftop, or help us write the docs. The network grows one
            neighbor at a time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="https://discord.gulfcoastmesh.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Join the Discord
            </a>
            <a
              href="https://www.facebook.com/groups/gulfcoastmesh"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Join the Facebook group
            </a>
            <Link href="/emailsignup" className="btn-ghost">
              Get the newsletter
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
