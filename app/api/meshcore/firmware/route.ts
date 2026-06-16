import { NextResponse } from "next/server";
import {
  isAllowedMeshCoreDownloadUrl,
  resolveMeshCoreFirmwareDownload,
  type FirmwareRole,
} from "@/lib/meshcore-firmware";
import { isSetupDeviceId } from "@/lib/setup-devices";

export const runtime = "nodejs";

function parseRole(value: string | null): FirmwareRole | null {
  if (value === "client" || value === "repeater") return value;
  return null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const role = parseRole(params.get("role"));
  const deviceParam = params.get("device")?.trim() ?? "";
  const version = params.get("version")?.trim();

  if (!role || !isSetupDeviceId(deviceParam) || !version) {
    return NextResponse.json(
      { error: "Query parameters device, role, and version are required." },
      { status: 400 },
    );
  }

  try {
    const resolved = await resolveMeshCoreFirmwareDownload(deviceParam, role, version);
    if (!isAllowedMeshCoreDownloadUrl(resolved.downloadUrl)) {
      return NextResponse.json({ error: "Resolved firmware URL is not allowed." }, { status: 502 });
    }

    const upstream = await fetch(resolved.downloadUrl, {
      headers: { "User-Agent": "GulfCoastMesh-Setup" },
      next: { revalidate: 0 },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `Firmware download failed (${upstream.status}).` }, { status: 502 });
    }

    const body = await upstream.arrayBuffer();
    const contentType =
      resolved.format === "zip" ? "application/zip" : "application/octet-stream";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${resolved.fileName}"`,
        "Cache-Control": "public, max-age=3600",
        "X-MeshCore-Tag": resolved.tag,
        "X-MeshCore-Version": resolved.version,
        "X-MeshCore-File": resolved.fileName,
        "X-MeshCore-Format": resolved.format,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve MeshCore firmware.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
