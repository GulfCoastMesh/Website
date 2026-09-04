import "server-only";

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Element, Root } from "hast";
import { getPageMeta } from "./docs-nav";

// Sanitization schema: extend the default safe-HTML allowlist to keep the few
// extras our pipeline adds (lazy-loading on <img>, anchor classes on heading
// links). Anything not in this schema -- script, iframe, style, on* handlers,
// javascript: URLs, etc. -- is stripped by rehype-sanitize. This is the
// belt-and-suspenders against a compromised docs repo; the CSP is the belt.
const docsSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      "loading",
      "decoding",
    ],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ["className", "doc-heading-anchor"],
    ],
  },
};

export {
  getDocsNav,
  getAllSlugs,
  getAdjacentPages,
  getPageMeta,
  type DocPageMeta,
  type DocSection,
} from "./docs-nav";

const DOCS_REPO_RAW =
  "https://raw.githubusercontent.com/GulfCoastMesh/louisianameshcommunity.github.io/main/docs";

// rehype plugin: rewrite relative image refs (e.g. `img/foo.png` or
// `./img/foo.png`) to absolute raw.githubusercontent URLs in the docs repo,
// and rewrite relative `.md` links (`foo.md`, `bar.md#section`) to internal
// `/docs/foo` routes. External (http/https) URLs are left alone.
function rewriteAssets() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "img") {
        const src = node.properties?.src;
        if (typeof src === "string" && !isAbsoluteUrl(src) && !src.startsWith("/")) {
          const cleaned = src.replace(/^\.\//, "");
          node.properties = {
            ...(node.properties ?? {}),
            src: `${DOCS_REPO_RAW}/${cleaned}`,
            loading: "lazy",
            decoding: "async",
          };
        }
      }

      if (node.tagName === "a") {
        const href = node.properties?.href;
        if (typeof href === "string" && !isAbsoluteUrl(href) && !href.startsWith("/") && !href.startsWith("#")) {
          const cleaned = href.replace(/^\.\//, "");
          const mdMatch = cleaned.match(/^([^#?]+?)\.md(#.*)?$/);
          if (mdMatch) {
            const targetSlug = mdMatch[1];
            const hash = mdMatch[2] ?? "";
            const internalPath = targetSlug === "index" ? "/docs" : `/docs/${targetSlug}`;
            node.properties = {
              ...(node.properties ?? {}),
              href: `${internalPath}${hash}`,
            };
          } else if (cleaned.startsWith("img/")) {
            node.properties = {
              ...(node.properties ?? {}),
              href: `${DOCS_REPO_RAW}/${cleaned}`,
            };
          }
        }
      }
    });
  };
}

function isAbsoluteUrl(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}

async function renderMarkdown(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rewriteAssets)
    .use(rehypeSanitize, docsSanitizeSchema)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: { className: ["doc-heading-anchor"] },
    })
    .use(rehypeStringify, { allowDangerousHtml: false })
    .process(md);
  return String(file);
}

// Extract the first H1 from raw markdown so we can use it as the page title
// (the MkDocs nav title is human-friendly but the page header is the H1).
function extractH1(md: string): string | null {
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) return m[1].trim();
  }
  return null;
}

export type DocPage = {
  slug: string;
  title: string;
  html: string;
};

export async function getDocPage(slug: string): Promise<DocPage | null> {
  const meta = await getPageMeta(slug);
  if (!meta) return null;

  const url = `${DOCS_REPO_RAW}/${slug}.md`;
  const res = await fetch(url, {
    next: { revalidate: 3600, tags: ["docs", `docs:${slug}`] },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const md = await res.text();
  const html = await renderMarkdown(md);
  const title = extractH1(md) ?? meta.title;

  return { slug, title, html };
}
