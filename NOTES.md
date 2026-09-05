# Gulf Coast Mesh — rebuild notes

Snapshot of what was done in this session. The whole `development/` tree was
built from scratch — none of the original repo's source code is reused.

This file is the source of truth for the rebuild. The shorter `README.md`
is the public-facing project doc; if they disagree, **NOTES.md wins**.

## Quick start

```bash
cd development
npm install
npm run dev        # http://localhost:3000
npm run lint       # zero-warning gate
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

`npm install`, `npm run lint`, `npm run typecheck`, and `npm run build` all
exit cleanly with no warnings.

The only npm noise you may still see is `npm warn Unknown env config "devdir"`,
which comes from Cursor's sandbox env, not the project. It won't appear in a
normal terminal.

## Stack

| Layer        | Choice                                           |
| ------------ | ------------------------------------------------ |
| Framework    | **Next.js 16** (App Router, RSC, ISR)            |
| UI           | **React 19**                                     |
| Styling      | **Tailwind CSS 3.4** + CSS custom properties     |
| Language     | **TypeScript 5.7**                               |
| Linter       | **ESLint 9** (flat config, native `eslint-config-next` exports) |
| Icons        | `lucide-react`                                   |
| Fonts        | Inter (body), Space Grotesk (display), JetBrains Mono (mono) |
| Node engine  | `>=20.9.0`                                       |

## Design language

Defined in `tailwind.config.ts` + `app/globals.css`.

The site is a non-profit public-information site first. Structure, type and
data carry the page; ornament is deliberate and scoped. The 2026 redesign
removed the glass/gradient/glow layer the site had accumulated, then added a
single technical texture back in two places on purpose.

- **Palettes are sampled from `public/logo.svg`.** `gulf` runs from the logo's
  bright cyan-teal (`#49c7cc`) and mint (`#6ed7c8`) down to its deep teal
  (`#0d6070`) and hull navies. `ink` is a navy-tinted neutral built on the same
  logo navies, so the greys read as brand rather than as grey. `sand` is
  **status only** (advisories, "planned"); `coral` is errors.
- **Three accent tokens, because one value cannot do all three jobs at brand
  brightness:**
  - `--accent` — small text (links, 11px labels). The brightest point on the
    logo's hue that still clears AA 4.5:1 on white.
  - `--accent-bright` — display type only, which needs just 3:1, so headline
    highlights go brighter than body copy is allowed to.
  - `--accent-solid` — button fills. Always pairs with `ink-950` text (6.3:1);
    white on a fill this bright would fail. Hover goes brighter, not darker.
- **Other theme variables**: `--bg`, `--bg-elevated`, `--bg-sunken`, `--fg`,
  `--fg-muted`, `--line`, `--line-strong`. Light mode uses a pure `#ffffff` canvas
  with `#f8fafc` sunken tones and `#e2e8f0` crisp slate borders; dark mode uses
  deep obsidian slate `#0b0f19` canvas, `#111827` elevated surfaces, and `#1f2937` borders.
- **Background & Surfaces**: The site uses clean, natural contrast without artificial
  mathematical grid lines (`.grid-tech`) or radial glow blobs (`.wash-brand`).
  Surfaces (`surface`, `tile`) feature crisp 1px borders, solid fills, and no synthetic glass/backdrop blur.
- **Buttons & Badges**:
  - `btn-primary` (brand fill, dark ink) and `btn-ghost` (bordered).
  - `.badge` and `.badge-accent` for technical hardware and frequency specifications (`915 MHz`, `MeshCore`, `Open Source`).
  - Steady status indicators instead of distracting pulsating radar dots.
- **Homepage Structure**:
  - Authoritative hero copy focused on community and storm resilience.
  - Live network telemetry and framed live explorer embed.
  - "How It Actually Works" explaining 915 MHz ISM radio, multi-hop mesh routing, and hurricane resilience.
  - Real hardware pathways (Companion Radio, Solar Rooftop Repeater, Room Server & Base Station).
  - Community spotlight on the weekly Monday Voice Net (8:00 PM CST on Discord).
  - Regional coverage directory with node counts and repeater hosting invitations.
