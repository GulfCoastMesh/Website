"use client";

import { useCallback, useState } from "react";
import { Check, Loader2, Radio, Unlock } from "lucide-react";

type PrefixStatus = {
  prefix: string;
  available: boolean;
  reason: string;
  message: string;
} | null;

type FormStatus = { type: "success" | "error"; text: string } | null;

const inputWrap =
 "mt-2 flex items-center gap-2 rounded-lg border bg-white px-3 py-1 focus-within:ring-2 focus-within:ring-gulf-400 dark:bg-ink-900";
const inputClass =
  "w-full bg-transparent py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400 dark:text-white";
const labelClass = "block font-display text-sm font-semibold text-ink-900 dark:text-white";

export function MeshMonitorReserveForm() {
  const [prefixStatus, setPrefixStatus] = useState<PrefixStatus>(null);
  const [prefixChecking, setPrefixChecking] = useState(false);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [reserveStatus, setReserveStatus] = useState<FormStatus>(null);
  const [releaseStatus, setReleaseStatus] = useState<FormStatus>(null);

  const checkPrefix = useCallback(async (raw: string) => {
    const prefix = raw.trim().toUpperCase();
    if (prefix.length !== 4 || !/^[0-9A-F]{4}$/.test(prefix)) {
      setPrefixStatus(null);
      return;
    }
    setPrefixChecking(true);
    try {
      const res = await fetch(`/api/mesh-monitor/prefix/${encodeURIComponent(prefix)}`);
      const data = (await res.json()) as PrefixStatus & { error?: string };
      if (res.ok && data.prefix) setPrefixStatus(data);
      else setPrefixStatus(null);
    } catch {
      setPrefixStatus(null);
    } finally {
      setPrefixChecking(false);
    }
  }, []);

  async function handleReserve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setReserveLoading(true);
    setReserveStatus(null);

    const fd = new FormData(form);
    const prefix = String(fd.get("prefix") ?? "")
      .trim()
      .toUpperCase();
    if (!/^[0-9A-F]{4}$/.test(prefix)) {
      setReserveStatus({ type: "error", text: "Prefix must be exactly 4 hex characters." });
      setReserveLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/mesh-monitor/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          name: String(fd.get("name") ?? "").trim(),
          email: String(fd.get("email") ?? "").trim(),
          lat: Number(fd.get("lat")),
          lon: Number(fd.get("lon")),
          altitude: Number(fd.get("altitude")),
          username: String(fd.get("username") ?? "").trim() || undefined,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        const msg = data.message ?? `Prefix ${prefix} reserved successfully.`;
        setReserveStatus({ type: "success", text: msg });
        form.reset();
        setPrefixStatus(null);
      } else {
        setReserveStatus({ type: "error", text: data.error ?? "Reservation failed." });
      }
    } catch {
      setReserveStatus({ type: "error", text: "Connection error. Please try again." });
    } finally {
      setReserveLoading(false);
    }
  }

  async function handleRelease(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setReleaseLoading(true);
    setReleaseStatus(null);

    const fd = new FormData(form);
    const prefix = String(fd.get("release_prefix") ?? "")
      .trim()
      .toUpperCase();
    const email = String(fd.get("release_email") ?? "").trim();

    if (!confirm(`Release reservation for prefix ${prefix}?`)) {
      setReleaseLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/mesh-monitor/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        setReleaseStatus({ type: "success", text: data.message ?? `Prefix ${prefix} released.` });
        form.reset();
      } else {
        setReleaseStatus({ type: "error", text: data.error ?? "Release failed." });
      }
    } catch {
      setReleaseStatus({ type: "error", text: "Connection error. Please try again." });
    } finally {
      setReleaseLoading(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
      <form onSubmit={handleReserve} className="surface-strong relative overflow-hidden p-6 sm:p-8">
        <h3 className="relative font-display text-lg font-semibold text-ink-900 dark:text-white">
          New reservation
        </h3>
        <p className="relative mt-1 text-sm text-ink-600 dark:text-ink-300">
          Claim a 4-character hex prefix for your MeshCore repeater before deployment.
        </p>

        <div className="relative mt-6 space-y-4">
          <div>
            <label htmlFor="prefix" className={labelClass}>
              Hex prefix <span className="font-normal text-ink-500">(4 characters)</span>
            </label>
            <div className={inputWrap} style={{ borderColor: "rgb(var(--line))" }}>
              <input
                id="prefix"
                name="prefix"
                required
                maxLength={4}
                placeholder="A1B2"
                autoComplete="off"
                className={`${inputClass} font-mono uppercase tracking-widest`}
                onBlur={(e) => checkPrefix(e.target.value)}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase().replace(/[^0-9A-F]/gi, "");
                }}
              />
              {prefixChecking ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-400" aria-hidden />
              ) : null}
            </div>
            {prefixStatus ? (
              <p
                className={
                  "mt-2 text-xs font-medium " +
                  (prefixStatus.available
                    ? "text-gulf-700 dark:text-gulf-300"
                    : "text-coral-700 dark:text-coral-300")
                }
              >
                {prefixStatus.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="name" className={labelClass}>
              Repeater name
            </label>
            <div className={inputWrap} style={{ borderColor: "rgb(var(--line))" }}>
              <input id="name" name="name" required className={inputClass} placeholder="My Repeater" />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email <span className="font-normal text-ink-500">(shared with coordinators only)</span>
            </label>
            <div className={inputWrap} style={{ borderColor: "rgb(var(--line))" }}>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="lat" className={labelClass}>
                Latitude
              </label>
              <div className={inputWrap} style={{ borderColor: "rgb(var(--line))" }}>
                <input
                  id="lat"
                  name="lat"
                  type="number"
                  required
                  step="any"
                  min={-90}
                  max={90}
                  className={inputClass}
                  placeholder="30.45"
                />
              </div>
            </div>
            <div>
              <label htmlFor="lon" className={labelClass}>
                Longitude
              </label>
              <div className={inputWrap} style={{ borderColor: "rgb(var(--line))" }}>
                <input
                  id="lon"
                  name="lon"
                  type="number"
                  required
                  step="any"
                  min={-180}
                  max={180}
                  className={inputClass}
                  placeholder="-91.19"
                />
              </div>
            </div>
            <div>
              <label htmlFor="altitude" className={labelClass}>
                Altitude (ft)
              </label>
              <div className={inputWrap} style={{ borderColor: "rgb(var(--line))" }}>
                <input
                  id="altitude"
                  name="altitude"
                  type="number"
                  required
                  step="any"
                  className={inputClass}
                  placeholder="50"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="username" className={labelClass}>
              Your name <span className="font-normal text-ink-500">(optional)</span>
            </label>
            <div className={inputWrap} style={{ borderColor: "rgb(var(--line))" }}>
              <input id="username" name="username" className={inputClass} placeholder="Operator name" />
            </div>
          </div>

          {reserveStatus ? (
            <div
              role="status"
              className={
 "rounded-lg border p-4 text-sm font-medium " +
                (reserveStatus.type === "success"
                  ? "border-gulf-500/30 bg-gulf-500/10 text-gulf-800 dark:text-gulf-100"
                  : "border-coral-500/30 bg-coral-500/10 text-coral-700 dark:text-coral-200")
              }
            >
              {reserveStatus.text}
            </div>
          ) : null}

          <button type="submit" disabled={reserveLoading} className="btn-primary w-full">
            {reserveLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Reserving…
              </>
            ) : (
              <>
                <Radio className="h-4 w-4" aria-hidden />
                Reserve prefix
              </>
            )}
          </button>
        </div>
      </form>

      <form onSubmit={handleRelease} className="surface p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
          Release a reservation
        </h3>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          Enter the same email you used when reserving. Releases are reviewed by network admins.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="release_prefix" className={labelClass}>
              Prefix
            </label>
            <div className={inputWrap} style={{ borderColor: "rgb(var(--line))" }}>
              <input
                id="release_prefix"
                name="release_prefix"
                required
                maxLength={4}
                className={`${inputClass} font-mono uppercase tracking-widest`}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase().replace(/[^0-9A-F]/gi, "");
                }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="release_email" className={labelClass}>
              Email
            </label>
            <div className={inputWrap} style={{ borderColor: "rgb(var(--line))" }}>
              <input
                id="release_email"
                name="release_email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>
          </div>

          {releaseStatus ? (
            <div
              role="status"
              className={
 "rounded-lg border p-4 text-sm font-medium " +
                (releaseStatus.type === "success"
                  ? "border-gulf-500/30 bg-gulf-500/10 text-gulf-800 dark:text-gulf-100"
                  : "border-coral-500/30 bg-coral-500/10 text-coral-700 dark:text-coral-200")
              }
            >
              {releaseStatus.text}
            </div>
          ) : null}

          <button type="submit" disabled={releaseLoading} className="btn-ghost w-full">
            {releaseLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Releasing…
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" aria-hidden />
                Release prefix
              </>
            )}
          </button>
        </div>

        <p className="mt-6 flex items-start gap-2 text-xs text-ink-500 dark:text-ink-400">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-gulf-600 dark:text-gulf-300" aria-hidden />
          Prefixes <code className="font-mono">0000</code> and <code className="font-mono">FFFF</code>{" "}
          cannot be reserved.
        </p>
      </form>
    </div>
  );
}
