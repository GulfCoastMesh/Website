import { getSetupDevice, type FirmwareRole, type SetupDeviceId } from "@/lib/setup-devices";

export const MESHCORE_GITHUB_REPO = "meshcore-dev/MeshCore";

export type { FirmwareRole, SetupDeviceId } from "@/lib/setup-devices";

type GitHubRelease = {
  tag_name: string;
  name: string;
  assets: { name: string; browser_download_url: string }[];
};

const RELEASE_PREFIX: Record<FirmwareRole, string> = {
  client: "companion-v",
  repeater: "repeater-v",
};

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "GulfCoastMesh-Setup",
  "X-GitHub-Api-Version": "2022-11-28",
};

export function normalizeFirmwareVersionInput(version: string): string {
  return version.trim().replace(/^v/i, "");
}

export function buildReleaseTag(role: FirmwareRole, version: string): string {
  const trimmed = version.trim();
  if (trimmed.startsWith("companion-") || trimmed.startsWith("repeater-")) {
    return trimmed;
  }
  return `${RELEASE_PREFIX[role]}${normalizeFirmwareVersionInput(trimmed)}`;
}

export function versionFromReleaseTag(role: FirmwareRole, tag: string): string | null {
  const prefix = RELEASE_PREFIX[role];
  if (!tag.startsWith(prefix)) return null;
  return tag.slice(prefix.length);
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const pb = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function pickBinFirmwareAsset(
  assets: GitHubRelease["assets"],
  patterns: string[],
): { name: string; browser_download_url: string } | null {
  for (const pattern of patterns) {
    const patternLower = pattern.toLowerCase();
    const merged = assets.find(
      (asset) =>
        asset.name.toLowerCase().includes(patternLower) && asset.name.toLowerCase().endsWith("-merged.bin"),
    );
    if (merged) return merged;

    const plain = assets.find(
      (asset) =>
        asset.name.toLowerCase().includes(patternLower) &&
        asset.name.toLowerCase().endsWith(".bin") &&
        !asset.name.toLowerCase().includes("-merged.bin"),
    );
    if (plain) return plain;
  }
  return null;
}

function pickZipFirmwareAsset(
  assets: GitHubRelease["assets"],
  patterns: string[],
): { name: string; browser_download_url: string } | null {
  for (const pattern of patterns) {
    const patternLower = pattern.toLowerCase();
    const zip = assets.find(
      (asset) =>
        asset.name.toLowerCase().includes(patternLower) && asset.name.toLowerCase().endsWith(".zip"),
    );
    if (zip) return zip;
  }
  return null;
}

function pickFirmwareAsset(
  assets: GitHubRelease["assets"],
  patterns: string[],
  format: "bin" | "zip",
): { name: string; browser_download_url: string } | null {
  if (format === "zip") {
    return pickZipFirmwareAsset(assets, patterns);
  }
  return pickBinFirmwareAsset(assets, patterns);
}

export async function fetchMeshCoreReleases(role: FirmwareRole): Promise<GitHubRelease[]> {
  const response = await fetch(`https://api.github.com/repos/${MESHCORE_GITHUB_REPO}/releases?per_page=40`, {
    headers: GITHUB_HEADERS,
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`MeshCore releases lookup failed (${response.status})`);
  }

  const releases = (await response.json()) as GitHubRelease[];
  const prefix = RELEASE_PREFIX[role];
  return releases.filter((release) => release.tag_name.startsWith(prefix));
}

export async function listMeshCoreFirmwareVersions(
  role: FirmwareRole,
): Promise<{ latest: string | null; versions: string[] }> {
  const releases = await fetchMeshCoreReleases(role);
  const versions = releases
    .map((release) => versionFromReleaseTag(role, release.tag_name))
    .filter((version): version is string => Boolean(version));

  const unique = [...new Set(versions)].sort(compareVersions).reverse();
  return { latest: unique[0] ?? null, versions: unique };
}

export async function resolveMeshCoreFirmwareDownload(
  device: SetupDeviceId,
  role: FirmwareRole,
  version: string,
): Promise<{
  tag: string;
  version: string;
  fileName: string;
  downloadUrl: string;
  format: "bin" | "zip";
}> {
  const setupDevice = getSetupDevice(device);
  if (!setupDevice) {
    throw new Error(`Unknown device "${device}".`);
  }

  const patterns = setupDevice.firmwarePatterns[role] ?? [];
  if (patterns.length === 0) {
    throw new Error(`Firmware downloads are not configured for ${device} (${role}).`);
  }

  const tag = buildReleaseTag(role, version);
  const response = await fetch(`https://api.github.com/repos/${MESHCORE_GITHUB_REPO}/releases/tags/${tag}`, {
    headers: GITHUB_HEADERS,
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`MeshCore release "${tag}" was not found on GitHub.`);
  }

  const release = (await response.json()) as GitHubRelease;
  const asset = pickFirmwareAsset(release.assets, patterns, setupDevice.firmwareFormat);
  if (!asset) {
    throw new Error(`No firmware ${setupDevice.firmwareFormat} found for ${device} in release "${tag}".`);
  }

  const resolvedVersion = versionFromReleaseTag(role, release.tag_name) ?? normalizeFirmwareVersionInput(version);

  return {
    tag: release.tag_name,
    version: resolvedVersion,
    fileName: asset.name,
    downloadUrl: asset.browser_download_url,
    format: setupDevice.firmwareFormat,
  };
}

export function isAllowedMeshCoreDownloadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "github.com" || parsed.hostname === "release-assets.githubusercontent.com") &&
      (parsed.pathname.includes("/meshcore-dev/MeshCore/") ||
        parsed.hostname === "release-assets.githubusercontent.com")
    );
  } catch {
    return false;
  }
}

export { getSetupDevice, isSetupDeviceId, listSupportedSetupDevices } from "@/lib/setup-devices";
