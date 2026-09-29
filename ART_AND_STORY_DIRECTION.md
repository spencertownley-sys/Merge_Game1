# Smoosh (working title) — Visual Style, Storyline & Higgsfield Art Direction

**Version:** 1.0
**Date:** 2026-09-28
**Status:** Canonical source for visual style and narrative. Mechanical numbers (tier radii, physics, scoring) stay in `GAME_DESIGN_MERGE_TIERS.md` — this doc reskins the _look and story_ on top of that unchanged mechanical foundation. Tier count (11), radius formula, scoring, and rim-style-for-accessibility all stay exactly as specified there.

---

## 1. Visual Style Direction

**Overall style:** soft pastel watercolor anime — think a Ghibli-adjacent storybook wash rather than a glossy 3D-render toy. Visible paper/watercolor texture, gentle bleeding edges, delicate thin ink linework on top of soft color washes, warm diffused light. This is a meaningful change from the earlier "glossy collectible toy" direction — it fits the fantasy-journey framing much better and should read as consistent across every tier orb, every land's background art, and the UI chrome (buttons, cards, the journey map itself).

**Style keywords to reuse in every Higgsfield prompt** (the consistent "look-lock" phrase):

> _soft pastel watercolor anime illustration, visible paper texture, delicate thin ink outlines, warm diffused lighting, gentle color bleed at edges, dreamy soft-focus, Studio Ghibli–inspired storybook quality, no text, no watermark_

**Color approach:** each land gets its own pastel palette (see §3), but every palette stays desaturated/soft — even Neonoko City's neon signage should read as _pastel_ neon (soft glowing pinks, lavenders, mints) rather than saturated arcade neon, so it doesn't clash with the rest of the world.

**⚠️ Revised 2026-09-28 — two materials, one world:** the _world_ (lands, backgrounds, journey map, UI chrome) stays soft pastel watercolor anime exactly as above. The _tier motes themselves_ (the physical game pieces) switched to a distinct material: **glossy, translucent gummy-candy** — a soft jelly body with light glowing inside it, a glossy sugared exterior, and edges that refract rather than fade into paper texture (see approved reference art and game design doc §9). This is a deliberate two-material approach, not a contradiction: the watercolor world is the "storybook," and the gummy motes are treated like little pieces of stage candy sitting on top of it — their in-game charm (bounce, squish-on-landing, translucency) reads better as candy than as painted objects, and it's also the material that makes the face-fusion glow (§5, game design doc §9.3) actually work — a face has to glow _through_ something, and gummy material does that far better than flat watercolor paint.

**Practical note for the shader:** the sphere shader (game design doc §9.3) now expects a tightly-cropped "core" texture per ball — a face/portrait with a **radial-feathered alpha edge** (opaque center, transparent by the crop boundary) rather than the old hard-edged vignette-to-flat-color approach. The shader blurs and dims this core toward the rim to fake light traveling through gummy material, and tints everything with the tier's gummy body color (which is always the tier's rim color from §3 — never sampled from the art). Generate each tier mote's core art on a plain transparent background so that feathering and blur behave predictably.

---

## 2. Tier Motes — "Skylight Fragments," Rendered as Gummy-Candy Light

The story (§4) reframes what the balls _are_: pieces of a shattered light source called the Skylight, growing brighter and more whole as they merge. Same 11 tiers, same radius/scoring math, same rim-style-for-colorblind-accessibility system from the game design doc — the names and color story are unchanged from the original reskin. What changed (2026-09-28) is the _material_: each mote is no longer a painted object (a dewdrop, a petal, a paper lantern) but a **glossy, translucent gummy-candy orb** with that tier's colored light glowing inside it — always a simple round-to-oval silhouette (never a literal petal/lantern/marble shape), since the physics collider is always a circle and the approved reference art is a plain round gummy blob. The old per-tier "object" language below now describes the _color and mood of the glow_, not a shape to render.

