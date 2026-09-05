import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getDocPage } from "@/lib/docs";

export const revalidate = 3600;

export const metadata = {
  title: "Docs",
  description:
    "Field guides, hardware recommendations, and setup walkthroughs for the Gulf Coast Mesh.",
};

const LEGACY_DOCS_URL = "https://docs.gulfcoastmesh.org";

export default async function DocsIndexPage() {
  const page = await getDocPage("index");

  return (
    <article>
      <header className="mb-10">
        <span className="eyebrow">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Documentation
        </span>
        <h1 className="mt-5 font-display text-display-lg font-semibold tracking-tight text-balance text-ink-900 dark:text-white">
          Gulf Coast Mesh docs.
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg text-ink-600 dark:text-ink-300">
          Frequency settings, channel layouts, hardware picks, and step-by-step setup guides. Synced
          from our community docs repository within seconds of a change.
        </p>
        <div className="mt-6" />
      </header>

      {page ? (
        <div
          className="prose-mesh"
          dangerouslySetInnerHTML={{ __html: page.html }}
        />
      ) : (
        <p className="text-ink-600 dark:text-ink-300">
          The docs index isn&apos;t available right now. Try{" "}
          <a
            href={LEGACY_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gulf-700 underline-offset-2 hover:underline dark:text-gulf-300"
          >
            the MkDocs site
          </a>{" "}
          while we get this back online.
        </p>
      )}

      <p className="mt-12 text-sm text-ink-500 dark:text-ink-400">
        <Link href="/" className="font-medium text-gulf-700 hover:underline dark:text-gulf-300">
          ← Back to home
        </Link>
      </p>
    </article>
  );
}
