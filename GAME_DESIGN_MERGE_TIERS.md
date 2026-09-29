# Smoosh — Game Design: Merge Tiers, Fusion & Sphere Projection

**Version:** 1.0  
**Date:** 2026-09-27  
**Status:** Draft. This is the canonical source for all numbers and rules. If another doc disagrees, this one wins.

> ⚠️ Assumption: "Smoosh" is a working title. Nothing in the code should hard-code the name beyond `config/brand.ts`.

---

## 1. Core Loop in One Paragraph

The player drags a ball along a rail at the top of a container and releases it. Balls fall under gravity and pile up. When two balls of the same tier touch, they merge into one ball of the next tier, placed at their midpoint. Bigger tiers take more room, so the container fills. The run ends when the pile stays above the danger line too long. Score comes from merges, with a combo multiplier for chains.

Smoosh's twist is that **the skin on each ball can be a photo of a real person, pet, or thing**. In _Fusion_ mode, merging two balls blends their faces into a new face, so tier 11 is a composite of everyone in the friend group.

---

## 2. Board & Physics

Logical units are pixels on a fixed 400 × 600 board. The renderer scales this to the screen. Physics runs at 100 px = 1 m.

| Parameter                          | Value                           | Notes                                                         |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| Board (inner)                      | 400 × 600 px                    | Aspect 2:3. Letterbox on other aspect ratios.                 |
| Wall thickness                     | 40 px (outside the board)       | Static colliders. Thick to prevent tunnelling.                |
| Drop rail Y                        | 44 px from top                  | Ball spawns here, centered on pointer X.                      |
| Danger line Y                      | 110 px from top                 | Dashed line, always visible.                                  |
| Gravity                            | 14 m/s² down                    | Starting value. Tune by feel.                                 |
| Ball shape                         | Circle, exact sphere silhouette |                                                               |
| Density                            | 1.0                             | Mass scales with area.                                        |
| Restitution (ball–ball, ball–wall) | 0.12                            | Low bounce.                                                   |
| Friction (ball–ball)               | 0.35                            |                                                               |
| Friction (ball–wall)               | 0.20                            |                                                               |
| Linear damping                     | 0.15                            |                                                               |
| Angular damping                    | 0.40                            |                                                               |
| Max speed clamp                    | 14 m/s                          | Prevents tunnelling. CCD also on.                             |
| Fixed timestep                     | 1/120 s                         | Two physics steps per 60 fps frame. Required for determinism. |
| Drop cooldown                      | 450 ms                          | Between releases.                                             |
| Max live balls                     | ~80 (soft budget)               | Board area makes this hard to exceed.                         |

> ⚠️ Assumption: all physics values are starting points. Expose them in `config/physics.ts` and a dev-only tuning panel.

---

## 3. Tier Table

11 tiers. Radius formula: **`r(n) = 14 × 1.22^(n−1)` px**. Always compute it from the formula. The rounded values below are for reading only.

| Tier | Default skin (placeholder art) | Radius px (rounded) | Diameter as % of board width | Rim color                    | Rim style | Bake texture size |
| ---- | ------------------------------ | ------------------- | ---------------------------- | ---------------------------- | --------- | ----------------- |
| 1    | Pebble                         | 14                  | 7.0%                         | `#F25F5C`                    | solid     | 128               |
| 2    | Seashell                       | 17                  | 8.5%                         | `#FF9F1C`                    | solid     | 128               |
| 3    | Coin                           | 21                  | 10.4%                        | `#FFD23F`                    | solid     | 128               |
| 4    | Marble                         | 25                  | 12.7%                        | `#9BD770`                    | solid     | 128               |
| 5    | Lantern                        | 31                  | 15.5%                        | `#2EC4B6`                    | dashed    | 256               |
| 6    | Beach Ball                     | 38                  | 18.9%                        | `#3AA6F0`                    | dashed    | 256               |
| 7    | Snow Globe                     | 46                  | 23.1%                        | `#5B6CFF`                    | dashed    | 256               |
| 8    | Balloon                        | 56                  | 28.2%                        | `#9B5DE5`                    | dashed    | 256               |
| 9    | Moon                           | 69                  | 34.4%                        | `#F15BB5`                    | double    | 512               |
| 10   | Sun                            | 84                  | 41.9%                        | `#E07A5F`                    | double    | 512               |
| 11   | Globe (apex)                   | 102                 | 51.1%                        | `#FFD700` (animated shimmer) | double    | 512               |

