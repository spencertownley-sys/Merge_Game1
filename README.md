# Smoosh (working title)

A physics merge game (Suika/Fruit-Merge genre) set in a fully fictional pastel-watercolor-anime
fantasy world. Players drop light motes — rendered as translucent, glossy gummy-candy orbs — that
merge into bigger, brighter tiers, restoring color to a series of story "lands" on a Journey map.

## Start here

Read these in order before touching any code — they're the canonical source of truth, not this
README:

1. **`CLAUDE.md`** — how to build the app: stack, folder structure, and the step-by-step build
   plan this repo currently follows.
2. **`GAME_DESIGN_MERGE_TIERS.md`** — every gameplay number (physics, tiers, scoring, the merge
   rules, the sphere/gummy shader). If code and this doc disagree, the doc wins.
3. **`ART_AND_STORY_DIRECTION.md`** — visual style, the Journey story/lands, and the Higgsfield
   art-generation prompts for every tier and land.
4. `PRD.md`, `API_DESIGN.md`, `UI_UX_NOTES.md` — supporting product docs.

## Status

Steps 1-8 of the `CLAUDE.md` build plan are implemented:

- **Core loop** — seeded, deterministic Rapier2D physics in a Web Worker (fixed 1/120 s step),
  11 tiers, §5 merge rules, §6 scoring/combos, §7 game over. A determinism test replays the
  same seed + input log and asserts an identical final state.
- **Rendering** — PixiJS gummy-candy sphere shader (game design §9.3), gaze/settle/spin,
  impact squash, merge pop + coin-flip, rim styles for colour-free tier reading, and a
  simple-graphics fallback. Tier art is an original procedural placeholder until the
  commissioned pieces are dropped into `TIER_ART_URLS` (`src/render/coreArt.ts`).
- **Classic mode** — drag/release input with a ghost guide, HUD, pause, results, best score.
- **Journey mode** — 10 levels across Sunmeadow Hollow, Driftmoor Cove and Whisperwood
  (rock / ice / wind, drop and time limits, stars), a scrolling land map with the
  restored-palette shift, and a level intro card. Land art is a placeholder palette per land.
- **Share card** — 1080×1350 canvas PNG via the Web Share API with a download fallback.
- **Settings & PWA** — sound/music/haptics-placeholder/reduce-motion/simple-graphics/tier
  numbers, persisted in IndexedDB; installable with an offline service worker.

**Step 9 (QA)** — unit/determinism suite green; the in-browser determinism check
(`tests/e2e/determinism.spec.ts`) passes on Chromium and WebKit; E2E covers a full Classic
run, a Journey level completion and share-card generation; Lighthouse (mobile emulation,
production build, CPU-rendered headless Chromium): performance 0.77-0.82, accessibility 1.0,
best practices 1.0. Installability is
verified via the generated manifest + registered service worker (Lighthouse 12 dropped its
PWA category). Still owed: a hands-on pass on a real mid-range Android phone and iOS Safari.

**Step 10 (deployment)** — the build is host-agnostic (`VITE_BASE` sets the public path).
`.github/workflows/deploy-pages.yml` publishes `dist` to GitHub Pages on every push to
`main` once Pages is enabled in the repo settings with "Source: GitHub Actions". For
Vercel / Cloudflare Pages / Netlify, point the host at `npm run build` with output `dist`
and leave `VITE_BASE` unset. Verify offline play after the first load once installed.

Not yet done: the commissioned tier and land art. Photo personalization (Phase 1.5) is
intentionally not started.

**Admin back end (in-app, saved on the device)** — open it with `?admin=1` or by tapping the
title on the Home screen five times. It tunes the game feel live against a preview board:
fall speed, top speed, air drag, drop cooldown (Fall); grip and roll decay (Roll); bounce
(Bounce); landing squash width/height, jiggle length and wobble count, trigger speed, idle
jelly (Jiggle); visible roll, lean and gaze (Face motion). Presets: Design doc defaults, Fruit
Merge feel, Floaty, Bouncy. The Art tab switches the mote art style (Gummy glow / Watercolor
paper / Bold fruit) and takes custom image URLs per tier and per-land frame / backdrop art.
Tuning is persisted in IndexedDB and can be exported/imported as JSON; paste exported values
into `src/config/physics.ts` / `src/config/tuning.ts` to make them the shipped defaults.

**Land frames** — each level is framed by artwork for its land (`src/render/frame.ts`,
procedural until commissioned pieces exist; any land's frame can be replaced with an image from
the Admin screen). The frame dims with the land until the land is restored.

Dev-only URL flags (`npm run dev`): `?debug=shader` (shader orientation harness),
`?debug=fill` (all tier-5 drops, used by the smoke test), `?debug=tuning` (live physics panel),
`?debug=determinism` (in-browser replay check used by the cross-browser E2E).

## Development

```bash
npm install
npm run dev          # start the Vite dev server
npm run test         # run the unit/determinism test suite (Vitest)
npm run e2e          # Playwright (Chromium): shader acceptance, Classic run, Journey level, determinism
E2E_WEBKIT=1 npm run e2e   # also runs the determinism check on WebKit (npx playwright install webkit)
npm run lint          # ESLint
npm run format        # Prettier, writes changes
npm run build         # type-check + production build
```

No environment variables are required for Phase 1 — see `.env.example`. No backend, no auth, no
network calls: all persistence is client-side IndexedDB.