- **Type**: `font-display` (Space Grotesk) headings, `font-sans` body,
  `font-mono` for data, badges, and technical specs. Figures use `.tabular`.

## Pages

| Route           | What it is                                                |
| --------------- | --------------------------------------------------------- |
| `/`             | Homepage: live-stats hero, embedded Meshcore Analyzer, Meshcore stack snapshot, regions, "how it works", CTA |
| `/meshmap`      | Two embedded live views (Meshcore Analyzer, Meshtastic Meshview) + MQTT setup |
| `/links`        | Curated docs/community/upstream resources                 |
| `/emailsignup`  | Newsletter signup (Listmonk-backed)                       |
| `/mesh-monitor` | Reserve prefix, duplicate detection, network reports (sections) |

`app/icon.svg` ships as the favicon.

## Mesh Monitor API

`lib/mesh-monitor.ts` fetches public routes from
[meshbuddy.gulfcoastmesh.org](https://meshbuddy.gulfcoastmesh.org) (`/api/reports`,
`/api/duplicates`, `/api/status`). Contract lives in `API.md` + `openapi.yaml`.
Override base URL locally with `MESH_MONITOR_API_BASE` (defaults to production).

## Live data

`lib/mesh-stats.ts` is a server-only module that:

- Fetches `https://explorer.gulfcoastmesh.org/api/nodes` and `/stats`.
- Buckets nodes by US state (LA/MS/AL/FL/TX), separates active vs total, and
  reports counts for **repeaters** and **room servers only**. Companion
  devices are intentionally not tracked — they're end-user gear, not network
  infrastructure, so the site doesn't surface their counts.
- Wraps both in `revalidate: 300` (ISR, 5 minutes) with safe fallbacks if
  either endpoint blips.

It exports `getMeshStats()` and a small `fmt()` formatter. The homepage and
regions strip consume it. If the upstream API is unreachable at build/render
time the page degrades to copy-only ("Live on the bayou") instead of fake
numbers.

State buckets are approximate lat/lon rectangles. The LA→MS boundary follows
the Pearl River at roughly `lon = -89.7` (previous bucket was broken — MS
collapsed to a sliver, so coastal MS nodes got mis-classified as LA).

## Embedded maps

`components/live-map.tsx` is a reusable iframe wrapper with:

- Loading skeleton + animated compass spinner.
- `onError` fallback that points to an "Open in new tab" CTA so the page
  never gets stuck showing a dead white square.
- Configurable `aspect` so we can use a tall hero embed (16/11) and wider
  full-page embeds (2/1) on `/meshmap`.

Embeds used:

- `https://analyzer.gulfcoastmesh.org/#/live` on `/` (hero) and `/meshmap` (primary Meshcore view — live packet analyzer with channels, traces, observers, perf).
- `https://meshview.gulfcoastmesh.org/chat` on `/meshmap` (Meshtastic footprint).

The old `https://explorer.gulfcoastmesh.org/` embed has been removed from
the user-facing surface entirely — it is **no longer iframed anywhere**.
The Explorer API at `explorer.gulfcoastmesh.org/api/nodes` and `/stats`
is still consumed by `lib/mesh-stats.ts` as the data source for the
homepage stats strip, since the analyzer doesn't expose those aggregates
through a JSON endpoint.

Meshview is confirmed not to send `X-Frame-Options: DENY`. If the
analyzer ever rejects framing the `LiveMap` component already falls back
to an "Open in new tab" CTA.

## Theme handling

- `lib/theme.ts` exposes `useTheme()`. Internally it uses
  `useSyncExternalStore` so React 19 doesn't yell about `setState` in
  `useEffect`. It subscribes to `localStorage` (cross-tab sync) and the
  `prefers-color-scheme` media query.
- `components/theme-script.tsx` is the inline script that runs before paint
  to apply the right `light` / `dark` class on `<html>`, killing FOUC.
- `components/theme-toggle.tsx` is the sun/moon button itself.
- `components/site-header.tsx` mounts the toggle in the floating nav.

## Tooling fixes that took real work

1. **`next lint` is gone in Next 16** — replaced with
   `eslint . --max-warnings 0` in `package.json`.