Rim style exists so tiers are readable without color (color-blind support). An optional "show tier numbers" setting draws a small numeral badge.

> ⚠️ Revised 2026-09-28: as of the gummy-candy material direction (see `ART_AND_STORY_DIRECTION.md` §1-§2 and §9 below), the Rim color above does double duty as each tier's **translucent gummy body color** too — one palette drives both the accessibility rim system and the ball's base candy hue, for default art and personalized skins alike.

> ⚠️ Assumption: default skin names are original placeholders themed around travel and collectibles. They intentionally do not copy the fruit ordering or art of existing merge games. Commission original art before launch.

---

## 4. Spawning (Drop Sequence)

- Only tiers **1–5** can be dropped.
- Use a **20-drop shuffle bag** so streaks are fair and seeded runs are reproducible:

| Tier | Copies per bag of 20 |
| ---- | -------------------- |
| 1    | 7                    |
| 2    | 6                    |
| 3    | 4                    |
| 4    | 2                    |
| 5    | 1                    |

- The bag is shuffled with a seeded RNG (`mulberry32(seed)`, Fisher–Yates). When empty, refill and reshuffle using the same RNG stream.
- Preview shows the **next 1** ball. Journey levels may override to 2.
- Journey levels can override the bag counts (`spawnBag` in the level schema).
- **Fusion mode only:** each dropped ball also draws a face from the skin's face pool. The face pick uses a _separate_ seeded RNG stream, so the tier sequence stays identical whether or not a player uses photos. This keeps daily seeds and async head-to-head fair across players with different skins.

---

## 5. Merge Rules

### 5.1 Eligibility

Two balls merge when all are true:

1. Same tier, and tier < 11.
2. They are in contact (Rapier collision-start event, plus an overlap re-check each step for pairs that were ineligible when contact began).
3. Neither is already flagged `merging` this step.
4. Neither is a Journey obstacle (`rock`; `ice` balls become eligible only after they thaw).

`mergeContactMs` defaults to **0** (merge on first contact). Journey levels may set it higher.

### 5.2 Resolution order (deterministic)

Process eligible pairs sorted by `(min(idA, idB), max(idA, idB))` ascending. Each ball can join at most one merge per physics step. Losers of a conflict wait for the next step.

### 5.3 Result ball

| Property         | Rule                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier             | `n + 1`                                                                                                                                     |
| Position         | Midpoint of the two centers                                                                                                                 |
| Linear velocity  | Average of the two                                                                                                                          |
| Angular velocity | Average of the two                                                                                                                          |
| Body             | Created at new radius immediately. It may overlap neighbours, and physics pushes them apart. This produces the satisfying chain reactions.  |
| ID               | Next monotonic integer (never reused)                                                                                                       |
| Grace            | 600 ms before it can trigger the danger line                                                                                                |
| Visual           | Parents scale to 0 over 80 ms. Result "pops" from 0.8× to 1.0× over 140 ms with overshoot to 1.08×, plus a 360° Y-axis coin-flip (see §9.4) |

### 5.4 Apex merge

Two tier-11 balls: both vanish, awarding the **apex bonus** (66 points × combo). This triggers confetti, a "Hall of Faces" entry, and is a valid win condition in Journey levels. No tier-12 ball is created.

---

## 6. Scoring & Combos

**Merge points:** `T(n) = n(n−1)/2`, where `n` is the _new_ tier.

| New tier | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  | Apex |
| -------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---- |
| Points   | 1   | 3   | 6   | 10  | 15  | 21  | 28  | 36  | 45  | 55  | 66   |

**Combo:** every merge increments `comboCount`. If more than **1200 ms** pass since the last merge, `comboCount` resets to 0 before counting the new merge.

- Multiplier: `m = min(3.0, 1 + 0.2 × (comboCount − 1))`
- Awarded: `floor(T(n) × m)`
- Show combo text from `comboCount ≥ 3`.

