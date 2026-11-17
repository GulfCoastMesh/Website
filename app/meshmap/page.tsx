import Link from "next/link";
import { Globe2, Radio } from "lucide-react";
import { LiveMap } from "@/components/live-map";

export const metadata = {
  title: "Live mesh maps",
  description:
    "Live packet analyzer and Meshview — real-time views of Meshcore and Meshtastic activity across the entire Gulf Coast.",
};

const mqttRows: Array<[string, string]> = [
  ["MQTT Enabled", "True"],
  ["Encryption Enabled", "True"],
  ["JSON Enabled", "False"],
  ["Map Report Enabled", "Optional"],
  ["Root Topic", "msh/US/LA"],
  ["Server Address", "mqtt.gulfcoastmesh.org"],
  ["Username", "uplink"],
  ["Password", "uplink"],
  ["TLS Enabled", "False"],
];

export default function MeshmapPage() {
  return (
    <div className="container pb-24">
      <header className="mx-auto max-w-3xl text-center">
        <span className="eyebrow mx-auto">
          <Globe2 className="h-3.5 w-3.5" aria-hidden />
          Live maps
        </span>
        <h1 className="mt-5 font-display text-display-xl font-semibold tracking-tight text-balance text-ink-900 dark:text-white">
          See the mesh lighting up the coast.
        </h1>
        <p className="mt-5 text-pretty text-lg text-ink-600 dark:text-ink-300">
          Two complementary views — the live Meshcore analyzer and the Meshtastic footprint — embedded right here.
          Pan, zoom, and click nodes just like on the standalone sites.
        </p>
      </header>

      {/* Primary MeshCore Analyzer */}
      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-gulf-700 dark:text-gulf-300">
              Primary network
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl dark:text-white">
              MeshCore — Live analyzer
            </h2>
          </div>
          <p className="hidden max-w-sm text-sm text-ink-600 sm:block dark:text-ink-300">
            Live packets as they arrive — channels, traces, observers, perf. The real-time view of what the mesh is
            doing right now.
          </p>
        </div>
        <LiveMap
          src="https://analyzer.gulfcoastmesh.org/#/live"
          title="Gulf Coast Mesh — Analyzer (live)"
          label="Gulf Coast Analyzer"
          sub="MeshCore · packets · channels · perf"
          aspect="aspect-[4/3] sm:aspect-[16/10] lg:aspect-[2/1]"
        />
      </section>

      {/* Secondary Meshtastic Meshview */}
      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-sand-700 dark:text-sand-300">
              Meshtastic footprint
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl dark:text-white">
              Meshtastic — Meshview
            </h2>
          </div>
          <p className="hidden max-w-sm text-sm text-ink-600 sm:block dark:text-ink-300">
            Explore neighborhood Meshtastic activity — strong Louisiana coverage with nodes appearing wherever
            neighbors are building.
          </p>
        </div>
        <LiveMap
          src="https://meshview.gulfcoastmesh.org/chat"
          title="Gulf Coast Mesh — Meshview (live)"
          label="Gulf Coast Meshview"
          sub="Meshtastic · live conversations & nodes"
          aspect="aspect-[4/3] sm:aspect-[16/10] lg:aspect-[2/1]"
        />
      </section>

      {/* MQTT instructions */}
      <section className="surface relative mt-16 overflow-hidden p-8 sm:p-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <span className="eyebrow">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              Add your node
            </span>
            <h2 className="mt-4 font-display text-display-lg font-semibold tracking-tight text-ink-900 dark:text-white">
              Put your Meshtastic device on the map via MQTT
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            Not near another reporting node? Publish through our Gulf Coast broker and you’ll show up on the live map.
            Always confirm details against the latest docs.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <ol className="space-y-4">
            <Step n="01" title="Open the Meshtastic app or web client" />
            <Step n="02" title="Module Configuration → MQTT" detail="Apply the settings to the right." />
            <Step n="03" title="Radio Configuration → Channels → 0 / Primary">
              MQTT Uplink: <code className="kbd ml-1">Enabled</code>
            </Step>
          </ol>

          <div className="surface-strong overflow-hidden rounded-2xl p-1">
            <div className="rounded-xl border border-ink-200/60 bg-white/80 p-2 dark:border-white/10 dark:bg-ink-900/70">
              <div className="flex items-center justify-between px-3 pb-2 pt-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
                  MQTT module settings
                </p>
                <span className="font-mono text-[10px] text-ink-400">copy carefully</span>
              </div>
              <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {mqttRows.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5"
                    style={{ borderColor: "rgb(var(--line) / 0.6)" }}
                  >
                    <dt className="text-xs text-ink-600 dark:text-ink-300">{k}</dt>
                    <dd>
                      <code className="kbd">{v}</code>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-ink-600 dark:text-ink-300">
          Questions? Hop into{" "}
          <a
            href="https://discord.gulfcoastmesh.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gulf-700 underline-offset-4 hover:underline dark:text-gulf-300"
          >
            Discord
          </a>{" "}
          or browse{" "}
          <a
            href="https://docs.gulfcoastmesh.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gulf-700 underline-offset-4 hover:underline dark:text-gulf-300"
          >
            the docs
          </a>
          .
        </p>
      </section>

      <p className="mt-12 text-center text-sm text-ink-500 dark:text-ink-400">
        <Link href="/" className="font-medium text-gulf-700 hover:underline dark:text-gulf-300">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

function Step({
  n,
  title,
  detail,
  children,
}: {
  n: string;
  title: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <li
      className="flex gap-4 rounded-2xl border bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
      style={{ borderColor: "rgb(var(--line) / 0.6)" }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gulf-500/15 font-mono text-xs font-bold text-gulf-700 dark:text-gulf-300">
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-display text-sm font-semibold text-ink-900 dark:text-white">{title}</p>
        {detail ? <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{detail}</p> : null}
        {children ? <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{children}</p> : null}
      </div>
    </li>
  );
}
