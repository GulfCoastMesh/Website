import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  FileText,
  MessageSquare,
  Youtube,
} from "lucide-react";

import { MeetingsCalendar } from "@/components/meetings-calendar";
import { NextMeetingCard } from "@/components/next-meeting-card";
import { MEETING_TIME_LABEL } from "@/lib/meeting-schedule";
import {
  absoluteAgendaUrl,
  formatTimeCst,
  getPublishedMeetingsWithRecap,
  meetingDateKeyCst,
  type PublicMeetingWithRecap,
} from "@/lib/meetings";

export const metadata = {
  title: "Meetings",
  description:
    `Weekly Gulf Coast Mesh voice meeting — every Monday ${MEETING_TIME_LABEL} — plus the archive of past published meetings with YouTube recaps and agendas.`,
};

export const revalidate = 300;

export default async function MeetingsPage() {
  const meetings = await getPublishedMeetingsWithRecap();

  // CST-date keyed lookup powers the calendar's "is this Monday published?"
  // logic. We bucket by the meeting's starting day in America/Chicago so a
  // meeting that crosses midnight UTC still maps to the correct Monday cell.
  const publishedByDateKey: Record<
    string,
    { id: string; youtubeUrl: string; dateLabel: string }
  > = {};
  for (const m of meetings) {
    const key = meetingDateKeyCst(m.startedAt);
    if (key && m.youtubeUrl) {
      publishedByDateKey[key] = {
        id: m.id,
        youtubeUrl: m.youtubeUrl,
        dateLabel: m.dateLabel,
      };
    }
  }

  return (
    <div className="container pb-24">
      <header className="mx-auto max-w-3xl text-center">
        <span className="eyebrow mx-auto">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          Meetings
        </span>
        <h1 className="mt-5 font-display text-display-xl font-semibold tracking-tight text-balance text-ink-900 dark:text-white">
          Every Monday on the mesh.
        </h1>
        <p className="mt-5 text-pretty text-lg text-ink-600 dark:text-ink-300">
          The Gulf Coast Mesh voice meeting runs every Monday from{" "}
          <span className="font-semibold text-ink-800 dark:text-ink-100">{MEETING_TIME_LABEL}</span>{" "}
          on Discord. New operators welcome — drop in, listen, or hop on mic.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <a
            href="https://discord.gulfcoastmesh.org"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            Open Discord
          </a>
          <Link href="#archive" className="btn-ghost">
            See past meetings
          </Link>
        </div>
      </header>

      <NextMeetingCard />

      <MeetingsCalendar publishedByDateKey={publishedByDateKey} />

      <section id="archive" className="mt-20">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-gulf-700 dark:text-gulf-300">
              Archive
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl dark:text-white">
              Past meetings
            </h2>
          </div>
          {meetings.length > 0 ? (
            <p className="hidden text-sm text-ink-500 sm:block dark:text-ink-400">
              {meetings.length} published recap{meetings.length === 1 ? "" : "s"} · newest first
            </p>
          ) : null}
        </div>

        {meetings.length === 0 ? (
          <div className="surface p-8 text-center text-sm text-ink-600 dark:text-ink-300">
            Past meetings will appear here once the next one is published. Want to be in
            the room? Hop into{" "}
            <a
              href="https://discord.gulfcoastmesh.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gulf-700 underline-offset-4 hover:underline dark:text-gulf-300"
            >
              Discord
            </a>
            .
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {meetings.map((m) => (
              <PastMeetingCard key={m.id} meeting={m} />
            ))}
          </ul>
        )}
      </section>

      <p className="mt-16 text-center text-sm text-ink-500 dark:text-ink-400">
        <Link href="/" className="font-medium text-gulf-700 hover:underline dark:text-gulf-300">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

function PastMeetingCard({ meeting }: { meeting: PublicMeetingWithRecap }) {
  const startedAt = formatTimeCst(meeting.startedAt);
  const endedAt = formatTimeCst(meeting.endedAt);
  const timeRange = startedAt && endedAt ? `${startedAt} - ${endedAt} CST` : null;

  return (
    <li className="tile group flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-gulf-500/15 text-gulf-700 dark:text-gulf-300">
          <CalendarDays className="h-5 w-5" aria-hidden />
        </span>
        {meeting.youtubeUrl ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sand-400/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-sand-700 dark:text-sand-300">
            <Youtube className="h-3 w-3" aria-hidden />
            Recap
          </span>
        ) : null}
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold text-ink-900 dark:text-white">
        {meeting.dateLabel}
      </h3>
      {timeRange ? (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
          {timeRange}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {meeting.youtubeUrl ? (
          <a
            href={meeting.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-gulf-700 transition hover:border-gulf-400/60 hover:bg-gulf-500/5 dark:text-gulf-300"
            style={{ borderColor: "rgb(var(--line))" }}
          >
            <Youtube className="h-3.5 w-3.5" aria-hidden />
            Watch on YouTube
            <ArrowUpRight
              className="h-3 w-3 transition group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
              aria-hidden
            />
          </a>
        ) : null}
      </div>

      {meeting.recapHtml ? (
        <details className="group/recap mt-4 border-t border-[rgb(var(--line))] pt-4 ">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-left font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-600 transition hover:text-ink-900 dark:text-ink-300 dark:hover:text-white">
            <span>Meeting summary</span>
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform group-open/recap:rotate-180"
              aria-hidden
            />
          </summary>
          <div
            className="prose-mesh prose-sm mt-3 text-sm"
            dangerouslySetInnerHTML={{ __html: meeting.recapHtml }}
          />
        </details>
      ) : null}

      {meeting.agendas.length > 0 ? (
        <div className="mt-4 border-t border-[rgb(var(--line))] pt-4 ">
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
            Agenda
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {meeting.agendas.map((a) => (
              <li key={a.originalName}>
                <a
                  href={absoluteAgendaUrl(a.downloadUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border bg-[rgb(var(--bg-elevated))] px-2.5 py-1 text-xs font-medium text-ink-700 transition hover:bg-[rgb(var(--bg-sunken))] dark:text-ink-100"
                  style={{ borderColor: "rgb(var(--line))" }}
                  title={a.originalName}
                >
                  <FileText className="h-3 w-3" aria-hidden />
                  <span className="max-w-[12rem] truncate">{a.originalName}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