| Tier | New name         | Glow concept (color/mood, not a literal shape)                            | Rim color = gummy body color (unchanged) | Higgsfield prompt (append the style keywords from §1)                                                                                                                                                                                                                                                |
| ---- | ---------------- | ------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Dewdrop Mote     | Barely-there dew-clear light, just waking up                              | `#F25F5C`                                | "a tiny round glossy translucent coral-pink gummy-candy orb, soft jelly material, faint warm light glowing at its center, glossy sugared surface, simple cute face glowing softly inside, plain transparent background"                                                                              |
| 2    | Petal Spark      | A small spark caught inside, warm orange-pink                             | `#FF9F1C`                                | "a small round glossy translucent orange-pink gummy-candy orb, soft jelly material, a small spark of warm light glowing inside, glossy sugared surface, simple cute face glowing softly inside, plain transparent background"                                                                        |
| 3    | Glimmer Bead     | Polished, warm golden glow                                                | `#FFD23F`                                | "a round glossy translucent golden-yellow gummy-candy orb, soft jelly material, warm glimmering light glowing inside, glossy sugared surface, simple cute face glowing softly inside, plain transparent background"                                                                                  |
| 4    | Moonstone Marble | Pale, swirling green-white glow                                           | `#9BD770`                                | "a round glossy translucent pale-green gummy-candy orb, soft jelly material, a soft swirling green-white light glowing inside, glossy sugared surface, simple cute face glowing softly inside, plain transparent background"                                                                         |
| 5    | Lantern Wisp     | Warm teal, like a small flame                                             | `#2EC4B6`                                | "a round glossy translucent teal gummy-candy orb, soft jelly material, a warm lantern-like glow at its center, glossy sugared surface, simple cute face glowing softly inside, plain transparent background"                                                                                         |
| 6    | Bloom Orb        | Soft blooming blue light                                                  | `#3AA6F0`                                | "a round glossy translucent sky-blue gummy-candy orb, soft jelly material, soft blooming light glowing inside, glossy sugared surface, simple cute face glowing softly inside, plain transparent background"                                                                                         |
| 7    | Snowglobe Charm  | Indigo glow with a faint dreamy sparkle                                   | `#5B6CFF`                                | "a round glossy translucent indigo gummy-candy orb, soft jelly material, a dreamy sparkling light glowing inside, glossy sugared surface, simple cute face glowing softly inside, plain transparent background"                                                                                      |
| 8    | Cloud Balloon    | Lavender, soft and drifting                                               | `#9B5DE5`                                | "a round glossy translucent lavender gummy-candy orb, soft jelly material, a soft drifting glow inside, glossy sugared surface, simple cute face glowing softly inside, plain transparent background"                                                                                                |
| 9    | Moon Shard       | Cool pink-silver moonlight glow                                           | `#F15BB5`                                | "a round glossy translucent pink-silver gummy-candy orb, soft jelly material, a cool moonlit glow inside, glossy sugared surface, simple cute face glowing softly inside, plain transparent background"                                                                                              |
| 10   | Sun Shard        | Warm radiant orange-gold glow                                             | `#E07A5F`                                | "a round glossy translucent orange-gold gummy-candy orb, soft jelly material, a warm radiant glow inside, glossy sugared surface, simple cute face glowing softly inside, plain transparent background"                                                                                              |
| 11   | Skylight (apex)  | The reformed whole — radiant gold-pink shimmer, sun and moon light joined | `#FFD700` (animated shimmer)             | "a round glossy translucent gold-pink gummy-candy orb, soft jelly material, a radiant shimmering light glowing inside made of joined sun and moon glow, glossy sugared surface, the most luminous and detailed orb in the set, simple cute face glowing softly inside, plain transparent background" |

Physics note: every mote stays a **perfect circle while falling or at rest**, and only squashes — flattening and rebounding with a little bounce — on landing impact, per game design doc §9.2b. Higgsfield art should be generated as the resting (round) state; the squash is a runtime animation, not a separate art asset.

> ⚠️ Note for whoever builds the shader integration: the _mechanical_ rim-style system (solid/dashed/double per game design doc §3) still needs to render on top of this gummy material so tiers stay readable without color — a thin ring in the tier's rim/gummy color, styled to sit just inside the glossy silhouette, keeps both systems working together.