Dropping a ball scores 0.

---

## 7. Game Over

- A ball is **over the line** if `centerY − radius < dangerLineY` and its grace period has expired.
- Grace: **1200 ms** after it was dropped, **600 ms** after it was created by a merge.
- If any ball is continuously over the line for **1000 ms**, show the warning flash and pulse the line.
- If any ball is continuously over the line for **2500 ms**, the run ends.
- The timer resets the moment no ball is over the line.

---

## 8. Personalization Modes (Free, Private, Second Build Stage — not in the very first build pass)

> ⚠️ Revised 2026-09-28 (twice): photo personalization is **not part of the first build pass**. That first pass ships with the default Skylight-mote art (see the companion `ART_AND_STORY_DIRECTION.md`) only, so the core game and story get full attention first. This section describes the personalization feature as its own second build stage — free, not gated behind payment.

### 8.0 Access model

The skin editor and all of Fusion/Ladder mode are gated by a one-time **18+ self-attestation** screen the first time the player tries to open the skin editor, shown alongside a plain, one-line statement that the feature is permanently private: nothing it produces — original photos, aligned crops, or fused results — is ever uploaded, synced, or shown to anyone but the person who made it, and it's explicitly excluded from the share card (§11). This is a deliberate design: self-attestation alone is a weak age-assurance mechanism (a minor can simply tap through it), but pairing it with a strictly on-device, never-shared architecture removes the category of harm that made age-assurance strength matter most (distribution to or visibility by anyone else). The ToS/consent copy still needs the legal review flagged in the PRD before this stage ships. No skin-set or photo-count limits — unlimited sets, unlimited photos per set, since this was never a paid-tier differentiator.

### 8.1 Skin set

A skin set is a named collection of 2+ photos plus settings.

| Mode                  | How photos map to balls                                                                                        | Best for                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Fusion** (flagship) | Each dropped ball draws a random face from the pool. Merging two balls **blends** their faces into a new face. | Friend groups, families, "what if we were one person" |
| **Ladder**            | The player assigns one photo per tier (up to 11). No blending.                                                 | Pets, memes, objects, custom characters               |

If a Ladder set has fewer than 11 photos, missing tiers fall back to the default skin for that tier.

### 8.2 Fusion lineage ("genome")

Every Fusion ball carries `weights: Record<faceId, number>`, summing to 1.

- Dropped ball: `{ chosenFaceId: 1 }`
- Merge of two same-tier balls: `weights = (weightsA + weightsB) / 2` (equal ancestor counts because tiers match).
- This drives the **share card contribution bar** ("Made from: 38% Spencer, 31% Alex, 31% Jo") and any future "who's dominant" mechanic.

### 8.3 Fusion blend quality levels

| Level  | Method                                                                                                                                                                                        | Ships in                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **F0** | Aligned 50/50 alpha blend of parent textures                                                                                                                                                  | Phase 1 (MVP)                             |
| **F1** | Two-band blend: average the low-frequency band, take the high-frequency detail (eyes, brows, edges) from one parent picked by seeded RNG. Prevents high tiers converging to a blurry average. | Phase 1 if time allows, otherwise Phase 3 |
| **F2** | Landmark-based warp morph (Delaunay triangulation over face landmarks), then blend                                                                                                            | Phase 3                                   |

The result texture is baked to a pooled `RenderTexture` on the GPU when the merge happens. Parents' textures are recycled. No workers needed at F0/F1.

### 8.4 Photo preparation (on-device)

1. Decode with EXIF orientation applied (`createImageBitmap(file, { imageOrientation: 'from-image' })`).
2. Detect face landmarks with MediaPipe Face Landmarker (runs locally).
3. Align with a similarity transform so eye centers land on fixed canonical points, crop to a 512 × 512 square.
4. Apply a **soft radial feather to the crop's alpha** — opaque at the center, fading to fully transparent by the crop's edge — so the photo reads as glowing light embedded inside the gummy rather than a hard-edged decal once the shader blends it (see §9.3). Unlike the earlier opaque-decal design, the ball's body color never comes from the photo — it always comes from the tier's canonical gummy color (§3), so personalized and default balls share the same color-blind-friendly rim/body system.
5. If no face is found, center-crop and warn: "No face found. We'll use this as-is." Manual pan/zoom is always available.

