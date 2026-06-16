/**
 * Shared validation for Mesh Monitor API proxy routes.
 * Keeps outbound requests on known hosts and limits forwarded fields.
 */

const DEFAULT_BASE = "https://meshbuddy.gulfcoastmesh.org";
const ALLOWED_HOSTS = new Set(["meshbuddy.gulfcoastmesh.org", "127.0.0.1", "localhost"]);
const MAX_JSON_BYTES = 16_384;
const HEX_PREFIX = /^[0-9A-F]{4}$/;

export function meshMonitorApiOrigin(): string {
  const raw = process.env.MESH_MONITOR_API_BASE ?? DEFAULT_BASE;
  try {
    const url = new URL(raw);
    const okProtocol =
      url.protocol === "https:" ||
      (url.protocol === "http:" && ALLOWED_HOSTS.has(url.hostname));
    if (!okProtocol || !ALLOWED_HOSTS.has(url.hostname)) return DEFAULT_BASE;
    return url.origin;
  } catch {
    return DEFAULT_BASE;
  }
}

export function isValidHexPrefix(prefix: string): boolean {
  return HEX_PREFIX.test(prefix.trim().toUpperCase());
}

export function normalizeHexPrefix(prefix: string): string {
  return prefix.trim().toUpperCase();
}

/** Only allow https map links from known mesh infrastructure hosts. */
export function safeMapUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "explorer.louisianamesh.org" ||
      host.endsWith(".gulfcoastmesh.org") ||
      host === "analyzer.gulfcoastmesh.org"
    ) {
      return parsed.href;
    }
  } catch {
    /* invalid URL */
  }
  return null;
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; error: string }> {
  const raw = await request.text();
  if (raw.length > MAX_JSON_BYTES) {
    return { ok: false, status: 413, error: "Request body too large." };
  }
  if (!raw.trim()) {
    return { ok: false, status: 400, error: "Expected JSON body." };
  }
  try {
    return { ok: true, data: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON." };
  }
}

export function parseReserveBody(
  data: unknown,
): { ok: true; body: Record<string, unknown> } | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "Invalid request body." };
  const d = data as Record<string, unknown>;
  const prefix = normalizeHexPrefix(String(d.prefix ?? ""));
  if (!isValidHexPrefix(prefix)) {
    return { ok: false, error: "Prefix must be exactly 4 hex characters." };
  }
  const name = String(d.name ?? "").trim().slice(0, 120);
  const email = String(d.email ?? "").trim().slice(0, 254);
  if (!name) return { ok: false, error: "Repeater name is required." };
  if (!email || !email.includes("@")) return { ok: false, error: "Valid email is required." };

  const lat = Number(d.lat);
  const lon = Number(d.lon);
  const altitude = Number(d.altitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { ok: false, error: "Latitude must be between -90 and 90." };
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return { ok: false, error: "Longitude must be between -180 and 180." };
  }
  if (!Number.isFinite(altitude)) {
    return { ok: false, error: "Altitude must be a number." };
  }

  const username = String(d.username ?? "").trim().slice(0, 80);
  const body: Record<string, unknown> = {
    prefix,
    name,
    email,
    lat,
    lon,
    altitude,
    source: "gulfcoastmesh.org",
  };
  if (username) body.username = username;
  return { ok: true, body };
}

export function parseReleaseBody(
  data: unknown,
): { ok: true; body: { prefix: string; email: string } } | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "Invalid request body." };
  const d = data as Record<string, unknown>;
  const prefix = normalizeHexPrefix(String(d.prefix ?? ""));
  const email = String(d.email ?? "").trim().slice(0, 254);
  if (!isValidHexPrefix(prefix)) {
    return { ok: false, error: "Prefix must be exactly 4 hex characters." };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Valid email is required." };
  }
  return { ok: true, body: { prefix, email } };
}

export function parseLookupBody(
  data: unknown,
): { ok: true; body: { email: string } } | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "Invalid request body." };
  const d = data as Record<string, unknown>;
  const email = String(d.email ?? "").trim().slice(0, 254);
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Valid email is required." };
  }
  return { ok: true, body: { email } };
}
