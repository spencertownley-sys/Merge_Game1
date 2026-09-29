# CLAUDE.md — Smoosh

> This file is the primary instruction set for Claude Code. Read it fully before writing any code.
> Read `GAME_DESIGN_MERGE_TIERS.md` in the same repo before touching physics, tiers, scoring, or the sphere shader — every number there is canonical. Read `ART_AND_STORY_DIRECTION.md` before touching visual style or the Journey story/lands. This file is about how to build the app; those two are about what the game does and looks like.
> Repo: `github.com/spencertownley-sys/Merge_Game1`

---

## Project Overview

**What this app does:**
A physics merge game (Suika/Fruit-Merge genre), set in a fully fictional pastel-watercolor-anime fantasy world: players drop light motes that merge into bigger, brighter tiers, restoring color to a series of story "lands" as they progress through a Journey map. Includes a shareable result card. **Photo personalization (uploading real photos, face-fusion on merge) is a later, separately-built stage — free, not paid, but built after the core game rather than alongside it — and it is not part of this first build pass.** See "Out of Scope for This Build" below.

**Who it's for:**
Casual mobile/web gamers who want a few minutes of satisfying merge-game play wrapped in a gentle, storybook-style journey.

**MVP scope (Phase 1 from the PRD — build this first, nothing beyond it unless asked):**

- Core merge loop: drag/drop, 11 tiers, scoring, combos, game over — fully deterministic (seeded)
- Sphere-shaded ball rendering with gaze and idle "roll" animation
- Default Skylight-mote skin set, pastel watercolor anime style (per `ART_AND_STORY_DIRECTION.md` §2) — **the only skin set in this build**
- Journey mode: story-driven lands (starting with the low-stakes tutorial village, Sunmeadow Hollow), star ratings, per `ART_AND_STORY_DIRECTION.md` §4 and `GAME_DESIGN_MERGE_TIERS.md` §10
- Client-side shareable result card (canvas-rendered PNG)
- All persistence in IndexedDB — **no backend, no network calls required for any of this**
- Settings/accessibility toggles
- Installable as a PWA

**Explicitly NOT in this build** — see "Out of Scope for This Build" at the end. In particular: no photo upload, no face detection, no MediaPipe dependency, no skin editor UI. All of that is a later, still-free build stage once this core game and story are live.

---

## Stack

| Layer       | Technology                                                                                | Notes                                                                           |
| ----------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Frontend    | React 18 + TypeScript + Vite                                                              |                                                                                 |
| Rendering   | PixiJS (WebGL2)                                                                           | One `Mesh` per ball, shared shader program                                      |
| Physics     | `@dimforge/rapier2d` (WASM), run inside a Web Worker                                      | Fixed 1/120s timestep                                                           |
| State (UI)  | Zustand                                                                                   | Physics state stays in the worker; UI state (menus, settings, HUD) uses Zustand |
| Persistence | IndexedDB via `idb` (small wrapper lib)                                                   | See Tech Spec §2.1 for schema                                                   |
| Styling     | Tailwind CSS                                                                              |                                                                                 |
| PWA         | `vite-plugin-pwa`                                                                         |                                                                                 |
| Testing     | Vitest (unit/determinism), Playwright (E2E + visual)                                      |                                                                                 |
| Hosting     | Static build — deployable to Vercel/Cloudflare Pages, but build it deploy-target-agnostic |                                                                                 |

No backend, no database server, no auth in this build. Do not add Supabase or any server code — that is Phase 2 and out of scope here. **Do not add `@mediapipe/tasks-vision` or any face-detection dependency in this build** — that belongs to the Phase 1.5 add-on described at the end of this file, built separately later.

---

## File & Folder Structure

