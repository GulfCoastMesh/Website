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
  page.tsx              Homepage (mission, live network panel with map + stats, what we do, get started, coverage, get involved)
  meshmap/page.tsx      Live maps (Meshcore Analyzer + Meshtastic Meshview) and MQTT instructions
  links/page.tsx        Curated guides, community, and upstream resources
  emailsignup/page.tsx  Newsletter signup (Listmonk-backed)
  mesh-monitor/page.tsx Mesh monitoring: reserve, duplicates, network reports
  globals.css           Design tokens, surface/utility classes
  icon.svg              Browser tab icon
components/
  site-header.tsx       Sticky solid nav with GitHub + theme toggle
  site-footer.tsx       Four-column footer with supporters/partners
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

- **Type**: Inter (UI), Space Grotesk (display), JetBrains Mono (data + labels).
- **Color**: sampled from `public/logo.svg` — bright gulf teal on navy-tinted
  neutrals. Warm sand is reserved for status, never decoration.
- **Contrast**: three accent tokens split the small-text / display / button-fill
  jobs so brand brightness never costs legibility. All pairs clear WCAG AA.
- **Surfaces**: flat 1px-bordered cards (`.surface`, `.tile`) — no glass,
  no glow.
- **Texture**: one masked grid + wash band, declared once in the root layout.
- **Motion**: pre-paint theme bootstrap (no flash), `fade-up`, and a live dot
  on genuinely live data. `prefers-reduced-motion` honored.
- **Accessibility**: skip link, focus rings, semantic landmarks, tabular
  numerals on data.

See [`NOTES.md`](./NOTES.md) for the full token list and the reasoning.