---

## 9. Sphere Projection & Gummy-Candy Material

> ⚠️ Revised 2026-09-28: the ball material moved from an opaque "photo printed on a ball" look to a **translucent gummy-candy** look (see `ART_AND_STORY_DIRECTION.md` §1-§2 for the approved reference art). The geometric approach in §9.1-9.2 below is unchanged — it's still a fragment-shader sphere illusion on a 2D quad — but §9.3's shader and §9.4's tuning are rewritten for the new material, and §9.2 gains an impact-squash animation.

The goal: a face — default mote art or a personalized photo/fused face — that reads as **glowing inside a translucent gummy ball**, not printed on its surface, and that stays readable at speed.

### 9.1 Decision

Render each ball as a **single quad with a custom fragment shader** that treats the pixel as a point on a unit sphere. It computes a normal, rotates it by the ball's orientation, maps it to photo UVs, and shades it.

| Option                                           | Verdict                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Fragment-shader sphere on a 2D quad (PixiJS)** | ✅ Chosen. Cheap, one draw call per ball, works on low-end phones, easy to keep 2D physics as the source of truth.                    |
| Full 3D spheres (Three.js)                       | Rejected for MVP. Heavier bundle and no benefit, since the camera never moves. Keep as a fallback if we ever need true depth effects. |
| Flat circular sprites                            | Kept as the **"Simple graphics" fallback** for very low-end devices and reduced-motion users.                                         |

### 9.2 Orientation model

A physics disc in a 2D side view spins about the screen-Z axis. If we displayed that raw, faces would rotate like wheels and end up upside down. So:

```
orientation = Rz(displayAngle) · Ry(yaw) · Rx(pitch)

displayAngle = wrapToPi(bodyAngle) × visualSpinScale × (1 − settle)
settle       = smoothstep(0, 0.5 s, timeAtRest)   // eases upright when calm
yaw, pitch   = gaze toward pointer (max ±20°) + wobble from velocity
```

- `visualSpinScale = 0.6`: balls appear to roll, but less violently than the physics.
- "At rest" means speed < 15 px/s and |angular velocity| < 0.3 rad/s.
- When motion resumes, `settle` decays over 150 ms so there is no visible snap.
- **Gaze:** idle faces turn a few degrees toward the player's finger. It is cheap (just yaw/pitch) and a large part of the charm.
- **Merge coin-flip:** the new ball spins one full turn about Y over 260 ms, revealing the "back" (tier rim color with the tier emblem) mid-turn.

### 9.2b Impact squash-and-stretch (bounce)

Balls stay a **perfect circle** while falling or at rest — the squish only triggers on a landing impact, then eases back to round with a couple of decaying bounces. This is a render-only mesh transform; the physics collider stays a true circle throughout, so gameplay/collision is unaffected.

```
onImpact(ball, impactSpeed):
  if impactSpeed > impactThreshold (2.5 m/s) and !ball.justMerged:
    ball.squashClockMs = 0   // (re)start the envelope; a harder hit can retrigger it

squashEnvelope(tMs) =
  // damped oscillation: quick flatten, one rebound overshoot, settle — ~220ms total
  0                                          if tMs > squashDurationMs (220 ms)
  else  amplitude(impactSpeed) × decay(tMs) × cos(2π × tMs / periodMs)
  // amplitude scales with impact speed, clamped so a gentle settle barely squishes
  // and a hard drop squishes noticeably; decay(tMs) = 1 − tMs / squashDurationMs

scaleX = 1 + squashEnvelope × 0.22   // widen on compress
scaleY = 1 − squashEnvelope × 0.30   // flatten on compress
```

- Triggers on ball–floor contact and ball–pile contact where the approach speed exceeds `impactThreshold`; does **not** trigger on the merge-result "pop" (§5.3), which stays its own uniform 0.8×→1.0×→1.08× scale animation, or on the merge coin-flip.
- The quad's UV parameterization doesn't change — the sphere math in §9.3 still treats the quad as a unit circle, so the squash naturally distorts the rendered "sphere" along with the mesh, which reads as the gummy body flattening on impact rather than the face texture warping independently.
- Tuning defaults live alongside §9.4 below.

