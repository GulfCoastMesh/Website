import { CURVE, Point } from "@noble/ed25519";
import { extractPrefix, isUsablePrefix } from "@/lib/meshbuddy";

export const MESHCORE_PRIVATE_KEY_HEX_LENGTH = 128;
const MESHCORE_PRIVATE_KEY_BYTES = 64;
const MESHCORE_SCALAR_BYTES = 32;

export type IdentityKeypair = {
  privateKeyHex: string;
  publicKeyHex: string;
  prefix: string;
};

export type PrefixAvailabilityResult = {
  available?: boolean;
};

export type PrefixAvailabilityChecker = (prefix: string) => Promise<PrefixAvailabilityResult>;

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToNumLE(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return value;
}

function clampMeshCoreScalar(scalar: Uint8Array): Uint8Array {
  const clamped = new Uint8Array(scalar);
  clamped[0] &= 248;
  clamped[31] &= 63;
  clamped[31] |= 64;
  return clamped;
}

function generateMeshCorePrivateKeyExpanded(): Uint8Array {
  const scalar = clampMeshCoreScalar(crypto.getRandomValues(new Uint8Array(MESHCORE_SCALAR_BYTES)));
  const signingComponent = crypto.getRandomValues(new Uint8Array(MESHCORE_SCALAR_BYTES));
  const expanded = new Uint8Array(MESHCORE_PRIVATE_KEY_BYTES);
  expanded.set(scalar, 0);
  expanded.set(signingComponent, MESHCORE_SCALAR_BYTES);
  return expanded;
}

export function deriveMeshCorePublicKey(privateKeyExpanded: Uint8Array): Uint8Array {
  if (privateKeyExpanded.length !== MESHCORE_PRIVATE_KEY_BYTES) {
    throw new Error(`MeshCore private key must be ${MESHCORE_PRIVATE_KEY_BYTES} bytes.`);
  }

  const scalar = bytesToNumLE(privateKeyExpanded.slice(0, MESHCORE_SCALAR_BYTES)) % CURVE.n;
  return Point.BASE.multiply(scalar).toBytes();
}

export function isValidMeshCorePrivateKeyHex(privateKeyHex: string): boolean {
  const normalized = privateKeyHex.trim().toLowerCase();
  return normalized.length === MESHCORE_PRIVATE_KEY_HEX_LENGTH && /^[0-9a-f]+$/.test(normalized);
}

export function parsePublicKeyFromSetPrivateKeyResponse(lines: string[]): string | null {
  const joined = lines.join(" ");
  const labeledMatch = joined.match(/new pubkey:\s*([0-9a-f]{32,})/i);
  if (!labeledMatch) return null;

  const publicKeyHex = labeledMatch[1].replace(/[^0-9a-f]/gi, "").toUpperCase();
  return publicKeyHex.length >= 32 ? publicKeyHex : null;
}

export function parsePublicKeyFromSerial(lines: string[]): string {
  const joined = lines.join(" ");
  const hexMatches = joined.match(/[0-9a-f]{32,}/gi);
  if (!hexMatches?.length) {
    throw new Error("Could not parse public key from device response.");
  }

  const publicKeyHex = hexMatches
    .map((match) => match.replace(/[^0-9a-f]/gi, ""))
    .sort((a, b) => b.length - a.length)[0]
    .toUpperCase();

  if (publicKeyHex.length < 8) {
    throw new Error("Parsed public key is too short.");
  }

  return publicKeyHex;
}

export function normalizePublicKeyHex(publicKeyHex: string): string {
  return publicKeyHex.replace(/[^0-9a-f]/gi, "").toUpperCase();
}

export function publicKeysMatch(expected: string, actual: string): boolean {
  const normalizedExpected = normalizePublicKeyHex(expected);
  const normalizedActual = normalizePublicKeyHex(actual);
  if (!normalizedExpected || !normalizedActual) return false;
  if (normalizedExpected === normalizedActual) return true;

  const shortest = Math.min(normalizedExpected.length, normalizedActual.length);
  return shortest >= 32 && normalizedExpected.slice(0, shortest) === normalizedActual.slice(0, shortest);
}

export async function generateIdentityKeypair(maxAttempts = 50): Promise<IdentityKeypair> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0 && attempt % 4 === 0) {
      await yieldToMain();
    }

    const privateKeyExpanded = generateMeshCorePrivateKeyExpanded();
    const privateKeyHex = bytesToHex(privateKeyExpanded);
    const publicKeyHex = bytesToHex(deriveMeshCorePublicKey(privateKeyExpanded)).toUpperCase();
    const prefix = extractPrefix(publicKeyHex);

    if (isUsablePrefix(prefix)) {
      return { privateKeyHex, publicKeyHex, prefix };
    }
  }

  throw new Error("Failed to generate a usable MeshCore identity prefix.");
}

export async function generateAvailableKeypair(
  checkPrefixAvailable: PrefixAvailabilityChecker,
  maxAttempts = 15,
  onProgress?: (attempt: number, maxAttempts: number) => void,
): Promise<IdentityKeypair> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await yieldToMain();
    onProgress?.(attempt + 1, maxAttempts);

    const keypair = await generateIdentityKeypair();
    const availability = await checkPrefixAvailable(keypair.prefix);
    if (availability.available) {
      return keypair;
    }
  }

  throw new Error(`Could not find an available MeshBuddy prefix after ${maxAttempts} attempts.`);
}
