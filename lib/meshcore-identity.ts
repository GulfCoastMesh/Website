import * as ed from "@noble/ed25519";
import { extractPrefix, isUsablePrefix } from "@/lib/meshbuddy";

export type IdentityKeypair = {
  privateKeyHex: string;
  publicKeyHex: string;
  prefix: string;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
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

export async function generateIdentityKeypair(maxAttempts = 50): Promise<IdentityKeypair> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = await ed.getPublicKeyAsync(privateKey);
    const privateKeyHex = bytesToHex(privateKey);
    const publicKeyHex = bytesToHex(publicKey).toUpperCase();
    const prefix = extractPrefix(publicKeyHex);

    if (isUsablePrefix(prefix)) {
      return { privateKeyHex, publicKeyHex, prefix };
    }
  }

  throw new Error("Failed to generate a usable MeshCore identity prefix.");
}
