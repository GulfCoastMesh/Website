import Link from "next/link";
import { AlertTriangle } from "lucide-react";

const SETTINGS_DOCS_HREF = "/docs/freq-settings";

export function SettingsChangeBanner() {
  return (
    <div className="container -mt-4 pb-4 sm:-mt-2 sm:pb-5">
      <div
        role="note"
        className="mx-auto flex max-w-6xl items-start gap-2.5 rounded-xl border border-sand-400/40 bg-sand-400/10 px-4 py-2.5 text-sm text-ink-700 sm:items-center sm:justify-center sm:text-center dark:text-ink-200"
        style={{ borderColor: "rgb(var(--line) / 0.5)" }}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sand-700 sm:mt-0 dark:text-sand-300" aria-hidden />
        <p>
          Our MeshCore settings changed to the network defaults on May 25, 2026. Please update your nodes
          and repeater settings if you have not already.{" "}
          <Link
            href={SETTINGS_DOCS_HREF}
            className="font-medium text-gulf-700 underline-offset-2 hover:underline dark:text-gulf-300"
          >
            See our docs
          </Link>
        </p>
      </div>
    </div>
  );
}
