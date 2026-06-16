import { NextResponse } from "next/server";
import {
  getSetupDevice,
  isAllowedMeshCoreEraseUrl,
  isSetupDeviceId,
  resolveEraseDownloadUrl,
} from "@/lib/setup-devices";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const deviceParam = new URL(request.url).searchParams.get("device")?.trim() ?? "";

  if (!isSetupDeviceId(deviceParam)) {
    return NextResponse.json({ error: "Query parameter device is required." }, { status: 400 });
  }

  const device = getSetupDevice(deviceParam);
  if (!device?.eraseAsset) {
    return NextResponse.json({ error: `Erase firmware is not configured for ${deviceParam}.` }, { status: 400 });
  }

  const downloadUrl = resolveEraseDownloadUrl(device.eraseAsset);
  if (!isAllowedMeshCoreEraseUrl(downloadUrl)) {
    return NextResponse.json({ error: "Resolved erase URL is not allowed." }, { status: 502 });
  }

  try {
    const upstream = await fetch(downloadUrl, {
      headers: { "User-Agent": "GulfCoastMesh-Setup" },
      next: { revalidate: 3600 },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `Erase download failed (${upstream.status}).` }, { status: 502 });
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${device.eraseAsset}"`,
        "Cache-Control": "public, max-age=3600",
        "X-MeshCore-Erase-Asset": device.eraseAsset,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to download erase firmware.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
