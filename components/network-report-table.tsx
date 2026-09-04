import { ArrowUpRight } from "lucide-react";

import {
  clockBadgeClass,
  formatClockSkew,
  formatSeenAt,
  type ReportRepeaterRow,
} from "@/lib/mesh-monitor";

type Props = {
  rows: ReportRepeaterRow[];
  showClock?: boolean;
  emptyMessage: string;
};

export function NetworkReportTable({ rows, showClock = false, emptyMessage }: Props) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-ink-600 dark:text-ink-300">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="table-wrap -mx-1 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
            <th className="px-3 py-3">Name</th>
            <th className="px-3 py-3">Prefix</th>
            <th className="px-3 py-3">Last seen</th>
            <th className="px-3 py-3">Location</th>
            {showClock ? (
              <>
                <th className="px-3 py-3">Clock</th>
                <th className="px-3 py-3">Skew</th>
              </>
            ) : (
              <th className="px-3 py-3">Owner</th>
            )}
            <th className="px-3 py-3">Region</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.prefix}-${r.public_key}`}
              className="border-b border-ink-200/50 transition hover:bg-ink-50/50 dark:border-white/5 dark:hover:bg-white/[0.03]"
            >
              <td className="px-3 py-3 font-medium text-ink-900 dark:text-white">{r.name}</td>
              <td className="px-3 py-3">
                <code className="rounded-md bg-gulf-500/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-gulf-800 dark:text-gulf-200">
                  {r.prefix}
                </code>
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-ink-600 dark:text-ink-300">
                {formatSeenAt(r.last_seen)}
              </td>
              <td className="px-3 py-3">
                {r.location.map_url ? (
                  <a
                    href={r.location.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-gulf-700 hover:underline dark:text-gulf-300"
                  >
                    {r.location.text}
                    <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
                  </a>
                ) : (
                  <span className="text-ink-600 dark:text-ink-300">{r.location.text}</span>
                )}
              </td>
              {showClock ? (
                <>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${clockBadgeClass(r.clock_sync)}`}
                    >
                      {r.clock_sync_label || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-600 dark:text-ink-300">
                    {formatClockSkew(r.clock_skew_seconds)}
                  </td>
                </>
              ) : (
                <td className="px-3 py-3 text-ink-600 dark:text-ink-300">{r.owner ?? "—"}</td>
              )}
              <td className="px-3 py-3 font-mono text-xs text-ink-500 dark:text-ink-400">
                {r.region || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
