import { NextResponse } from "next/server";
import { isValidPrefix, normalizePrefix, reservePrefix, type ReservePayload } from "@/lib/meshbuddy";

export const runtime = "nodejs";

function parseReserveBody(body: unknown): ReservePayload | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const prefix = typeof record.prefix === "string" ? normalizePrefix(record.prefix) : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const lat = typeof record.lat === "number" ? record.lat : Number(record.lat);
  const lon = typeof record.lon === "number" ? record.lon : Number(record.lon);
  const altitude = typeof record.altitude === "number" ? record.altitude : Number(record.altitude);

  if (!isValidPrefix(prefix) || !name || !email || Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(altitude)) {
    return null;
  }

  return {
    prefix,
    name,
    email,
    lat,
    lon,
    altitude,
    username: typeof record.username === "string" ? record.username : undefined,
    display_name: typeof record.display_name === "string" ? record.display_name : undefined,
    user_id: typeof record.user_id === "number" ? record.user_id : undefined,
    source: typeof record.source === "string" ? record.source : "setup-wizard",
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = parseReserveBody(body);
  if (!payload) {
    return NextResponse.json(
      { error: "Required fields: prefix, name, lat, lon, altitude, email." },
      { status: 400 },
    );
  }

  try {
    const result = await reservePrefix(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reservation failed.";
    const status = typeof (error as Error & { status?: number }).status === "number"
      ? (error as Error & { status?: number }).status!
      : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