```
smoosh/
├── README.md
├── .env.example                      # empty in Phase 1 — no env vars required, keep the file as a placeholder
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── GAME_DESIGN_MERGE_TIERS.md        # copy the canonical game-design doc into the repo root
├── ART_AND_STORY_DIRECTION.md        # copy the canonical art/story doc into the repo root
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── config/
│   │   ├── physics.ts                # all constants from game design doc §2, nothing hardcoded elsewhere
│   │   ├── tiers.ts                  # tier table (§3) + radius formula
│   │   ├── scoring.ts                # scoring/combo formulas (§6)
│   │   └── brand.ts                  # app name, single source of truth — never hardcode "Smoosh" elsewhere
│   ├── engine/                        # everything that runs inside the physics Web Worker
│   │   ├── physics.worker.ts
│   │   ├── rng.ts                    # mulberry32 + Fisher-Yates shuffle bag, with named stream offsets
│   │   ├── spawnBag.ts
│   │   ├── mergeResolver.ts          # eligibility + deterministic resolution order (§5)
│   │   ├── gameOver.ts               # danger-line + grace-period logic (§7)
│   │   └── types.ts                  # shared worker<->main message types
│   ├── render/
│   │   ├── PixiStage.tsx
│   │   ├── ballShader.ts             # the GLSL from game design doc §9.3, plus the JS uniforms wiring
│   │   ├── orientation.ts            # gaze/settle/spin math (§9.2)
│   │   └── simpleSprite.ts           # flat-sprite fallback renderer
│   ├── skins/                        # PHASE 1.5 ONLY — do not create this folder in the initial build
│   │   ├── SkinRepository.ts         # implements the interface in API_DESIGN.md §2.1
│   │   ├── photoPipeline.ts          # EXIF decode -> landmark detect -> align/crop -> vignette (§8.4)
│   │   ├── fusionBlend.ts            # F0 (and F1 if time allows) blend implementations (§8.3)
│   │   └── faceLandmarker.ts         # lazy MediaPipe loader
│   ├── journey/
│   │   ├── levels/                   # one file per level or a single levels.json validated against the LevelDef schema (§10.4), organized by land
│   │   ├── JourneyMap.tsx
│   │   └── levelRuntime.ts           # obstacle/goal/hazard logic (§10.2-10.3)
│   ├── share/
│   │   └── shareCard.ts              # canvas-based card generation (§11)
│   ├── persistence/
│   │   ├── db.ts                     # IndexedDB setup (idb wrapper)
│   │   ├── RunRepository.ts
│   │   ├── JourneyRepository.ts
│   │   └── SettingsRepository.ts     # SkinRepository.ts here too, but only in Phase 1.5
│   ├── components/
│   │   ├── GameScreen.tsx
│   │   ├── HUD.tsx
│   │   ├── ResultsScreen.tsx
│   │   ├── JourneyMap.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── DevTuningPanel.tsx        # dev-only physics constant tuning, per game design doc §2
│   │                                  # SkinEditor.tsx belongs here too, but only in Phase 1.5
│   ├── hooks/
│   └── types/
│       └── index.ts                  # Run, MergeEvent, LevelDef, etc. (SkinSet/Photo types added in Phase 1.5)
├── public/
│   └── assets/                       # default tier + land art (pastel watercolor anime, per ART_AND_STORY_DIRECTION.md)
└── tests/
    ├── unit/
    ├── determinism/
    └── e2e/
```

---

## Build Steps

Follow these steps **in order**. Do not skip ahead. Read the relevant section of `GAME_DESIGN_MERGE_TIERS.md` before each step that touches gameplay numbers.

### Step 1: Project Scaffolding

- [ ] `npm create vite@latest` (React + TypeScript template)
- [ ] Install: `pixi.js`, `@dimforge/rapier2d`, `zustand`, `idb`, `tailwindcss`, `vite-plugin-pwa` — **do not install `@mediapipe/tasks-vision` in this build**, it belongs to the Phase 1.5 add-on
- [ ] Install dev deps: `vitest`, `@playwright/test`, ESLint + Prettier
- [ ] Set up `.env.example` (empty — no vars needed yet, just the file for Phase 2 forward-compatibility)
- [ ] Configure TypeScript strict mode
- [ ] Set up ESLint + Prettier

