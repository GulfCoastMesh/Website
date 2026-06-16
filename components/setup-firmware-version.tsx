"use client";

import { Loader2 } from "lucide-react";

type FirmwareVersionPickerProps = {
  versions: string[];
  latestVersion: string | null;
  loading: boolean;
  error: string;
  useLatest: boolean;
  selectedVersion: string;
  onUseLatestChange: (useLatest: boolean) => void;
  onSelectedVersionChange: (version: string) => void;
};

export function FirmwareVersionPicker({
  versions,
  latestVersion,
  loading,
  error,
  useLatest,
  selectedVersion,
  onUseLatestChange,
  onSelectedVersionChange,
}: FirmwareVersionPickerProps) {
  const inputClass =
    "w-full rounded-xl border bg-white/80 px-3 py-2.5 text-sm text-ink-900 outline-none transition focus:border-gulf-400 focus:ring-2 focus:ring-gulf-400/40 dark:bg-ink-900/60 dark:text-white";

  return (
    <div className="surface p-4 sm:p-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
        Firmware version
      </p>

      {loading ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading releases…
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-coral-500/40 bg-coral-500/10 px-3 py-2 text-xs text-coral-600 dark:text-coral-300">
          {error}
        </p>
      ) : null}

      {!loading && versions.length > 0 ? (
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition hover:border-gulf-400/40 dark:border-white/10">
            <input
              type="radio"
              name="firmware-version-mode"
              className="mt-1"
              checked={useLatest}
              onChange={() => onUseLatestChange(true)}
            />
            <span>
              <span className="block text-sm font-medium text-ink-900 dark:text-white">Latest release</span>
              <span className="mt-0.5 block font-mono text-xs text-ink-500 dark:text-ink-400">
                {latestVersion ? `v${latestVersion}` : "Unavailable"}
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition hover:border-gulf-400/40 dark:border-white/10">
            <input
              type="radio"
              name="firmware-version-mode"
              className="mt-1"
              checked={!useLatest}
              onChange={() => onUseLatestChange(false)}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink-900 dark:text-white">Choose a release</span>
              <select
                value={selectedVersion}
                disabled={useLatest}
                onChange={(e) => {
                  onUseLatestChange(false);
                  onSelectedVersionChange(e.target.value);
                }}
                className={`mt-2 ${inputClass}`}
                style={{ borderColor: "rgb(var(--line) / 0.7)" }}
              >
                {versions.map((version) => (
                  <option key={version} value={version}>
                    v{version}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}

export function resolvePickerFirmwareVersion({
  useLatest,
  latestVersion,
  selectedVersion,
}: {
  useLatest: boolean;
  latestVersion: string | null;
  selectedVersion: string;
}): string {
  if (useLatest) return latestVersion ?? selectedVersion;
  return selectedVersion;
}
