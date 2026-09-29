# Smoosh — UI/UX Design Notes

---

## 1. Design Philosophy

- **Tone:** playful, warm, a little cheeky — this is a "just one more run" game, not a slick productivity app. The personalization hook (friends' faces) should feel like an inside joke you get to share, not a gimmick bolted onto a generic merge game.
- **Key design values:** clarity (tiers and danger state must read instantly, even mid-chaos), delight (satisfying merge feedback — motion, sound, the face reveal), speed (get into a run in under 5 seconds from app open).
- **Reference apps for aesthetic inspiration:** Suika Game / Fruit-merge clones for the core board feel; Candy Crush for the journey map's sense of progression and "just one more level"; BeReal or Snapchat's lightweight, low-friction camera/photo flows for the skin-creation moment (it should feel quick and fun, never like filling out a form).

---

## 2. Design System

| Token             | Value / Approach                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Primary color     | Warm coral `#F25F5C` (echoes tier 1's rim color, ties the brand to the game itself)                                  |
| Accent color      | Golden yellow `#FFD700` (echoes the apex tier's shimmer)                                                             |
| Neutral scale     | Warm off-white background (`#FAF7F2`) through charcoal text (`#2B2622`) — avoid stark pure white/black, keep it soft |
| Font (headings)   | A rounded, friendly display face (e.g. Fredoka or Baloo 2) — playful without being childish                          |
| Font (body)       | A clean geometric sans (e.g. Inter or Manrope) for HUD numbers and settings text, so scores stay legible mid-motion  |
| Border radius     | 16px on cards and sheets, fully circular on buttons and the balls themselves (obviously)                             |
| Spacing system    | 4px base grid                                                                                                        |
| Component library | Custom, built on Tailwind CSS — no heavy UI kit, since most of the screen real estate is the game canvas itself      |

---

## 3. Screen-by-Screen Descriptions

### Screen: Home / Main Menu

**Purpose:** Get the player into a run as fast as possible, or toward Journey/skins if that's what they came back for.
**Layout:** Full-bleed background (subtle animated preview of default balls gently bouncing), logo top-center, three stacked primary buttons lower-half: "Play Classic," "Journey," and a smaller "My Skins" entry with a thumbnail of the player's active skin set if one exists.
**Key elements:**

- Best score badge (classic mode) near the top
- Settings gear icon, top-right corner
- Active skin set indicator (shows whose faces are currently equipped, if any)

**States:**

- Empty (no skin set yet): "My Skins" shows a "+" prompt instead of a thumbnail
- Loading: skeleton pulse on the best-score badge while IndexedDB reads resolve (should be near-instant, but never show a flash of "0")
- Error: n/a — this screen has no network dependency in Phase 1

**Primary CTA:** "Play Classic" — largest, highest-contrast button.

---

### Screen: Game Board (Classic & Journey)

**Purpose:** The core gameplay screen.
**Layout:** Portrait-locked. Top strip: score, combo indicator, pause/settings icon, (Journey only) goal progress and drop/time counter. Center: the 400×600 game board, letterboxed to fit the viewport width. Bottom strip: next-ball preview and the drop rail is implicit in touch position along the top of the board.
**Key elements:**

- Danger line (dashed, always visible near the top of the board)
- Ghost guide line following the player's finger before release
- Combo text pop-up (appears at comboCount ≥ 3, per game design doc §6)
- Pause button opens a lightweight overlay (resume / settings / quit to menu), doesn't leave the screen

**States:**

- Default: active play
- Warning: danger-line pulse + flash once a ball has been over the line for 1000ms (per game design doc §7)
- Game over: board freezes, brief pause, then transitions to Results
- Loading: on first load only, a brief "warming up physics" spinner while the Rapier WASM module initializes (should be sub-second on modern devices)

**Primary CTA:** none in the traditional sense — the whole board is the interaction surface. The one explicit button is Pause.

---

### Screen: Results

**Purpose:** Close out the run, show what was achieved, and offer the two things a player wants next: share it, or play again.
**Layout:** Centered card over a dimmed board background. Large hero: the top ball reached (rendered with its actual face if Fusion was active). Score and best-score comparison below. Two buttons: "Share" and "Play Again," plus a smaller "Menu" link.
**Key elements:**

- New-best-score celebration state (confetti, distinct copy) when applicable
- Journey mode: star rating animation (1-3 stars) instead of/alongside the score, plus "Next Level" as the primary button

**States:**

- Default: standard results
- New best: celebratory variant
- Journey level failed (goal not met before drops/time ran out): encouraging retry copy, "Try Again" as primary CTA instead of "Next Level"

**Primary CTA:** "Play Again" (Classic) or "Next Level" (Journey, if passed) / "Try Again" (Journey, if failed).

---

### Screen: Skin Editor (create/edit a skin set) — Phase 1.5, free, built as a second stage after the core game/story

**Purpose:** Let the player build a Fusion or Ladder skin set from their own photos with minimal friction, once they've cleared the one-time age + privacy interstitial.
**Layout:** Full-screen flow, not a modal (this deserves real space). The first time any player taps into this feature (e.g. a "Personalize with Photos" entry from Home), a **one-time age + privacy interstitial** appears before anything else — plain language stating (a) this feature requires the player to be 18 or older, and a single tappable self-attestation control ("I am 18 or older"), and (b) a clear, one-line statement that this feature is permanently private: nothing it produces — original photos, aligned crops, or fused results — is ever uploaded, synced, or shown to anyone but the player, and it's excluded from the share card. No purchase, no payment screen. Under-18 accounts (per the app-wide 13+ gate) never see this entry point at all. After the interstitial: Step 1: name the set + choose mode (Fusion/Ladder), with a one-line plain-language explanation of the difference. Step 2: photo grid (add via camera or library, no cap), each thumbnail showing crop/alignment status. Step 3 (Ladder only): drag photos onto tier slots 1-11. A live sphere preview (using the actual shader) is available at any point via a "Preview" toggle so the player sees exactly how a photo will look on the ball before committing.
**Key elements:**

- Per-photo status badge: "aligned," "no face found — tap to adjust," or "processing"
- Manual pan/zoom control, always available, not just a fallback
- Consent micro-copy near the add-photo action (plain language: only add photos of people who are okay with this)
- A small persistent "Private to this device" indicator somewhere in the flow (icon + one line), reinforcing the privacy interstitial's promise so it doesn't feel like a one-time disclaimer that's then forgotten
- No skin-set or photo count limits to display — unlimited, free, no tier to unlock

**States:**

- Empty: friendly illustration + "Add your first photo" prompt
- Processing: per-photo spinner while MediaPipe runs (should be fast, but the model itself may still be lazy-loading on first use — show "getting ready..." once, not per photo)
- Error (no face detected): non-blocking inline warning, photo still usable
- Interstitial not yet completed: this screen shows the age + privacy interstitial instead of the editor

**Primary CTA:** "Save Skin Set" (only enabled once at least 2 photos are added for Fusion, or at least 1 tier is assigned for Ladder).

---

### Screen: Journey Map

**Purpose:** Show progression and pull the player into the next level.
**Layout:** Vertically scrolling path (Candy-Crush-style winding trail) grouped into region sections, each level as a node on the path showing lock state and stars earned. Region banner art distinguishes "Puget Sound" from "Tokyo."
**Key elements:**

- Current/next-playable level visually emphasized (pulsing or highlighted)
- Locked levels shown dimmed with a lock icon, not hidden
- Tapping a level opens the Level Intro screen, not the board directly

**States:**

- Empty (fresh install): map starts scrolled to level 1, nothing else unlocked
- Loading: skeleton path while progress loads from IndexedDB (should be near-instant)

**Primary CTA:** tapping the current/next level node.

---

### Screen: Level Intro (modal over Journey Map)

**Purpose:** Set expectations before spending a life/attempt on a level.
**Layout:** Small centered card: level name, goal(s) stated in plain language ("Reach the Beach Ball"), any constraints (drop limit, timer, obstacles) as small icons with numbers, star thresholds shown as ghosted stars.
**Primary CTA:** "Start Level."

---

### Screen: Settings

**Purpose:** Control sound, motion, and accessibility without hunting.
**Layout:** Simple single-column list of toggles grouped under "Audio," "Motion & Graphics," and "Accessibility."
**Key elements:** Sound, Music, Haptics (grayed out with "coming to mobile" note in the web build), Reduce Motion, Simple Graphics, Show Tier Numbers.
**States:** n/a — all toggles are immediate, no save/cancel step.
**Primary CTA:** none — this is a pure preferences screen, closed via a back/close icon.

---

## 4. Navigation Structure

```
Smoosh
├── Home
│   ├── Game Board (Classic)
│   │   └── Results
│   ├── Journey Map
│   │   ├── Level Intro (modal)
│   │   ├── Game Board (Journey)
│   │   │   └── Results (Journey variant)
│   ├── My Skins
│   │   ├── Skin Editor (create/edit)
│   │   └── Skin Set List
│   └── Settings
```

- **Nav type:** no persistent tab bar — this is a game, not a utility app. Navigation is button-driven from Home, with a consistent back/close affordance on every non-Home screen.
- **Auth gates:** none in Phase 1 — nothing requires an account.

---

## 5. Key Interaction Patterns

- **Forms:** the skin editor is the only form-like flow; validate inline (e.g. "add at least 2 photos") rather than blocking with error dialogs.
- **Confirmations:** deleting a skin set or a photo requires a confirm step (destructive and not easily undone, since original photos aren't retained once cropped).
- **Feedback:** every merge gets an immediate visual + audio response (scale pop, coin-flip, pitch-ramped merge sound per tier); every async action (photo processing, share-card generation) shows a loading state.
- **Transitions:** screen changes use a quick fade/slide, kept short (150-200ms) so they never feel like they're getting in the way of "just one more run."
- **Mobile:** portrait-first, one-handed reachability for all primary actions (drop input, pause, share, play-again all within thumb reach), touch targets ≥44px per the PRD requirement.

---

## 6. Accessibility Notes

- Color contrast: AA compliant minimum, checked especially for HUD text over the animated board background.
- Tier readability without color: rim style (solid/dashed/double, per game design doc §3) plus the optional "show tier numbers" setting — never rely on color alone to distinguish tiers.
- All interactive elements keyboard-navigable (relevant for the web build's desktop players, even though touch is primary).
- Reduce Motion setting: disables the idle gaze/wobble animation and the merge coin-flip spin, replacing them with a simple crossfade, for players sensitive to motion.
- Focus indicators visible on all buttons and form controls in the skin editor and settings.
- Form inputs (skin set name, etc.) have associated labels, not placeholder-only text.

---

## 7. Wireframe Descriptions

### Game Board Wireframe

```
┌─────────────────────────────────────────┐
│  Score: 412        Combo x2!      ⚙      │
│  (Journey: goal chip + drops/time left)  │
├─────────────────────────────────────────┤
│  ┄┄┄┄┄┄┄┄┄┄┄ danger line ┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│                                         │
│              o                          │  <- falling/settled balls,
│           o     O                       │     sphere-shaded, faces visible
│        o    O      o                    │
│      O    o    O      O                 │
│   ───────────────────────────────       │  <- board floor
├─────────────────────────────────────────┤
│         Next:  (•)                       │  <- preview of next ball
└─────────────────────────────────────────┘
```

### Skin Editor (Fusion mode) Wireframe

```
┌─────────────────────────────────────────┐
│  ← Back        Weekend Crew        Save  │
├─────────────────────────────────────────┤
│  Mode: [Fusion ●] [Ladder ○]             │
│                                         │
│  Photos (5)                              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│  │ 🙂 │ │ 🙂 │ │ ⚠ │ │ 🙂 │ │  + │     │
│  └────┘ └────┘ └────┘ └────┘ └────┘     │
│         (⚠ = no face found, tap to fix) │
│                                         │
│           [ Preview on Ball ]            │
└─────────────────────────────────────────┘
```

_(Use ASCII art, prose, or both. The goal is clarity for implementation, not visual fidelity.)_
