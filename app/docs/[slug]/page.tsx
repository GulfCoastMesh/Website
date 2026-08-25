import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { getAdjacentPages, getAllSlugs, getDocPage, getPageMeta } from "@/lib/docs";

export const revalidate = 3600;
// Not locked to build-time slugs: a slug added to mkdocs.yml after the last
// deploy still renders on first visit (and gets cached per `revalidate`
// above), so new docs pages don't need a redeploy to go live.

const DOCS_REPO_RAW_HTML =
  "https://github.com/GulfCoastMesh/louisianameshcommunity.github.io/blob/main/docs";

export async function generateStaticParams() {
  return (await getAllSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getPageMeta(slug);
  if (!meta) return { title: "Not found" };
  return {
    title: meta.title,
    description: `${meta.title} — Gulf Coast Mesh documentation.`,
  };
}

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = await getPageMeta(slug);
  if (!meta) notFound();

  const page = await getDocPage(slug);
  if (!page) notFound();

  const { prev, next } = await getAdjacentPages(slug);

  return (
    <article>
      <header className="mb-8">
        <p className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-gulf-700 dark:text-gulf-300">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Docs
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-balance text-ink-900 sm:text-display-lg dark:text-white">
          {page.title}
        </h1>

      </header>

      <div
        className="prose-mesh"
        dangerouslySetInnerHTML={{ __html: page.html }}
      />

      <nav
        aria-label="Docs pagination"
        className="mt-16 grid gap-4 border-t pt-8 sm:grid-cols-2"
        style={{ borderColor: "rgb(var(--line) / 0.6)" }}
      >
        {prev ? (
          <Link
            href={prev.slug === "index" ? "/docs" : `/docs/${prev.slug}`}
            className="group flex flex-col rounded-2xl border bg-white/60 px-5 py-4 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-ink-900/60 dark:hover:bg-ink-900/80"
            style={{ borderColor: "rgb(var(--line) / 0.6)" }}
          >
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
              <ArrowLeft className="h-3 w-3" aria-hidden />
              Previous
            </span>
            <span className="mt-2 font-display text-base font-semibold text-ink-900 dark:text-white">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/docs/${next.slug}`}
            className="group flex flex-col rounded-2xl border bg-white/60 px-5 py-4 text-right transition hover:-translate-y-0.5 hover:bg-white sm:items-end dark:border-white/10 dark:bg-ink-900/60 dark:hover:bg-ink-900/80"
            style={{ borderColor: "rgb(var(--line) / 0.6)" }}
          >
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
              Next
              <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
            <span className="mt-2 font-display text-base font-semibold text-ink-900 dark:text-white">
              {next.title}
            </span>
          </Link>
        ) : null}
      </nav>

      <p className="mt-12 text-sm text-ink-500 dark:text-ink-400">
        <Link href="/docs" className="font-medium text-gulf-700 hover:underline dark:text-gulf-300">
          ← All docs
        </Link>
      </p>
    </article>
  );
}
