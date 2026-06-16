# Gulf Coast Mesh — Website

A modern, sleek marketing/info site for the Gulf Coast Mesh community. Built
with **Next.js 16 (App Router)**, **React 19**, **Tailwind v3**, and
**TypeScript 5**.

> For the full design + decisions log see [`NOTES.md`](./NOTES.md). If the two
> files ever disagree, `NOTES.md` is the source of truth.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with Turbopack (default in Next 16) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals` + `next/typescript`) |
| `npm run typecheck` | `tsc --noEmit` |

## Project layout

```
app/
  layout.tsx            Root layout: fonts, theme bootstrap, header, footer
  page.tsx              Homepage (hero with embedded Analyzer, live stats, network bento, Meshcore stack snapshot, how-it-works, regions)
  meshmap/page.tsx      Live maps (Meshcore Analyzer + Meshtastic Meshview) and MQTT instructions
  links/page.tsx        Curated guides, community, and upstream resources
  emailsignup/page.tsx  Newsletter signup (Listmonk-backed)
  mesh-monitor/page.tsx Mesh monitoring: reserve, duplicates, network reports
  globals.css           Design tokens, surface/utility classes
  icon.svg              Browser tab icon
components/
  site-header.tsx       Floating glass nav with GitHub + theme toggle
  site-footer.tsx       Multi-column footer with supporters/partners
  theme-toggle.tsx      Light/dark switcher button
  theme-script.tsx      Inline pre-paint script (no FOUC)
  live-map.tsx          iframe wrapper for embedded maps (skeleton + error fallback)
lib/
  theme.ts              useTheme hook with localStorage persistence
  mesh-stats.ts         Server-only Explorer API fetcher (ISR, 5 min)
  mesh-monitor.ts       Server-only Mesh Monitor API fetcher (ISR, 5 min)
  meetings.ts           Server-only published meetings API fetcher
tailwind.config.ts      Design tokens (gulf, sand, ink palettes; display sizes)
eslint.config.mjs       Flat ESLint config wrapping next/core-web-vitals + next/typescript
```

## Design language

- **Type**: Inter (UI), Space Grotesk (display), JetBrains Mono (eyebrows / monospace details).
- **Color**: deep ink navy, vibrant gulf teal/cyan, warm sand amber, coral accents.
- **Surfaces**: subtle glass cards (`.surface`, `.surface-strong`, `.tile`, `.tile-accent`).
- **Motion**: pre-paint theme bootstrap (no flash), gentle hover lifts, animated skeleton on map embeds.
- **Accessibility**: focus rings, `prefers-reduced-motion` honored, semantic landmarks.

## Replacing content

- **Newsletter** — list IDs and Listmonk endpoint live at the top of `app/emailsignup/page.tsx` (`ALERTS_LIST_ID`, `NEWS_LIST_ID`, and the `fetch()` URL).
- **Supporters / partners** — individual supporters in `components/site-footer.tsx`; partner logos in `lib/partners.ts` with host logos in `public/supporters/`.
- **Hero copy, stats, regions, how-it-works** — `app/page.tsx`. Regions support a `forceLive: true` flag to show as live even when the upstream API count is zero (currently used for Mississippi).
- **GitHub org link** — `components/site-header.tsx` and `components/site-footer.tsx` both point at [`github.com/GulfCoastMesh`](https://github.com/GulfCoastMesh).
- **Mesh Monitor API** — [`API.md`](./API.md) and [`openapi.yaml`](./openapi.yaml) document the API. `/mesh-monitor` hosts reserve, duplicates, and network reports (proxied via `app/api/mesh-monitor/*` and `lib/mesh-monitor.ts`).
- **Setup wizard** — repeater flow in `app/setup/page.tsx` reserves MeshBuddy prefixes via `/api/meshbuddy/*` (proxies to `MESHBUDDY_API_BASE_URL`, default `https://meshbuddy.gulfcoastmesh.org`). Email is required for reservation; firmware versions come from MeshCore GitHub releases.