---

## 3. Land Concept Art — Higgsfield Prompts

Each land needs one hero background/concept piece (used on the journey map node and as the in-level backdrop) plus, optionally, a couple of small prop/decoration pieces. Use the same style-keyword phrase from §1 on every one, appended after the specific description below.

| Land                                   | Concept prompt (append style keywords)                                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Sunmeadow Hollow (starting village) | "a small cozy farming village at golden hour, thatched roof cottages, a windmill, wildflower fields, warm peaceful light, a dirt path winding through, no people, wide establishing shot"                                      |
| 2. Driftmoor Cove                      | "a foggy pastel-blue fishing cove, small wooden boats, a lighthouse on a cliff, soft mist rolling over calm water, gentle morning light"                                                                                       |
| 3. Whisperwood                         | "a quiet pastel-green forest clearing, dappled sunlight through tall trees, soft moss, floating light motes drifting between the trunks"                                                                                       |
| 4. Thistledown Hills                   | "windswept rolling hills covered in pale lavender thistledown flowers, a few scattered stones, wind visibly bending the grass, soft cloudy sky"                                                                                |
| 5. Copperleaf Orchard                  | "a warm autumn orchard in soft copper and amber tones, fruit trees in gentle rows, fallen leaves drifting, a small harvest-festival banner"                                                                                    |
| 6. Mistvale Marsh                      | "a dreamy misty wetland, soft teal-grey tones, wooden stilted walkways, glowing will-o-wisp lights hovering over still water"                                                                                                  |
| 7. Emberpeak                           | "the foothills of a gentle volcano at dusk, warm coral and rose tones, soft glowing embers drifting upward, terraced stone paths"                                                                                              |
| 8. Cloudspire Isles                    | "small floating islands among soft pastel clouds, connected by delicate rope bridges, pale lavender-pink sky, distant glowing motes drifting between islands"                                                                  |
| 9. Frostglass Tundra                   | "a pale icy plain under a soft winter sky, crystalline ice formations in pastel blue and white, gentle snowfall, aurora-like glow above"                                                                                       |
| 10. Neonoko City                       | "a bustling night market city street, soft pastel-neon lantern signs in pink lavender and mint (not saturated arcade neon — soft glowing pastel tones), narrow winding streets, paper lanterns strung overhead, warm dusk sky" |
| 11. Starlit Harbor                     | "a quiet moonlit harbor just after a busy night, soft silver-blue tones, boats gently rocking, lantern light reflecting on calm water, a crescent moon overhead"                                                               |
| 12. Sunreach Spire                     | "a tall spiraling tower reaching toward a warm sunrise sky, soft gold and coral tones, floating stairways, gentle radiant light at the summit"                                                                                 |
| 13. The Skylight Sanctuary (finale)    | "a circular sanctuary open to the sky, soft radiant gold-pink light pouring down from a reforming sun-moon orb above, gentle floating light motes converging, the most luminous and detailed scene in the set"                 |

---

## 4. Storyline — "The Scattered Skylight" (working title; the game's own name is separate and still TBD)

### 4.1 Premise

Long ago, a single radiant orb called **the Skylight** hung above the world and gave every land its color, warmth, and quiet magic. One night, it cracked and scattered — countless tiny motes of its light scattering across every land, leaving each one dimmer and greyer than before. You play as a small **Keeper spirit**, the kind of quiet helper who shows up when a place needs its light back. Your task, land by land, is to gather the scattered motes and merge them — small light joining small light — until each land's color and warmth return, and the Skylight itself is finally made whole again.

There's no villain, no combat, and nothing truly bad happens if a level goes wrong — a Keeper just tries again. The tone stays gentle and a little wistful throughout, even as the lands themselves grow more fantastical and the challenges grow harder.

### 4.2 Structure

