import { NextResponse } from "next/server";

import {
  meshMonitorApiOrigin,
  parseLookupBody,
  readJsonBody,
} from "@/lib/mesh-monitor-proxy";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const body = parseLookupBody(parsed.data);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const base = meshMonitorApiOrigin();
  try {
    const res = await fetch(`${base}/api/my-reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.body),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Could not reach Mesh Monitor API." }, { status: 502 });
  }
}
