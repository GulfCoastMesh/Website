import { AlertTriangle, Clock, MapPinOff } from "lucide-react";

import { NetworkReportTable } from "@/components/network-report-table";
import { fmtCount, type NetworkReport } from "@/lib/mesh-monitor";

type Props = {
  ok: boolean;
  report: NetworkReport;
};

export function MeshMonitorReportsSection({ ok, report }: Props) {
  const { summary, no_location, clock_sync, config } = report;

  const stats = [
    { value: fmtCount(summary.total_nodes), label: "Total nodes", warn: false },
    { value: fmtCount(summary.repeaters), label: "Repeaters", warn: false },
    { value: fmtCount(summary.companions), label: "Companions", warn: false },
    {
      value: fmtCount(summary.needs_attention),
      label: "Needs attention",
      warn: summary.needs_attention > 0,
    },
    { value: fmtCount(summary.recently_active), label: "Recently active", warn: false },
  ];

  const generatedAt =
    report.timestamp &&
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(report.timestamp));

  return (
    <div>
      <p className="max-w-2xl text-sm text-ink-600 dark:text-ink-300">
        Repeaters that need a fix — missing GPS, clock drift, and other issues. Data covers nodes
        active in the last{" "}
        <span className="font-semibold text-ink-800 dark:text-ink-100">
          {config.active_days} days
        </span>
        .
      </p>

      {!ok ? (
        <p className="mt-4 rounded-xl border border-coral-500/30 bg-coral-500/10 px-4 py-3 text-sm text-coral-900 dark:text-coral-100">
          Could not load network reports. Try refreshing the page.
        </p>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className={
              "surface flex flex-col items-center px-4 py-5 text-center " +
              (s.warn ? "ring-1 ring-coral-500/40" : "")
            }
          >
            <span
              className={
                "font-display text-3xl font-semibold tracking-tight " +
                (s.warn ? "text-coral-700 dark:text-coral-300" : "text-ink-900 dark:text-white")
              }
            >
              {s.value}
            </span>
            <span className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-8">
        <div className="surface p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-gulf-700 dark:text-gulf-300">
                <MapPinOff className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
                No location set
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink-900 dark:text-white">
                Repeaters missing GPS
              </h3>
            </div>
            {no_location.count > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-400/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-sand-800 dark:text-sand-200">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                {no_location.count} repeater{no_location.count === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <div className="mt-6">
            <NetworkReportTable
              rows={no_location.repeaters}
              emptyMessage="No repeaters are missing location right now."
            />
          </div>
        </div>

        <div className="surface p-6 sm:p-8">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-gulf-700 dark:text-gulf-300">
            <Clock className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
            Clock synchronization
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold text-ink-900 dark:text-white">
            Clock drift &amp; out-of-sync
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-ink-600 dark:text-ink-300">
            Compared to when the{" "}
            <a
              href="https://analyzer.gulfcoastmesh.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gulf-700 underline-offset-4 hover:underline dark:text-gulf-300"
            >
              Gulf Coast Mesh Analyzer
            </a>{" "}
            received each advert.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: clock_sync.ok, label: "Clock OK" },
              { value: clock_sync.minor, label: "Minor drift" },
              { value: clock_sync.out_of_sync, label: "Out of sync" },
              { value: clock_sync.unknown, label: "Unknown" },
            ].map((b) => (
              <div
                key={b.label}
                className="rounded-xl border px-4 py-3 text-center"
                style={{ borderColor: "rgb(var(--line))" }}
              >
                <span className="font-display text-xl font-semibold text-ink-900 dark:text-white">
                  {fmtCount(b.value)}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500 dark:text-ink-400">
                  {b.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <NetworkReportTable
              rows={clock_sync.repeaters}
              showClock
              emptyMessage="No repeaters with minor drift or out-of-sync clocks in the active window."
            />
          </div>
        </div>
      </div>

      {generatedAt ? (
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
          Report generated {generatedAt}
          {clock_sync.source ? ` · clock data via ${clock_sync.source}` : null}
        </p>
      ) : null}
    </div>
  );
}