### 9.3 Fragment shader (reference implementation)

```glsl
#version 300 es
precision highp float;

in vec2 vUV;                 // 0..1 across the ball's quad
uniform sampler2D uCore;     // baked face texture: default mote art OR personalized
                              // photo/fused face, tight crop, radial-feathered alpha (§8.4)
uniform vec2  uCoreTexel;    // 1.0 / core texture size (for the soft-glow taps below)
uniform mat3  uRot;          // ball orientation (object <- view)
uniform vec3  uGummyColor;   // tier's gummy body color = its rim color (§3), never the photo
uniform vec3  uRimColor;     // tier rim color (accessibility ring, same value as uGummyColor)
uniform vec3  uLightDir;     // normalized, default (-0.35, -0.55, 0.76)
uniform float uWrap;         // 0 = flat/orthographic, 1 = fully wrapped. Default 0.5
uniform float uHalo;         // 0..1 shimmer for tier 11
out vec4 fragColor;

const float COV = 1.4;       // radians of longitude/latitude the core texture covers (~80 deg)

// Cheap 5-tap blur: the core "glows through" the gummy material rather than sitting
// printed on its surface, so it should soften with distance from center (see fres below).
vec4 sampleCoreSoft(vec2 uv, float px) {
  vec4 c = texture(uCore, uv) * 0.4;
  c += texture(uCore, uv + vec2( px, 0.0) * uCoreTexel) * 0.15;
  c += texture(uCore, uv - vec2( px, 0.0) * uCoreTexel) * 0.15;
  c += texture(uCore, uv + vec2(0.0,  px) * uCoreTexel) * 0.15;
  c += texture(uCore, uv - vec2(0.0,  px) * uCoreTexel) * 0.15;
  return c;
}

void main() {
  vec2 p = vUV * 2.0 - 1.0;
  float d2 = dot(p, p);
  float aa = fwidth(sqrt(d2));
  float edge = 1.0 - smoothstep(1.0 - aa * 1.5, 1.0, sqrt(d2));
  if (edge <= 0.0) discard;

  float z = sqrt(max(0.0, 1.0 - d2));
  vec3 n = vec3(p.x, -p.y, z);            // view-space normal, y up
  vec3 q = uRot * n;                      // direction in ball space
  float fres = pow(1.0 - z, 3.0);         // 0 at center, 1 at silhouette

  // Refraction fake: light bends as it exits the curved gummy surface, so the core
  // image appears to pull slightly toward center near the rim rather than sitting flat.
  vec2 refractOffset = -p * fres * 0.22;

  vec2 ortho = q.xy;
  vec2 equi  = vec2(atan(q.x, q.z), asin(clamp(q.y, -1.0, 1.0))) / COV;
  vec2 m     = mix(ortho, equi, uWrap) + refractOffset;
  vec2 uv    = vec2(0.5 + 0.5 * m.x, 0.5 - 0.5 * m.y);

  // Sharp/bright near center, hazier near the rim — this is the core change from the
  // old opaque-decal shader: the face reads as embedded light, not a printed surface.
  vec4 core = sampleCoreSoft(clamp(uv, 0.0, 1.0), mix(0.4, 3.0, fres));
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float facing = smoothstep(-0.05, 0.30, q.z);
  float glowStrength = facing * mix(0.4, 1.0, inside) * mix(1.0, 0.55, fres);

  vec3 innerGlow = mix(uGummyColor * 0.6, core.rgb, glowStrength);
  vec3 body      = mix(uGummyColor, innerGlow, 0.75);   // gummy body always shows through a little

  vec3 L = normalize(uLightDir);
  float diff = max(dot(n, L), 0.0);
  vec3 R = reflect(-L, n);
  float spec = pow(max(R.z, 0.0), 48.0);   // tighter, glossier highlight than the old opaque look

  vec3 col = body * (0.55 + 0.45 * diff)
           + spec * 0.55                    // glossy sugared exterior
           + uRimColor * fres * 0.55         // rim tint — light passing through, not paint
           + uGummyColor * fres * 0.35        // translucency: body color glows outward at the rim
           + uHalo * fres * vec3(1.0, 0.9, 0.5);

  fragColor = vec4(col * edge, edge);      // premultiplied alpha
}
```