- **13 lands** at launch (comfortably within the 10-15 range), each holding roughly 2-3 Journey levels from the existing level-count budget (the game design doc's 30-level Phase-1 target can map to the first several lands, with more lands/levels added over time rather than needing all 13 fully fleshed out on day one).
- Each land has a one-line "what changes when it's restored" beat — visually, the land's backdrop shifts from a dimmer/greyer version to its full pastel-watercolor palette once its final level is cleared. That before/after shift _is_ the emotional payoff of finishing a land, and costs nothing extra to build since it's just a palette swap on existing art.
- Difficulty, obstacle variety (rock/ice/wind per game design doc §10.3), and goal-type variety (§10.2) ramp up gradually across the list below — early lands are close to obstacle-free, later lands combine several mechanics at once.

### 4.3 The Lands

1. **Sunmeadow Hollow** — _starting village._ Peaceful farming village; the shadow hasn't really reached here, so nothing feels at risk. Pure tutorial: drop, merge, watch what happens. Lowest stakes in the game, deliberately.
2. **Driftmoor Cove** — a foggy fishing village just down the coast. Introduces the **ice** obstacle (frozen motes caught in the cove's morning chill).
3. **Whisperwood** — a quiet forest. Introduces the **rock** obstacle (fallen logs and stones tangled with motes).
4. **Thistledown Hills** — windswept hills. Introduces the **wind** hazard.
5. **Copperleaf Orchard** — an autumn harvest-festival orchard. First land to combine two obstacle types in one level.
6. **Mistvale Marsh** — misty wetlands. Trickier layouts; obstacles start appearing in tighter, more deliberate arrangements rather than scattered randomly.
7. **Emberpeak** — volcanic foothills. Warmer palette, higher score/tier targets; first land to introduce a level with a tight drop limit.
8. **Cloudspire Isles** — floating sky islands. Dreamy, higher-difficulty spatial layouts (levels built around narrow floating platforms conceptually, even though the physics board itself stays the same shape).
9. **Frostglass Tundra** — icy plains. Ice-obstacle-heavy gauntlet land; the hardest "obstacle" land before the story's tonal shift.
10. **Neonoko City** — a sudden, delightful tonal shift: a bustling night-market city, pastel neon lanterns, a much livelier energy than anything before it. Mechanically, this is where combo-chasing and apex-merge goals start being emphasized over pure obstacle-dodging — the city rewards speed and flourish, not caution.
11. **Starlit Harbor** — the quiet harbor just outside the city, after the night market winds down. A deliberate breather land — gentler again, mirroring Sunmeadow Hollow's calm but with everything the player has learned since.
12. **Sunreach Spire** — a tall tower climbing toward sunrise. The game's hardest obstacle/goal combinations live here, as the literal and narrative climb toward the finale.
13. **The Skylight Sanctuary** — _finale land._ No new obstacles — this land is about the player using everything they've learned. Its final level requires an **apex merge** (per game design doc §5.4), visually reforming the Skylight above the sanctuary and washing color back over a small montage of the earlier lands.

### 4.4 Extending past launch

Because each land is just (a) a palette + concept art per §3, (b) a handful of `LevelDef` entries per the schema in the game design doc §10.4, and (c) an optional new obstacle/goal combination, new lands can be added post-launch without any new game systems — purely content. This list can extend indefinitely past 13 if the game finds an audience; nothing about the architecture caps it at 13.

---

## 5. Relationship to the Personalization (Photo Fusion) Feature

The photo/face-fusion system described in the game design doc §8 is **not part of the initial build** (see the PRD's revised phasing) — it ships later, as a second build stage after the core game and story. It's free, not a purchase, and gated only by a one-time 18+ self-attestation + privacy interstitial; everything it produces stays strictly private to the player's own device. When it does ship, the **default Skylight-mote art above (now the gummy-candy material per §2) stays the base experience for every player**; photo skins remain an optional personal layer on top — rendered as a face glowing inside the same gummy material rather than printed on it (game design doc §9.3) — visible only to the player who made them. Nothing about this story or art direction changes because of that — the fictional lands and the Skylight-mote art are what every player sees by default, whether or not they ever add their own photos, and the share card (§11 of the game design doc) always shows the default Skylight-mote art regardless.
