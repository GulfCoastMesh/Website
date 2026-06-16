import { NextResponse } from "next/server";
import { listMeshCoreFirmwareVersions, type FirmwareRole } from "@/lib/meshcore-firmware";

export const runtime = "nodejs";

function parseRole(value: string | null): FirmwareRole | null {
  if (value === "client" || value === "repeater") return value;
  return null;
}

export async function GET(request: Request) {
  const role = parseRole(new URL(request.url).searchParams.get("role"));
  if (!role) {
    return NextResponse.json({ error: "Query parameter role=client|repeater is required." }, { status: 400 });
  }

  try {
    const { latest, versions } = await listMeshCoreFirmwareVersions(role);
    return NextResponse.json({ role, latest, versions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load MeshCore releases.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
