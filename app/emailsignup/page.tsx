"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Calendar, Check, Loader2, Mail } from "lucide-react";

const ALERTS_LIST_ID = "9a20b3f8-4ea8-4c42-ae1c-8f426ee77879";
const NEWS_LIST_ID = "3f08e2e0-0db3-4ffa-a7c2-b71bf6a39f1c";

export default function EmailSignupPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setStatus(null);

    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");

    const params = new URLSearchParams();
    params.append("email", email);
    params.append("nonce", "");
    params.append("l", ALERTS_LIST_ID);
    if (formData.get("weekly")) params.append("l", NEWS_LIST_ID);

    try {
      await fetch("https://lists.gulfcoastmesh.org/subscription/form", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      setStatus({
        type: "success",
        text: "Subscription request received — check your inbox to confirm.",
      });
      form.reset();
    } catch {
      setStatus({ type: "error", text: "Connection error. Please try again later." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container pb-24">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <h1 className="font-display text-display-xl font-semibold tracking-tight text-balance text-ink-900 dark:text-white">
            Network signal, delivered to your inbox.
          </h1>
          <p className="mt-5 text-pretty text-lg text-ink-600 dark:text-ink-300">
            Two clean lists — pick what you want. No spam, no auto-enrollment, no surprises.
          </p>

          <ul className="mt-8 space-y-3">
            <li className="surface flex items-start gap-3 p-4">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gulf-500/15 text-gulf-700 dark:text-gulf-300">
                <Bell className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-ink-900 dark:text-white">Network alerts</p>
                <p className="mt-1 text-xs text-ink-600 dark:text-ink-300">
                  Important updates and breaking changes. Up to two emails a month.
                </p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-gulf-500/30 bg-gulf-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 dark:text-gulf-200">
                Required
              </span>
            </li>
            <li className="surface flex items-start gap-3 p-4">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sand-400/20 text-sand-700 dark:text-sand-300">
                <Calendar className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-ink-900 dark:text-white">Network news</p>
                <p className="mt-1 text-xs text-ink-600 dark:text-ink-300">
                  Summaries from community meetings and other news. Up to one email a week.
                </p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-700 dark:text-ink-100" style={{ borderColor: "rgb(var(--line))" }}>
                Optional
              </span>
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="surface-strong relative overflow-hidden p-8 sm:p-10">

          <div className="relative">
            <label htmlFor="email" className="block font-display text-sm font-semibold text-ink-900 dark:text-white">
              Email address
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border bg-white px-3 py-1 focus-within:ring-2 focus-within:ring-gulf-400 dark:bg-ink-900" style={{ borderColor: "rgb(var(--line))" }}>
              <Mail className="h-4 w-4 text-ink-400" />
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-transparent py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400 dark:text-white"
              />
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition hover:border-gulf-400/50 " style={{ borderColor: "rgb(var(--line))" }}>
              <input
                type="checkbox"
                name="weekly"
                className="peer mt-0.5 h-5 w-5 cursor-pointer accent-gulf-500"
              />
              <span>
                <span className="block font-display text-sm font-semibold text-ink-900 dark:text-white">
                  Also send me weekly news
                </span>
                <span className="mt-0.5 block text-xs text-ink-600 dark:text-ink-300">
                  Optional. Meeting recaps, community updates, fun stuff.
                </span>
              </span>
            </label>

            <p className="mt-5 flex items-start gap-2 rounded-xl border border-gulf-500/30 bg-gulf-500/5 p-3 text-xs text-ink-600 dark:text-ink-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gulf-600 dark:text-gulf-300" />
              <span>
                You’ll be auto-subscribed to <span className="font-semibold text-ink-900 dark:text-white">Network alerts</span> (up to 2 emails/month).
              </span>
            </p>

            {status ? (
              <div
                role="status"
                className={
 "mt-5 rounded-lg border p-4 text-sm font-medium " +
                  (status.type === "success"
                    ? "border-gulf-500/30 bg-gulf-500/10 text-gulf-800 dark:text-gulf-100"
                    : "border-coral-500/30 bg-coral-500/10 text-coral-500")
                }
              >
                {status.text}
              </div>
            ) : null}

            <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Subscribe"
              )}
            </button>
          </div>
        </form>
      </div>

      <p className="mt-12 text-center text-sm text-ink-500 dark:text-ink-400">
        <Link href="/" className="font-medium text-gulf-700 hover:underline dark:text-gulf-300">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
