// Pure nav metadata for /docs. Safe to import from both server and client
// components — no fetch, no markdown pipeline, no `server-only` marker.
// The server-side rendering pipeline lives in `lib/docs.ts`.
//
// Mirrors mkdocs.yml at
// https://github.com/GulfCoastMesh/louisianameshcommunity.github.io/blob/main/mkdocs.yml

export type DocPageMeta = {
  slug: string;
  title: string;
};

export type DocSection = {
  title: string;
  pages: DocPageMeta[];
};

export const DOCS_HOME: DocPageMeta = {
  slug: "index",
  title: "Home",
};

export const DOCS_NAV: readonly DocSection[] = [
  {
    title: "Local Settings & Information",
    pages: [
      { slug: "freq-settings", title: "MeshCore frequency settings (Louisiana)" },
      { slug: "channels", title: "MeshCore channels (Louisiana)" },
    ],
  },
  {
    title: "Hardware & Guides",
    pages: [
      { slug: "devicerecs", title: "What device should I buy?" },
      { slug: "antenna", title: "What antenna should I use?" },
      { slug: "diy-repeater-builds", title: "Our standard repeater build" },
    ],
  },
  {
    title: "Setup Guides",
    pages: [
      { slug: "setting-up-meshcore-companion", title: "Setting up a MeshCore companion" },
      { slug: "setting-up-meshcore-observer", title: "Setting up a MeshCore observer" },
      { slug: "meshcore-repeater-setup", title: "Setting up a MeshCore repeater" },
    ],
  },
  {
    title: "Tips & Tricks",
    pages: [
      { slug: "change-repeater-public-key", title: "Change a repeater public key" },
      { slug: "estimate-coverage-with-meshmapper", title: "Estimate coverage with Meshmapper" },
    ],
  },
  {
    title: "Community",
    pages: [{ slug: "transparency", title: "Community transparency" }],
  },
];

const FLAT_PAGES: DocPageMeta[] = DOCS_NAV.flatMap((section) => section.pages);

const PAGE_BY_SLUG: Map<string, DocPageMeta> = new Map(
  [DOCS_HOME, ...FLAT_PAGES].map((p) => [p.slug, p]),
);

export function getAllSlugs(): string[] {
  return FLAT_PAGES.map((p) => p.slug);
}

export function getPageMeta(slug: string): DocPageMeta | undefined {
  return PAGE_BY_SLUG.get(slug);
}

export function getAdjacentPages(slug: string): {
  prev: DocPageMeta | null;
  next: DocPageMeta | null;
} {
  const idx = FLAT_PAGES.findIndex((p) => p.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? FLAT_PAGES[idx - 1] : DOCS_HOME,
    next: idx < FLAT_PAGES.length - 1 ? FLAT_PAGES[idx + 1] : null,
  };
}
