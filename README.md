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

Currently on **CLAUDE.md Step 2** (config + core math) of 10. Config constants, seeded RNG, and
the spawn bag are implemented and unit-tested; the physics worker, rendering, and everything after
it are not yet built.

## Development

```bash
npm install
npm run dev          # start the Vite dev server
npm run test         # run the unit/determinism test suite (Vitest)
npm run lint          # ESLint
npm run format        # Prettier, writes changes
npm run build         # type-check + production build
```

No environment variables are required for Phase 1 — see `.env.example`. No backend, no auth, no
network calls: all persistence is client-side IndexedDB.
