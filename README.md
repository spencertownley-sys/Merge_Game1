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

Not yet done: Step 9's manual device pass and Lighthouse run, Step 10 deployment, and the
commissioned art. Photo personalization (Phase 1.5) is intentionally not started.

Dev-only URL flags (`npm run dev`): `?debug=shader` (shader orientation harness),
`?debug=fill` (all tier-5 drops, used by the smoke test), `?debug=tuning` (live physics panel).

## Development

```bash
npm install
npm run dev          # start the Vite dev server
npm run test         # run the unit/determinism test suite (Vitest)
npm run e2e          # Playwright: shader acceptance test, Classic run, Journey level
npm run lint          # ESLint
npm run format        # Prettier, writes changes
npm run build         # type-check + production build
```

No environment variables are required for Phase 1 — see `.env.example`. No backend, no auth, no
network calls: all persistence is client-side IndexedDB.