> ⚠️ Assumption: sign conventions (y-up vs y-down, matrix handedness) depend on how Pixi feeds UVs and how `uRot` is built. **Acceptance test:** with `uRot = I`, a face must appear upright and not mirrored, sitting in the center as the brightest, sharpest part of the glow. Turning `yaw` positive must move the face toward screen-right. The rim should read as soft color, not a hard printed edge. Fix conventions/blend weights until all three hold.

### 9.4 Visual tuning defaults

| Parameter                         | Default              | Range                             |
| --------------------------------- | -------------------- | --------------------------------- |
| `uWrap`                           | 0.5                  | 0–1                               |
| Light direction                   | (−0.35, −0.55, 0.76) | fixed                             |
| Specular power (glossiness)       | 48                   | 24–64                             |
| Specular strength                 | 0.55                 | 0.3–0.7                           |
| Rim tint strength                 | 0.55                 | 0.3–0.8                           |
| Translucency glow strength        | 0.35                 | 0.2–0.5                           |
| Core blur radius (at rim)         | 3.0 px taps          | 1–5                               |
| Refraction offset strength        | 0.22                 | 0.1–0.35                          |
| Gaze max angle                    | 20°                  | 0–30°                             |
| `visualSpinScale`                 | 0.6                  | 0–1                               |
| Impact threshold (squash trigger) | 2.5 m/s              | tune by feel                      |
| Squash duration                   | 220 ms               | 150–300 ms                        |
| Squash amplitude (x/y)            | 0.22 / 0.30          | scales with impact speed, clamped |

### 9.5 Performance

- One `Mesh` per ball sharing one `Shader`/program. ≤ 80 draw calls. Fine for 60 fps on 2020-era phones.
- Each ball owns one baked texture sized by tier (128 / 256 / 512, see §3). A busy board (e.g. 30 small + 20 mid + 3 large) is roughly 2 MB + 5 MB + 3 MB of textures. Pool and recycle `RenderTexture`s.
- Provide `graphicsQuality: 'high' | 'simple'`. `simple` = flat sprite plus rim, no shader.

---

## 10. Journey Mode (Level Progression)

### 10.1 Structure

A scrolling map of levels grouped into **lands** — fully fictional, telling "The Scattered Skylight" story (see the companion `ART_AND_STORY_DIRECTION.md` for the full narrative, palette, and Higgsfield art direction for every land). 13 lands at launch, starting from the low-stakes tutorial village and extending indefinitely as pure content post-launch — nothing about the architecture below caps the land count. Each land holds roughly 2-3 Journey levels; the game design's original 30-level Phase-1 budget maps across the first several lands rather than needing every land fully built on day one.

Launch lands, in order: Sunmeadow Hollow (village, tutorial) → Driftmoor Cove (introduces `ice`) → Whisperwood (introduces `rock`) → Thistledown Hills (introduces `wind`) → Copperleaf Orchard → Mistvale Marsh → Emberpeak → Cloudspire Isles → Frostglass Tundra → Neonoko City (tonal shift, combo/apex focus) → Starlit Harbor (breather land) → Sunreach Spire → The Skylight Sanctuary (finale, requires an apex merge). Full per-land design notes and art prompts are in `ART_AND_STORY_DIRECTION.md` §4.

### 10.2 Level goals (one or more)

| Goal type       | Example               |
| --------------- | --------------------- |
| `reachTier`     | Create a tier-6 ball  |
| `score`         | Score 400             |
| `mergeCount`    | Make 6 tier-3 balls   |
| `clearObstacle` | Free all 4 ice balls  |
| `survive`       | Last 60 seconds       |
| `apex`          | Trigger an apex merge |

### 10.3 Constraints & obstacles