2. **ESLint 9 flat config + `eslint-config-next`** — `FlatCompat` choked with
   a circular-JSON error. Fixed by importing the native flat entries directly:
   ```js
   import next from "eslint-config-next";
   import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
   import nextTypescript from "eslint-config-next/typescript";
   ```
3. **`tsconfig.json`** explicitly pins `"jsx": "react-jsx"` so Next stops
   rewriting it on every build.
4. **`npm audit`** shows transitive `postcss` advisories from inside
   `next`'s dep tree. Not directly fixable from here; ride out the next Next
   patch.

## Footer / nav / branding

- New SVG mark used in both the header and footer (rounded ring + signal arc).
- Footer now links to **Live maps**, **Resources**, **Newsletter**, and
  **Transparency** (`docs.gulfcoastmesh.org/transparency/`).
- GitHub link in both header and footer points at the
  [`GulfCoastMesh`](https://github.com/GulfCoastMesh) org (footer goes
  directly to the `Website` repo).
- Contact text, Heltec partner logo, Ko-fi support link all preserved from
  the original site.

## Honesty edits

User asked to stop overselling the network. The current line:

- Hero eyebrow now reads `"<N> nodes live · expanding the Gulf"` (real count
  from explorer API), instead of pretending coverage exists everywhere.
- Regions strip shows the real per-state count when nodes exist there.
  Louisiana and **Mississippi Coast** are flagged as live (Mississippi has
  a `forceLive: true` override in `app/page.tsx`); TX / AL / FL still show
  `Coming soon` until nodes appear.
- "How it works" links to actual `docs.gulfcoastmesh.org` pages instead of
  generic placeholders.
- Footer / hero CTAs mention the **Weekly Monday voice net on Discord** so
  the next-step is concrete, not vague "join the community".

## Homepage stack positioning

The homepage now positions **Meshcore** as the primary stack:

- Hero "Stack" pill row shows Meshcore / LoRa 915 MHz / End-to-end (no
  Meshtastic pill).
- The dark "Stack snapshot" inset card is Meshcore-only — heading is just
  "Meshcore" with a single `ProtocolCard`.
- `/meshmap` still shows **both** networks side by side: "MeshCore — Explorer"
  as the primary embed and "Meshtastic — Meshview" as the secondary one.
- `/links` still references upstream Meshtastic resources
  (`meshtastic.org`, the web-flasher, the Meshtastic docs).

So Meshtastic is intentionally **off the homepage stack pitch** but still
documented on the maps and resources pages.

## Newsletter signup

`/emailsignup` is wired up to **Listmonk** at
`https://lists.gulfcoastmesh.org/subscription/form` (POST, `no-cors`). Two
list IDs live at the top of `app/emailsignup/page.tsx`:

- `ALERTS_LIST_ID` — required, posted on every submit.
- `NEWS_LIST_ID` — opt-in via the "Also send me weekly news" checkbox.

If the list ever moves to a different Listmonk host or new IDs, those two
constants and the `fetch()` URL are the only things to change.

## Things I didn't touch (decisions to make later)

- **Meshview node count**: explorer's API gives us numbers, but meshview has
  its own user list at `/chat`. Not currently fetched. Could be added to
  `lib/mesh-stats.ts` if you want a "Meshview users online: N" stat.
- **Open Graph image** — `app/icon.svg` is the favicon; no `opengraph-image`
  is generated. Easy add later.
- **`Current/`** (the original site at the repo root) was **not** modified.
  Only `package.json` / `package-lock.json` / `tsconfig.json` show in
  `git status` from the original session's `npm install`.

## File map of the new app

```
development/
├─ app/
│  ├─ emailsignup/page.tsx
│  ├─ links/page.tsx
│  ├─ meshmap/page.tsx
│  ├─ globals.css
│  ├─ icon.svg
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  ├─ live-map.tsx
│  ├─ site-footer.tsx
│  ├─ site-header.tsx
│  ├─ theme-script.tsx
│  └─ theme-toggle.tsx
├─ lib/
│  ├─ mesh-stats.ts
│  └─ theme.ts
├─ public/  (static assets if/when needed)
├─ eslint.config.mjs
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
├─ tailwind.config.ts
├─ tsconfig.json
├─ README.md
└─ NOTES.md   ← you are here
```
