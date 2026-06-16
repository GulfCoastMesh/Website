import Link from "next/link";
import { Activity, Copy, Radio, Search } from "lucide-react";

import { MeshMonitorDuplicatesSection } from "@/components/mesh-monitor-duplicates-section";
import { MeshMonitorLookupSection } from "@/components/mesh-monitor-lookup-section";
import { MeshMonitorReportsSection } from "@/components/mesh-monitor-reports-section";
import { MeshMonitorReserveForm } from "@/components/mesh-monitor-reserve-form";
import { MeshMonitorSectionNav } from "@/components/mesh-monitor-section-nav";
import { getDuplicates, getNetworkReport } from "@/lib/mesh-monitor";

export const metadata = {
  title: "Mesh monitoring",
  description:
    "Reserve a repeater prefix, check duplicate prefixes, and view Gulf Coast Mesh network health reports.",
};

export const revalidate = 300;

export default async function MeshMonitorPage() {
  const [{ ok: reportsOk, report }, { ok: dupOk, data: duplicates }] = await Promise.all([
    getNetworkReport(),
    getDuplicates(),
  ]);

  return (
    <div className="container pb-24">
      <header className="mx-auto max-w-3xl text-center">
        <span className="eyebrow mx-auto">
          <Radio className="h-3.5 w-3.5" aria-hidden />
          Mesh monitor
        </span>
        <h1 className="mt-5 font-display text-display-xl font-semibold tracking-tight text-balance text-ink-900 dark:text-white">
          Mesh monitoring &amp; reserve
        </h1>
        <p className="mt-5 text-pretty text-lg text-ink-600 dark:text-ink-300">
          Claim a repeater prefix, check for conflicts, and see which nodes need attention — all on
          gulfcoastmesh.org, backed by the live Mesh Monitor API.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-5xl">
        <MeshMonitorSectionNav />

        <section id="reserve" className="scroll-mt-32">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
            Reserve a prefix
          </h2>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
            Claim a hex prefix for your MeshCore repeater before deployment. Reservations are
            reviewed by network admins.
          </p>
          <div className="mt-8">
            <MeshMonitorReserveForm />
          </div>
        </section>

        <section id="lookup" className="scroll-mt-32 mt-20 border-t pt-16 dark:border-white/10">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
            <Search className="h-6 w-6 text-gulf-600 dark:text-gulf-300" aria-hidden />
            My prefixes
          </h2>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
            Look up prefixes reserved or deployed under your contact email.
          </p>
          <div className="mt-8">
            <MeshMonitorLookupSection />
          </div>
        </section>

        <section id="duplicates" className="scroll-mt-32 mt-20 border-t pt-16 dark:border-white/10">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
            <Copy className="h-6 w-6 text-gulf-600 dark:text-gulf-300" aria-hidden />
            Duplicate prefixes
          </h2>
          <div className="mt-6">
            <MeshMonitorDuplicatesSection ok={dupOk} data={duplicates} />
          </div>
        </section>

        <section id="reports" className="scroll-mt-32 mt-20 border-t pt-16 dark:border-white/10">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
            <Activity className="h-6 w-6 text-gulf-600 dark:text-gulf-300" aria-hidden />
            Network reports
          </h2>
          <div className="mt-6">
            <MeshMonitorReportsSection ok={reportsOk} report={report} />
          </div>
        </section>
      </div>

      <p className="mt-16 text-center text-sm text-ink-500 dark:text-ink-400">
        <Link href="/" className="font-medium text-gulf-700 hover:underline dark:text-gulf-300">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
