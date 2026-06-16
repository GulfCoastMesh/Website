export const DEFAULT_MESHBUDDY_API_BASE = "https://meshbuddy.gulfcoastmesh.org";

export const MESHBUDDY_PREFIX_LENGTH = 4;

export type PrefixCheckResponse = {
  prefix: string;
  available: boolean;
  reason: string;
  message: string;
};

export type ReservePayload = {
  prefix: string;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  email: string;
  username?: string;
  display_name?: string;
  user_id?: number;
  source?: string;
};

export type ReserveResponse = {
  message: string;
  reservation: {
    prefix: string;
    name: string;
    lat: number;
    lon: number;
    altitude: number;
    email: string;
    username: string;
    display_name: string;
    user_id: number;
    added_at: string;
    source: string;
  };
};

export type MeshbuddyErrorResponse = {
  error: string;
};

export function getMeshbuddyApiBase(): string {
  return process.env.MESHBUDDY_API_BASE_URL?.trim() || DEFAULT_MESHBUDDY_API_BASE;
}

export function normalizePrefix(prefix: string): string {
  return prefix.trim().toUpperCase();
}

export function isValidPrefix(prefix: string, length = MESHBUDDY_PREFIX_LENGTH): boolean {
  const normalized = normalizePrefix(prefix);
  return normalized.length === length && /^[0-9A-F]+$/.test(normalized);
}

export function extractPrefix(publicKeyHex: string, length = MESHBUDDY_PREFIX_LENGTH): string {
  const hex = publicKeyHex.replace(/[^0-9a-f]/gi, "").toUpperCase();
  if (hex.length < length) {
    throw new Error("Public key is too short to extract a prefix.");
  }
  return hex.slice(0, length);
}

export function isUsablePrefix(prefix: string): boolean {
  const normalized = normalizePrefix(prefix);
  return normalized !== "0000" && normalized !== "FFFF";
}

export async function checkPrefix(prefix: string): Promise<PrefixCheckResponse> {
  const normalized = normalizePrefix(prefix);
  if (!isValidPrefix(normalized)) {
    throw new Error(`Invalid prefix "${prefix}". Expected ${MESHBUDDY_PREFIX_LENGTH} hex characters.`);
  }

  const response = await fetch(`${getMeshbuddyApiBase()}/api/prefix/${normalized}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  const data = (await response.json()) as PrefixCheckResponse | MeshbuddyErrorResponse;
  if (!response.ok) {
    throw new Error("error" in data ? data.error : `Prefix check failed (${response.status}).`);
  }

  return data as PrefixCheckResponse;
}

export async function reservePrefix(payload: ReservePayload): Promise<ReserveResponse> {
  const normalized = normalizePrefix(payload.prefix);
  if (!isValidPrefix(normalized)) {
    throw new Error(`Invalid prefix "${payload.prefix}".`);
  }

  const response = await fetch(`${getMeshbuddyApiBase()}/api/reserve`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      prefix: normalized,
      source: payload.source ?? "setup-wizard",
    }),
    next: { revalidate: 0 },
  });

  const data = (await response.json()) as ReserveResponse | MeshbuddyErrorResponse;
  if (!response.ok) {
    const error = new Error("error" in data ? data.error : `Reservation failed (${response.status}).`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return data as ReserveResponse;
}