### Step 2: Config & Core Math (no rendering yet)

- [ ] Write `config/physics.ts`, `config/tiers.ts`, `config/scoring.ts` directly from game design doc §2, §3, §6 — copy the numbers exactly, don't approximate
- [ ] Write `engine/rng.ts` (mulberry32 + Fisher-Yates) with unit tests proving the same seed produces the same sequence
- [ ] Write `engine/spawnBag.ts` implementing the §4 bag logic, with unit tests for the bag composition and refill behavior
- [ ] Write scoring/combo unit tests against the exact table in §6

### Step 3: Physics Worker

- [ ] Set up Rapier2D in a Web Worker: static walls, fixed 1/120s timestep, the exact tuning values from §2
- [ ] Implement drop spawning (rail position, cooldown, tier from spawn bag)
- [ ] Implement `mergeResolver.ts`: eligibility rules and the deterministic resolution order from §5.1-§5.2 — this determinism is not optional, write a test that runs the same seed+input log twice and asserts identical final state
- [ ] Implement merge result creation (§5.3) and apex merge (§5.4)
- [ ] Implement game-over detection (§7)
- [ ] Worker posts per-frame transform snapshots (position, angle, tier, id) to the main thread

### Step 4: Rendering — Default Skins First

- [ ] Set up PixiJS stage sized to the 400×600 board (§2), scaled to fit the viewport, letterboxed
- [ ] Implement the ball shader from §9.3 exactly as given (translucent gummy-candy material — the `uCore`/`uGummyColor` uniforms, soft-glow blur, and refraction offset are the 2026-09-28 revision; don't build against an older opaque-decal version of this shader if you find one), with the uniforms wired per §9.4 defaults
- [ ] Implement `orientation.ts` (gaze, settle, spin, merge coin-flip) per §9.2
- [ ] Implement the impact squash-and-stretch animation per §9.2b — a render-only mesh transform on landing impact (physics collider stays a true circle throughout); balls are a perfect circle while falling or at rest
- [ ] **Acceptance test before moving on:** with a ball's rotation at identity, the default skin art must render upright and unmirrored, with the face reading as the sharp, bright center of the glow (not a printed decal); turning yaw positive must visibly move the "face" toward screen-right. Fix shader/matrix conventions until all hold — this is called out as a known risk in the game design doc.
- [ ] Commission or placeholder the 11 default tier art assets as translucent gummy-candy orbs per `ART_AND_STORY_DIRECTION.md` §2's Higgsfield prompts (original designs — see "Gotchas" below on IP)
- [ ] Implement the `simpleSprite.ts` fallback and the `graphicsQuality` setting toggle
- [ ] Wire HUD (score, best score, combo, next-ball preview, danger line)

### Step 5: Core Loop Playable End-to-End

- [ ] Drag-to-position + release-to-drop input, with the ghost guide line
- [ ] Results screen on game over
- [ ] Classic mode fully playable with default Skylight-mote skins — **this is the first real milestone. Get this feeling good before anything else.**
- [ ] Smoke test: play a full run start to game-over with no console errors

### Step 6: Journey Mode & Story

- [ ] Define the `LevelDef` schema (§10.4, updated `land` field) and author levels for the first 2-3 lands (Sunmeadow Hollow, Driftmoor Cove, Whisperwood) per the design intent table in game design doc §10.5, mapped onto the story beats in `ART_AND_STORY_DIRECTION.md` §4.3 — fill out further lands as content over time, not all 13 required for initial launch
- [ ] Journey map UI: story land nodes (locked/unlocked/completed-with-palette-shift per §4.2), stars, level intro screen showing goals/constraints and a line of story flavor text per land
- [ ] `levelRuntime.ts`: goal tracking (reachTier, score, mergeCount, clearObstacle, survive, apex), obstacles (rock, ice, wind), spawnBag overrides
- [ ] Star calculation per the rules in game design doc §10.5
- [ ] `JourneyRepository` persistence
- [ ] Land background/concept art: source the pastel watercolor anime pieces from `ART_AND_STORY_DIRECTION.md` §3 (or placeholder until the creator's Higgsfield assets are ready)

### Step 7: Share Card

- [ ] `shareCard.ts`: canvas render at 1080×1350 per game design doc §11 — score header, top ball, merge ancestry (from `mergeLog`), current land's story context
- [ ] Web Share API integration with PNG-download fallback

### Step 8: Settings, Accessibility, PWA

- [ ] Settings panel: sound, music, haptics-placeholder (no-op until native), reduce motion, simple graphics, show tier numbers
- [ ] Rim-style tier distinction (solid/dashed/double per §3) so tiers read without color — style the rim as a soft painted ring to match the watercolor look, per `ART_AND_STORY_DIRECTION.md` §2
- [ ] Touch targets ≥44px; one-handed portrait layout
- [ ] `vite-plugin-pwa` manifest + service worker for installability

### Step 9: Final QA Pass

- [ ] Full unit test suite green (tier math, scoring, RNG, spawn bag)
- [ ] Determinism test green across at least Chromium and WebKit via Playwright
- [ ] E2E: full run, journey level completion, share card generation
- [ ] Lighthouse: verify PWA installability and reasonable performance score
- [ ] Manual test on a real mid-range Android phone and iOS Safari (not just desktop Chrome)
- [ ] No hardcoded "Smoosh" outside `config/brand.ts`
- [ ] No console errors in a full playthrough

### Step 10: Deployment

- [ ] Static build (`vite build`) deployed to whichever static host the user has chosen (Vercel/Cloudflare Pages/etc. — this app has no backend-specific hosting requirement)
- [ ] Verify the deployed build works fully offline after first load once installed as a PWA

---

## Phase 1.5: Photo Fusion (free, private — build only when explicitly asked, as a second stage after Steps 1-10)

Everything below is a separate, later build stage — not paid, but still built after the core game and story rather than alongside them, so the core loop gets full attention first. Do not build any of this alongside Steps 1-10 above unless specifically told to.

- [ ] **Age + privacy interstitial:** a one-time screen shown the first time any player opens the skin editor, stating (a) this feature requires the player to be 18+, and (b) it is permanently private — nothing it produces ever leaves this device or appears anywhere another person could see it, including the share card. Stored in Settings/IndexedDB so it isn't shown again. The skin editor route is unreachable without confirming this. Free — no purchase or paywall.
- [ ] `photoPipeline.ts`: EXIF-correct decode, MediaPipe landmark detection, similarity-transform alignment, 512×512 crop, edge vignette (game design doc §8.4)
- [ ] Handle the no-face-detected path (center-crop + warning + manual pan/zoom)
- [ ] `SkinRepository` (IndexedDB-backed) implementing the interface in API_DESIGN.md §2.1 — **unlimited skin sets, unlimited photos per set**, no caps to enforce
- [ ] Skin editor UI: create a skin set, add/remove photos, preview on an actual rendered sphere before saving
- [ ] Ladder mode: per-tier photo assignment UI (tiers 1-11; extra photos beyond 11 are available as swappable alternates per tier)
- [ ] Fusion mode: `fusionBlend.ts` F0 blend (aligned 50/50 alpha blend), lineage `weights` tracking per game design doc §8.2
- [ ] Wire the face-pick seeded RNG stream (separate from the tier stream, per §4) so tier sequence is skin-independent
- [ ] **Update `shareCard.ts` to enforce the private boundary:** the share card must always render the default Skylight-mote art for the top ball, never a personalized photo or fused face, even when the run used a photo skin (game design doc §11) — this is a required change to the Step 7 share-card code, not optional polish
- [ ] **Exclude personalization data from OS-level backups** where the platform provides a mechanism to do so (e.g., Android's backup-exclusion rules); note in the privacy policy copy whatever can't be excluded on a given platform
- [ ] If time allows, implement F1 (two-band blend) per §8.3 — otherwise F0 only is acceptable for this stage's first version
- [ ] Add `@mediapipe/tasks-vision` to dependencies only as part of this stage, lazy-loaded on skin-editor entry, never bundled into the core game's initial load

---

## Conventions

- **Naming:** PascalCase for React components and their files, camelCase for functions/variables, kebab-case for non-component file names where there's no class/component.
- **Component structure:** one component per file; co-locate a component's own small helper hooks in the same folder.
- **Game constants:** every physics, tier, and scoring number lives in `config/`. Never inline a magic number for gravity, radius, score, or timing anywhere else in the codebase — reference the config.
- **Worker communication:** all physics-worker messages are typed in `engine/types.ts`; never pass untyped objects across the worker boundary.
- **Error handling:** try/catch around all async steps (asset loading, IndexedDB writes; photo-pipeline steps once Phase 1.5 exists); surface user-facing errors via a toast, never a raw exception message.
- **Types:** shared domain types (SkinSet, Photo, Run, LevelDef, etc.) live in `src/types/index.ts`, matching the shapes in API_DESIGN.md §2.5 and §3.4 of the Tech Spec.
- **Comments:** comment the _why_ on anything implementing a specific numbered rule from the game design doc (e.g. `// merge resolution order per game design §5.2 — must stay deterministic`); don't comment obvious code.

---

## Environment Variables

```env
# Phase 1 requires none — this file is a placeholder for forward-compatibility with Phase 2.
# Do not add Supabase or any server credentials in this build.
```

---

## Gotchas & Watch-Outs

- **Shader orientation conventions are easy to get backwards.** Pixi's UV convention, WebGL's y-axis, and however you build the rotation matrix can combine to produce an upside-down or mirrored image. Don't guess — implement the acceptance test in Step 4 and iterate on the convention until it passes.
- **Determinism breaks silently.** A `Math.random()` call anywhere in the physics or spawn path, or a `Date.now()`-based timing decision inside the fixed-timestep loop, will quietly break seeded fairness. Grep for `Math.random` outside `engine/rng.ts` before considering Step 3 done.
- **Do not copy any existing merge game's names, art style, or ordering.** The tier table in the game design doc and the reskinned names in `ART_AND_STORY_DIRECTION.md` (Dewdrop Mote, Petal Spark...) are original specifically to avoid this. Commission or generate genuinely original art in the pastel watercolor anime style.
- **Keep the visual style consistent across every asset.** Tier motes, land backgrounds, and UI chrome should all read as the same pastel-watercolor-anime world — see the shared style keywords in `ART_AND_STORY_DIRECTION.md` §1 and reuse them in every generation prompt.
- **(Phase 1.5, when that build happens) Never let an original, unprocessed photo touch persistent storage or leave the device.** Only the aligned, cropped, vignetted 512×512 output of `photoPipeline.ts` should ever be written to IndexedDB — a hard privacy requirement, not a style preference.

---

## Out of Scope for This Build

Do not implement these unless explicitly asked — they belong to later phases per the PRD:

- **Photo personalization entirely — Fusion mode, Ladder mode, the skin editor, face detection, MediaPipe (Phase 1.5).** None of it is part of this first build pass, even though it's free (not paid) when it does get built. See the "Phase 1.5" appendix above for what it becomes later.
- Any backend, database, or auth (Phase 2)
- Cloud sync of progress (Phase 2)
- Daily Seed mode or leaderboards (Phase 2)
- Async head-to-head challenges (Phase 3)
- Any content moderation/reporting system (only needed once UGC is shared between users, Phase 3)
- Character cutouts / background removal (Phase 3)
- Ads, power-ups, or any other monetization beyond the Phase 1.5 add-on
- Capacitor native wrapper, haptics, accelerometer tilt mode, voice merges, foldable prep round (Phase 4)
- Ads, in-app purchases, or any monetization UI (photo personalization is free and is not part of the monetization plan)
