"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { useHasMounted } from "@/lib/use-has-mounted";
import {
  MEETING_END,
  MEETING_START,
  MEETING_TIME_LABEL,
  MEETING_TZ,
} from "@/lib/meeting-schedule";

/**
 * "Next meeting" hero card for /meetings.
 *
 * Source of truth: the community meeting runs every Monday from 6:30 PM to
 * 9:00 PM America/Chicago (Central), the same instant as the former
 * 7:30–10:00 PM Eastern schedule.
 *
 * SSR-safe: while hydrating, the wrapper renders a static placeholder. Only
 * after mount does it swap to the localized "in X hours" string, which keeps
 * the server-rendered HTML stable across timezones.
 */

function tzWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guessMs = Date.UTC(year, month - 1, day, hour, minute);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(guessMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const zonedMs = Date.UTC(
    parseInt(get("year"), 10),
    parseInt(get("month"), 10) - 1,
    parseInt(get("day"), 10),
    parseInt(get("hour"), 10) % 24,
    parseInt(get("minute"), 10),
  );
  return new Date(guessMs + (guessMs - zonedMs));
}

type CstCalendar = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

function nowInCst(now: Date): CstCalendar {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MEETING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10) % 24,
    minute: parseInt(get("minute"), 10),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

type NextMeeting = {
  start: Date;
  end: Date;
  inProgress: boolean;
};

function computeNextMeeting(now: Date): NextMeeting {
  const cst = nowInCst(now);
  let daysToAdd = (1 - cst.weekday + 7) % 7;
  if (daysToAdd === 0) {
    const minutesNow = cst.hour * 60 + cst.minute;
    const endMinutes = MEETING_END.hour * 60 + MEETING_END.minute;
    if (minutesNow >= endMinutes) {
      daysToAdd = 7;
    }
  }
  const targetUtc = new Date(Date.UTC(cst.year, cst.month - 1, cst.day + daysToAdd));
  const ty = targetUtc.getUTCFullYear();
  const tm = targetUtc.getUTCMonth() + 1;
  const td = targetUtc.getUTCDate();

  const start = tzWallToUtc(
    ty,
    tm,
    td,
    MEETING_START.hour,
    MEETING_START.minute,
    MEETING_TZ,
  );
  const end = tzWallToUtc(ty, tm, td, MEETING_END.hour, MEETING_END.minute, MEETING_TZ);
  return {
    start,
    end,
    inProgress: now >= start && now <= end,
  };
}

function formatInCst(start: Date): string {
  return start.toLocaleString("en-US", {
    timeZone: MEETING_TZ,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatCountdown(start: Date, now: Date): string {
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0) return "Happening now";
  const minutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  if (mins > 0) return `in ${mins} min`;
  return "starting now";
}

function Shell({
  eyebrow,
  localized,
  countdown,
}: {
  eyebrow: string;
  localized: string;
  countdown: string;
}) {
  return (
    <section className="surface relative mt-12 overflow-hidden p-6 sm:p-8">
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gulf-500/15 text-gulf-700 dark:text-gulf-300">
            <CalendarClock className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-gulf-700 dark:text-gulf-300">
              {eyebrow}
            </p>
            <p
              className="mt-1 font-display text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl dark:text-white"
              suppressHydrationWarning
            >
              {localized}
            </p>
            <p
              className="mt-1 text-sm text-ink-600 dark:text-ink-300"
              suppressHydrationWarning
            >
              <span className="font-medium">{countdown}</span>
              <span className="mx-1.5 text-ink-400">·</span>
              {MEETING_TIME_LABEL} every Monday
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <a
            href="https://discord.gulfcoastmesh.org"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Join on Discord
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}

function MountedNextMeetingCard() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const next = computeNextMeeting(now);
  return (
    <Shell
      eyebrow={next.inProgress ? "Meeting in progress" : "Next meeting"}
      localized={formatInCst(next.start)}
      countdown={formatCountdown(next.start, now)}
    />
  );
}

export function NextMeetingCard() {
  const mounted = useHasMounted();
  if (!mounted) {
    return (
      <Shell
        eyebrow="Next meeting"
        localized="Monday · 6:30 PM CST"
        countdown="every week"
      />
    );
  }
  return <MountedNextMeetingCard />;
}