| Element        | Behavior                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------- |
| `dropLimit`    | Maximum number of drops                                                                      |
| `timeLimitSec` | Timer                                                                                        |
| `rock`         | Heavy non-merging ball. Fixed radius. Only removable if the level says so.                   |
| `ice`          | Frozen ball (looks glazed). Thaws when any merge happens touching it. Then behaves normally. |
| `wind`         | Periodic lateral force on all balls (`everySec`, `durationSec`, `force`)                     |
| `spawnBag`     | Override the drop distribution                                                               |

### 10.4 Level schema

```ts
interface LevelDef {
  id: number; // 1..N
  land:
    | 'sunmeadow-hollow'
    | 'driftmoor-cove'
    | 'whisperwood'
    | 'thistledown-hills'
    | 'copperleaf-orchard'
    | 'mistvale-marsh'
    | 'emberpeak'
    | 'cloudspire-isles'
    | 'frostglass-tundra'
    | 'neonoko-city'
    | 'starlit-harbor'
    | 'sunreach-spire'
    | 'skylight-sanctuary';
  name: string;
  seed: number;
  goals: Goal[]; // all must be met
  dropLimit?: number;
  timeLimitSec?: number;
  spawnBag?: [number, number, number, number, number]; // counts for tiers 1..5
  previewCount?: 1 | 2;
  obstacles?: Obstacle[]; // initial placements
  hazards?: { wind?: { everySec: number; durationSec: number; force: number } };
  stars: { two: StarRule; three: StarRule };
}
type StarRule = { dropsRemainingAtLeast?: number; secondsRemainingAtLeast?: number };
```

### 10.5 First ten levels (design intent)

| #   | Goal                | Constraint | Teaches                |
| --- | ------------------- | ---------- | ---------------------- |
| 1   | Reach tier 4        | none       | Drop and merge         |
| 2   | Reach tier 5        | none       | Planning               |
| 3   | Score 150           | none       | Scoring                |
| 4   | Make 6 tier-3 balls | none       | Specific merge targets |
| 5   | Reach tier 6        | 40 drops   | Efficiency             |
| 6   | Reach tier 5        | 3 rocks    | Obstacles              |
| 7   | Score 400           | 60 s       | Speed                  |
| 8   | Free 4 ice balls    | 35 drops   | Thaw mechanic          |
| 9   | Reach tier 6        | wind       | Hazards                |
| 10  | Reach tier 8        | 60 drops   | Mini-boss              |

Star rules: 1 star = goals met. 2 stars = goals met with at least 30% of the drop or time budget left. 3 stars = at least 50% left. Levels without a budget use score thresholds instead (set per level).

---

## 11. Share Card ("Family Tree" Keepsake)

Generated client-side on a `<canvas>` at 1080 × 1350 px:

1. Header: run score, mode, date.
2. Center: the highest-tier ball, drawn large. **Always rendered with its default Skylight-mote art, never a personalized photo/fused face, even if the run used a photo skin** — the share card is the one output that leaves the device, so it stays outside the personalization feature's private boundary entirely, on principle, not just as a technical default.
3. Beneath it: the top 3 levels of its merge ancestry as a small tree, sourced from the recorded merge log.
4. If the run used a Ladder skin, the tier ladder can still be shown by _name_ (e.g. "Tier 7: Alex") without the photo itself — Fusion's `weights` contribution bar likewise shows names/percentages only, never the fused image.
5. Footer: game name and short URL. QR code is a Phase 2 add-on.

Delivered through the Web Share API where available, otherwise download as PNG.

---

## 12. Modes Summary

| Mode                  | Description                                                 | Phase |
| --------------------- | ----------------------------------------------------------- | ----- |
| Classic               | Endless, seeded per run                                     | 1     |
| Journey               | Level map, goals, stars                                     | 1     |
| Daily Seed            | Same drop sequence for everyone, leaderboard                | 2     |
| Async Head-to-Head    | Same seed sent to a friend, higher score wins               | 3     |
| Prep Round (foldable) | Cover-screen mini-game whose result feeds the opening drops | 4     |

The core game accepts an optional `PrepResult` at start (`{ bonusDrops: Tier[]; startingPower?: PowerUpId }`) so the foldable feature needs no rewrite later.
