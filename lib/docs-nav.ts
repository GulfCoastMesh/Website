import "server-only";

import { load as parseYaml } from "js-yaml";

// Nav structure is fetched live from mkdocs.yml on every request (subject to
// the ISR window below, and instantly on webhook-triggered revalidation --
// see app/api/revalidate-docs/route.ts) so new/renamed docs pages show up
// without a code deploy.
const MKDOCS_YML_URL =
  "https://raw.githubusercontent.com/GulfCoastMesh/louisianameshcommunity.github.io/main/mkdocs.yml";

export type DocPageMeta = {
  slug: string;
  title: string;
};

export type DocSection = {
  title: string;
  pages: DocPageMeta[];
};

type DocsNav = {
  home: DocPageMeta;
  sections: DocSection[];
};

// mkdocs.yml nav shape: a list of single-key maps, where the value is either
// a "slug.md" string (a standalone page) or a nested list of the same shape
// (a section of pages).
type MkDocsNavNode = string | MkDocsNavNode[] | MkDocsNavMap;
interface MkDocsNavMap {
  [key: string]: MkDocsNavNode;
}

function toSlug(mdPath: string): string {
  return mdPath.replace(/\.md$/, "");
}

function parseNav(raw: unknown): DocsNav {
  const entries = raw as Array<Record<string, MkDocsNavNode>>;
  let home: DocPageMeta | null = null;
  const sections: DocSection[] = [];

  for (const entry of entries) {
    const [title, value] = Object.entries(entry)[0];

    if (typeof value === "string") {
      const page: DocPageMeta = { slug: toSlug(value), title };
      if (page.slug === "index") {
        home = page;
      } else {
        sections.push({ title, pages: [page] });
      }
      continue;
    }

    if (Array.isArray(value)) {
      const pages = (value as Array<Record<string, string>>).map((item) => {
        const [pageTitle, mdPath] = Object.entries(item)[0];
        return { slug: toSlug(mdPath), title: pageTitle };
      });
      sections.push({ title, pages });
    }
  }

  if (!home) throw new Error("mkdocs.yml nav has no Home/index.md entry");
  return { home, sections };
}

export async function getDocsNav(): Promise<DocsNav> {
  const res = await fetch(MKDOCS_YML_URL, {
    next: { revalidate: 3600, tags: ["docs", "docs:nav"] },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch mkdocs.yml: ${res.status} ${res.statusText}`);
  }

  const yaml = parseYaml(await res.text()) as { nav: unknown };
  return parseNav(yaml.nav);
}

export async function getAllSlugs(): Promise<string[]> {
  const { sections } = await getDocsNav();
  return sections.flatMap((section) => section.pages.map((p) => p.slug));
}

export async function getPageMeta(slug: string): Promise<DocPageMeta | undefined> {
  const { home, sections } = await getDocsNav();
  if (slug === "index") return home;
  for (const section of sections) {
    const page = section.pages.find((p) => p.slug === slug);
    if (page) return page;
  }
  return undefined;
}

export async function getAdjacentPages(slug: string): Promise<{
  prev: DocPageMeta | null;
  next: DocPageMeta | null;
}> {
  const { home, sections } = await getDocsNav();
  const flat = sections.flatMap((section) => section.pages);
  const idx = flat.findIndex((p) => p.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flat[idx - 1] : home,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}
