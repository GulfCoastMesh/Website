"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";

type ReservationStatus = "reserved" | "deployed";

type Reservation = {
  prefix: string;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  email: string;
  username?: string;
  display_name?: string;
  user_id?: number;
  added_at: string;
  source?: string;
  status: ReservationStatus;
};

type LookupResponse = {
  timestamp?: string;
  email: string;
  count: number;
  reservations: Reservation[];
};

type FormStatus = { type: "success" | "error"; text: string } | null;

const inputWrap =
  "mt-2 flex items-center gap-2 rounded-2xl border bg-white px-3 py-1 focus-within:ring-2 focus-within:ring-gulf-400 dark:border-white/10 dark:bg-ink-900";
const inputClass =
  "w-full bg-transparent py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400 dark:text-white";
const labelClass = "block font-display text-sm font-semibold text-ink-900 dark:text-white";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const isReserved = status === "reserved";
  return (
    <span
      className={
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold " +
        (isReserved
          ? "bg-gulf-500/15 text-gulf-800 dark:text-gulf-200"
          : "bg-coral-500/15 text-coral-800 dark:text-coral-200")
      }
    >
      {isReserved ? "Reserved" : "Deployed"}
    </span>
  );
}

export function MeshMonitorLookupSection() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);
  const [results, setResults] = useState<LookupResponse | null>(null);

  async function handleLookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setStatus(null);
    setResults(null);

    const fd = new FormData(form);
    const email = String(fd.get("lookup_email") ?? "").trim();

    try {
      const res = await fetch("/api/mesh-monitor/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as LookupResponse & { error?: string };
      if (res.ok) {
        setResults(data);
        if (data.count === 0) {
          setStatus({
            type: "success",
            text: `No reservations found for ${data.email}.`,
          });
        }
      } else {
        setStatus({ type: "error", text: data.error ?? "Lookup failed." });
      }
    } catch {
      setStatus({ type: "error", text: "Connection error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="surface-strong relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-gulf-400/15 blur-3xl" />
      <h3 className="relative font-display text-lg font-semibold text-ink-900 dark:text-white">
        My prefixes
      </h3>
      <p className="relative mt-1 text-sm text-ink-600 dark:text-ink-300">
        Enter the email you used when reserving to see your active and deployed prefixes.
      </p>

      <form onSubmit={handleLookup} className="relative mt-6 space-y-4">
        <div>
          <label htmlFor="lookup_email" className={labelClass}>
            Email
          </label>
          <div className={inputWrap} style={{ borderColor: "rgb(var(--line) / 0.7)" }}>
            <input
              id="lookup_email"
              name="lookup_email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
        </div>

        {status ? (
          <div
            role="status"
            className={
              "rounded-2xl border p-4 text-sm font-medium " +
              (status.type === "success"
                ? "border-gulf-500/30 bg-gulf-500/10 text-gulf-800 dark:text-gulf-100"
                : "border-coral-500/30 bg-coral-500/10 text-coral-700 dark:text-coral-200")
            }
          >
            {status.text}
          </div>
        ) : null}

        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Looking up…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" aria-hidden />
              Find my prefixes
            </>
          )}
        </button>
      </form>

      {results && results.count > 0 ? (
        <div className="relative mt-8 space-y-3">
          <p className="text-sm font-medium text-ink-600 dark:text-ink-300">
            {results.count} {results.count === 1 ? "prefix" : "prefixes"} for{" "}
            <span className="text-ink-900 dark:text-white">{results.email}</span>
          </p>
          <ul className="space-y-3">
            {results.reservations.map((r) => (
              <li
                key={`${r.prefix}-${r.status}`}
                className="rounded-2xl border p-4 dark:border-white/10"
                style={{ borderColor: "rgb(var(--line) / 0.7)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-semibold tracking-widest text-ink-900 dark:text-white">
                      {r.prefix}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <span className="text-xs text-ink-500 dark:text-ink-400">
                    Reserved {formatDate(r.added_at)}
                  </span>
                </div>
                <p className="mt-2 font-medium text-ink-900 dark:text-white">{r.name}</p>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                  {r.lat.toFixed(4)}, {r.lon.toFixed(4)} · {r.altitude} ft
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
