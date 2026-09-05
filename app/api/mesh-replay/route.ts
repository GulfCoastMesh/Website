import { NextResponse } from "next/server";

type AnalyzerPacket = {
  payload_type?: unknown;
  timestamp?: unknown;
  first_seen?: unknown;
};

type ReplayEvent = {
  offsetMs: number;
  payloadType: number;
};

type ReplayPayload = {
  durationMs: number;
  events: ReplayEvent[];
};

const ANALYZER_URL =
  process.env.ANALYZER_API_URL || "https://analyzer.gulfcoastmesh.org";
const WINDOW_MS = 5 * 60 * 1000;
const REPLAY_DURATION_MS = 20 * 1000;
const MAX_REPLAY_EVENTS = 500;
const CACHE_DURATION_MS = 5 * 60 * 1000;

let cachedReplay: { expiresAt: number; payload: ReplayPayload } | null = null;

const asTimestamp = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const busiestWindow = (timestamps: number[]): [number, number] | null => {
  if (timestamps.length === 0) return null;

  let left = 0;
  let bestLeft = 0;
  let bestRight = 0;

  for (let right = 0; right < timestamps.length; right += 1) {
    while (timestamps[right] - timestamps[left] > WINDOW_MS) left += 1;
    if (right - left > bestRight - bestLeft) {
      bestLeft = left;
      bestRight = right;
    }
  }

  return [timestamps[bestLeft], timestamps[bestLeft] + WINDOW_MS];
};

const sampleEvents = (events: ReplayEvent[]): ReplayEvent[] => {
  if (events.length <= MAX_REPLAY_EVENTS) return events;

  return Array.from({ length: MAX_REPLAY_EVENTS }, (_, index) => {
    const sourceIndex = Math.floor(
      (index * (events.length - 1)) / (MAX_REPLAY_EVENTS - 1)
    );
    return events[sourceIndex];
  });
};

const loadReplay = async (): Promise<ReplayPayload> => {
  const now = Date.now();
  const since = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const timestampsUrl = new URL("/api/packets/timestamps", ANALYZER_URL);
  timestampsUrl.searchParams.set("since", since);

  const timestampsResponse = await fetch(timestampsUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!timestampsResponse.ok) {
    throw new Error(
      `Analyzer timestamps returned ${timestampsResponse.status}`
    );
  }

  const rawTimestamps: unknown = await timestampsResponse.json();
  if (!Array.isArray(rawTimestamps)) throw new Error("Invalid timestamp list");

  const timestamps = rawTimestamps
    .map(asTimestamp)
    .filter((timestamp): timestamp is number => timestamp !== null)
    .sort((first, second) => first - second);
  const window = busiestWindow(timestamps);
  if (!window) return { durationMs: REPLAY_DURATION_MS, events: [] };

  const packetsUrl = new URL("/api/packets", ANALYZER_URL);
  packetsUrl.searchParams.set("since", new Date(window[0]).toISOString());
  packetsUrl.searchParams.set("until", new Date(window[1]).toISOString());
  packetsUrl.searchParams.set("limit", "10000");
  packetsUrl.searchParams.set("order", "asc");

  const packetsResponse = await fetch(packetsUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!packetsResponse.ok) {
    throw new Error(`Analyzer packets returned ${packetsResponse.status}`);
  }

  const rawPackets: unknown = await packetsResponse.json();
  if (
    typeof rawPackets !== "object" ||
    rawPackets === null ||
    !Array.isArray((rawPackets as { packets?: unknown }).packets)
  ) {
    throw new Error("Invalid packet list");
  }

  const packets = (rawPackets as { packets: AnalyzerPacket[] }).packets;
  const events = packets
    .map((packet): { timestamp: number; payloadType: number } | null => {
      const timestamp = asTimestamp(packet.timestamp ?? packet.first_seen);
      const payloadType =
        typeof packet.payload_type === "number"
          ? packet.payload_type
          : Number.parseInt(String(packet.payload_type), 10);
      if (timestamp === null || !Number.isFinite(payloadType)) return null;
      return { timestamp, payloadType };
    })
    .filter(
      (event): event is { timestamp: number; payloadType: number } =>
        event !== null
    )
    .sort((first, second) => first.timestamp - second.timestamp);

  if (events.length === 0) {
    return { durationMs: REPLAY_DURATION_MS, events: [] };
  }

  const sourceStart = events[0].timestamp;
  const sourceDuration = Math.max(
    events[events.length - 1].timestamp - sourceStart,
    1
  );
  const replayEvents = events.map((event) => ({
    offsetMs: Math.round(
      ((event.timestamp - sourceStart) / sourceDuration) * REPLAY_DURATION_MS
    ),
    payloadType: event.payloadType,
  }));

  return {
    durationMs: REPLAY_DURATION_MS,
    events: sampleEvents(replayEvents),
  };
};

export async function GET() {
  try {
    if (cachedReplay && cachedReplay.expiresAt > Date.now()) {
      return NextResponse.json(cachedReplay.payload);
    }

    const payload = await loadReplay();
    cachedReplay = {
      expiresAt: Date.now() + CACHE_DURATION_MS,
      payload,
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { durationMs: REPLAY_DURATION_MS, events: [] },
      { status: 200 }
    );
  }
}
