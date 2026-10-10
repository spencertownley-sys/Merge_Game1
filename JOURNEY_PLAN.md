# Journey Plan: Levels, Story Mode and Player Journey

> Written 2026-10-10. Builds on `ART_AND_STORY_DIRECTION.md` §4 (the story and the 13 lands) and
> `GAME_DESIGN_MERGE_TIERS.md` §10 (goal types, obstacles, the `LevelDef` schema). Where this plan
> and those docs disagree, those docs win until they are updated to match. Every name, character
> and line here is original to this game.

---

## 1. Story mode: "The Scattered Skylight"

### 1.1 Premise (unchanged)

The Skylight once hung over the world and gave every land its colour. One night it cracked, and
its light scattered as countless small motes. The player is a **Keeper**, a quiet spirit who
gathers the motes and merges them until each land's colour comes back. There is no villain and
no combat. Failing a level only means trying again.

### 1.2 Cast

| Character                            | Role                                                                                                                                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Keeper** (player)              | Never speaks. Seen only as a small glow on the Journey map that moves from land to land.                                                                                                                                               |
| **Wick** (new), a paper-lantern moth | Carries the Keeper's map. Gives the tutorial hints, one line on each land's intro card, and a tip after a failed attempt. Warm, a little forgetful, never bossy. One voice for all guidance keeps the game feeling small and personal. |
| **Townsfolk**, one per land          | A single line each on the land's intro and restoration cards: a farmer in Sunmeadow, a lighthouse keeper in Driftmoor, a market cook in Neonoko. Drawn as silhouettes or hats, so they cost almost no art.                             |

### 1.3 How the story is told (cheap to build)

1. **Land intro card** when a land is first opened: the land's name, two lines of story, and
   Wick's line. The current level intro already shows a flavour line, so this is one new card.
2. **Level flavour line** on every level intro. This already exists (`flavor` in `LevelDef`).
3. **Restoration moment** when a land's last level is won: the backdrop shifts from dim to full
   colour, and the land's "restored" line plays. This already exists (`restored` in `lands.ts`);
   it gains a share prompt.
4. **Act interludes**: four short illustrated cards between acts, two or three lines each.
5. **Finale**: the apex merge reforms the Skylight above the Sanctuary, then a montage washes
   colour back over every land the player restored.
6. **Epilogue and post-game**: a closing card, then Starlight remixes and Classic stay open.

### 1.4 Four acts

| Act                       | Lands | Feeling                   | Story beat                                                                                                                      | Mechanic theme                       |
| ------------------------- | ----- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **I. Waking**             | 1–3   | Calm, curious             | The Keeper wakes in Sunmeadow, learns to gather light, and sets out along the coast and into the wood.                          | Drop, merge, ice, rock               |
| **II. The Wide World**    | 4–9   | Wonder, growing challenge | Each land is dimmer than the last. Wick finds old notes hinting that the Skylight cracked from strain, not from an attack.      | Wind, combinations, fog, tight boxes |
| **III. The Night Market** | 10–11 | Joy, then rest            | Neonoko City celebrates the returning light with a lantern festival. Starlit Harbor is the quiet morning after.                 | Combos and flourish, then a breather |
| **IV. The Climb**         | 12–13 | Resolve, then release     | The Keeper climbs Sunreach Spire. The truth: the Skylight scattered on purpose, so every land could hold some light of its own. | Everything at once, then the apex    |

**The gentle mystery.** Why did the Skylight crack? Small notes found in Acts II and III
suggest it had been straining to light every land alone. At the top of Sunreach Spire, the
Keeper learns it broke apart so the light could be shared. The finale does not put it back the
way it was. The Skylight reforms, and every restored land keeps a little of its own glow. This
keeps the tone wistful and kind, with no villain.

### 1.5 Land beats

| #   | Land               | What is dim                                 | Wick's line on arrival (draft)                        | What returns when restored                                |
| --- | ------------------ | ------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| 1   | Sunmeadow Hollow   | Barely anything. A safe place to learn.     | "Oh! You're awake. Shall we try catching some light?" | The windmill turns and the wildflowers find their colour. |
| 2   | Driftmoor Cove     | Motes frozen in the morning chill.          | "Careful, some of these are cold to the touch."       | The lighthouse lights, and the mist lifts off the water.  |
| 3   | Whisperwood        | Light tangled in fallen logs and stones.    | "Even old stones like a little warmth."               | Sunbeams come back through the canopy.                    |
| 4   | Thistledown Hills  | Wind scatters every mote it can reach.      | "Hold on to your glow. It's breezy up here."          | Kites fly again over the hills.                           |
| 5   | Copperleaf Orchard | The harvest festival was called off.        | "Ice _and_ stones? Someone's testing us."             | Lanterns string the orchard and the festival begins.      |
| 6   | Mistvale Marsh     | Fog so thick you can't see what comes next. | "I can't see past my own wings. Trust your eyes."     | Fireflies return to the reeds.                            |
| 7   | Emberpeak          | The forges have gone cold.                  | "We'll have to be quick and clever here."             | The forges glow and the hot springs steam.                |
| 8   | Cloudspire Isles   | The bridges between islands have faded.     | "Not much room up here. Mind the edges."              | Rainbow bridges link the islands again.                   |
| 9   | Frostglass Tundra  | Everything frozen solid.                    | "So much ice. So much light inside it."               | Aurora ribbons fill the sky.                              |
| 10  | Neonoko City       | The night market is dark and quiet.         | "They say this city loves a show!"                    | The lantern festival lights the whole city.               |
| 11  | Starlit Harbor     | Just the dimness of early morning.          | "Let's rest a moment. You've earned it."              | The harbor reflects the stars at dawn.                    |
| 12  | Sunreach Spire     | The stairs vanish into the dark.            | "Whatever happened up there, we're nearly there."     | The tower's windows light floor by floor.                 |
| 13  | Skylight Sanctuary | The empty place where the Skylight hung.    | "This is where it all began."                         | The Skylight shines again, and every land answers it.     |

---

## 2. Level plan

### 2.1 Principles

- **Three or four levels per land, 41 in total.** Each land introduces one idea, gives the
  player room to practise it, and ends on a mini-boss level that tests it.
- **Sawtooth difficulty.** Every land's first level is easier than the previous land's boss.
  Starlit Harbor is a full breather land before the final climb.
- **Failing is soft.** After a failed attempt, Wick gives one tip. After three failures on the same
  level, offer "a little more room" (+20% drops or time) for that attempt, with stars capped at
  two.
- **Budgets come from data, not guesses.** The re-tuned board was measured with a simulated
  player making sensible drops, over 40 seeded runs:

| Drops allowed | Highest tier the bot reached                      |
| ------------- | ------------------------------------------------- |
| 20            | tier 5 in 22 runs, tier 6 in 18                   | Cold Forge | Reach tier 7 | 60 drops | A tight budget (built) |
| 40            | tier 6 or higher in every run, tier 7 in 13 of 40 |
| 60            | tier 7 in 31 runs, tier 8 in only 6               |
| 80            | tier 8 in 14 of 40                                |
| 120           | tier 8 in 28 runs, tier 9 in 4                    |

No bot run hit game over within 120 drops, so the box is roomy: run length is limited by
drop budgets and goals, not by overflow. Targets for the bot's pass rate per level role:
**intro ≥ 90%, practice ≈ 70%, boss 40–55%.** Human playtests then confirm the feel.

- **Tier ceilings by act.** Act I asks for at most tier 6, with a tier-8 boss. Act II asks for
  tiers 6–8. Act IV may ask for tier 9 or 10. The apex (two tier-11 motes merging) is effectively
  out of reach by normal play on this board, so the finale sets it up on purpose (§2.3).

### 2.2 Levels by land

Levels 1–10 exist today (level 10 was rebalanced to 100 drops for the new board). Levels 11–41
are new. "New code" marks the four mechanics that need engine work (§2.4); everything else uses
goal types, obstacles and hazards the engine already supports.

| #   | Land               | Level name (draft)  | Goal                             | Constraint                            | Teaches / note                      |
| --- | ------------------ | ------------------- | -------------------------------- | ------------------------------------- | ----------------------------------- |
| 1   | Sunmeadow Hollow   | First Light         | Reach tier 4                     | none                                  | Drop and merge (exists)             |
| 2   | Sunmeadow Hollow   | The Windmill Path   | Reach tier 5                     | none                                  | Planning (exists)                   |
| 3   | Sunmeadow Hollow   | Wildflower Fields   | Score 150                        | none                                  | Scoring (exists)                    |
| 4   | Sunmeadow Hollow   | Lantern Evening     | Make 6 tier-3 motes              | none                                  | Specific targets (exists)           |
| 5   | Driftmoor Cove     | Fog on the Water    | Reach tier 6                     | 40 drops                              | Efficiency (exists)                 |
| 6   | Driftmoor Cove     | Morning Chill       | Free 4 ice motes                 | 35 drops                              | Thawing (exists)                    |
| 7   | Driftmoor Cove     | Lighthouse Watch    | Score 400                        | 60 s                                  | Speed (exists)                      |
| 8   | Whisperwood        | Fallen Logs         | Reach tier 5                     | 3 rocks                               | Rocks (exists)                      |
| 9   | Whisperwood        | Between the Trunks  | Reach tier 6                     | wind                                  | First breeze (exists)               |
| 10  | Whisperwood        | Heart of the Wood   | Reach tier 8                     | 100 drops, 1 rock                     | **Boss** (exists, rebalanced)       |
| 11  | Thistledown Hills  | Kite Day            | Reach tier 6                     | gentle wind                           | Reading the wind (built)            |
| 12  | Thistledown Hills  | Gusts and Gaps      | Score 500                        | strong wind, 70 s                     | Timing drops (built)                |
| 13  | Thistledown Hills  | The High Meadow     | Reach tier 7                     | strong wind, 28 drops                 | **Boss** (built)                    |
| 14  | Copperleaf Orchard | Frost on the Apples | Free 3 ice motes                 | 2 rocks, 50 drops                     | Two obstacles at once (built)       |
| 15  | Copperleaf Orchard | Basket by Basket    | Make 5 tier-4 motes              | wind, 31 drops                        | Targets under pressure (built)      |
| 16  | Copperleaf Orchard | Festival Eve        | Reach tier 8                     | 2 ice + rock, 90 drops                | **Boss** (built)                    |
| 17  | Mistvale Marsh     | Into the Reeds      | Reach tier 6                     | fog (no Next preview)                 | Playing without a preview (built)   |
| 18  | Mistvale Marsh     | Stepping Stones     | Free 6 ice motes in a tight row  | fog, 26 drops                         | Deliberate obstacle layouts (built) |
| 19  | Mistvale Marsh     | Firefly Hollow      | Score 900                        | fog + 3 rocks, 104 drops              | **Boss** (built)                    |
| 20  | Emberpeak          | Cold Forge          | Reach tier 7                     | 60 drops                              | A tight budget (built)              |
| 21  | Emberpeak          | Ember Rain          | Score 700                        | 70 s, bag weighted to tiers 3–5       | Big drops, little room (built)      |
| 22  | Emberpeak          | The Great Bellows   | Reach tier 8                     | 88 drops                              | **Boss** (built)                    |
| 23  | Cloudspire Isles   | Two Islands         | Reach tier 6                     | a pillar splits the box — new code    | Shaped boxes                        |
| 24  | Cloudspire Isles   | Narrow Bridge       | Make 4 tier-5 motes              | a narrowed box — new code             | Stacking in tight spaces            |
| 25  | Cloudspire Isles   | Sky Harbour         | Reach tier 8                     | pillars + wind, 100 drops             | **Boss**                            |
| 26  | Frostglass Tundra  | Ice Field           | Free 8 ice motes                 | none                                  | Chains of thaws                     |
| 27  | Frostglass Tundra  | Glacier Gate        | Reach tier 7                     | 6 ice motes, 45 drops                 | Using ice as a floor                |
| 28  | Frostglass Tundra  | The Frozen Heart    | Free 10 ice motes, some tier 5–6 | 90 drops                              | **Boss**                            |
| 29  | Neonoko City       | Opening Night       | Make a ×4 combo — new code       | none                                  | Combos on purpose                   |
| 30  | Neonoko City       | Rush Hour           | Score 1,200                      | 90 s                                  | Speed and flourish                  |
| 31  | Neonoko City       | Lantern Parade      | Two ×5 combos and reach tier 8   | 110 drops                             | **Boss**                            |
| 32  | Starlit Harbor     | Low Tide            | Reach tier 7                     | none                                  | Breather                            |
| 33  | Starlit Harbor     | Boats at Rest       | Score 600                        | none                                  | Breather                            |
| 34  | Starlit Harbor     | Dawn Bells          | Make 3 tier-6 motes              | none                                  | Breather, gentle mastery            |
| 35  | Sunreach Spire     | The First Stair     | Reach tier 8                     | fog + wind, 100 drops                 | Combined pressure                   |
| 36  | Sunreach Spire     | Narrow Landing      | Free 5 ice motes                 | narrowed box, 60 drops                | Combined pressure                   |
| 37  | Sunreach Spire     | Racing the Sunrise  | Reach tier 9                     | 150 s                                 | Endurance                           |
| 38  | Sunreach Spire     | The Top Room        | Reach tier 9                     | 3 rocks, 120 drops                    | **Boss**                            |
| 39  | Skylight Sanctuary | Gathering           | Reach tier 9                     | none                                  | Everything, calmly                  |
| 40  | Skylight Sanctuary | Fragments           | Reach tier 10                    | 2 frozen tier-8 "fragments"           | Building on the past                |
| 41  | Skylight Sanctuary | The Skylight        | Apex merge                       | 2 frozen tier-10 fragments, 150 drops | **Finale** (§2.3)                   |

### 2.3 Making the finale possible

An apex merge needs two tier-11 motes, which normal play on this board almost never produces.
The finale places **frozen Skylight fragments** in the box at the start: ice-obstacle motes of
tier 10, using the existing `ice` obstacle with a `tier`. A fragment thaws when a merge happens
beside it, and can then merge like any mote. The player's task is to build their own tier 10 and
merge it into a thawed fragment to make a tier 11, twice, then merge the two tier-11s. This uses
only existing engine features. It still needs simulation and human tuning, so treat the numbers
above as a starting point.

### 2.4 New engine work

| Mechanic                                                                | First used | What it needs                                                                                                                                       | Size   |
| ----------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Fog** (no Next preview) — built                                       | Land 6     | Allow `previewCount: 0` in `LevelDef`; hide the Next pill; a short fog overlay over the hanging zone.                                               | Small  |
| **Shaped boxes** (pillars, narrowed walls)                              | Land 8     | A `walls` list in `LevelDef`: extra static colliders built with the board's walls, drawn as glass. Must stay deterministic; add a determinism test. | Medium |
| **Combo goal**                                                          | Land 10    | A `combo` goal type (reach a combo of N, optionally K times), read from `merge` events' `comboCount`.                                               | Small  |
| **Land intro and act cards** — land arrival stories built for lands 6–7 | Land 1     | One card component with land art, two story lines and Wick's line; shown once per land and act.                                                     | Small  |

### 2.5 Release waves

| Wave                  | Content                                        | Needs                                                        |
| --------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| **1 (now + 2–3 wks)** | Lands 1–5, levels 1–16                         | Only existing mechanics; intro cards; final land art for 1–5 |
| **2**                 | Lands 6–9, levels 17–28                        | Fog and shaped boxes                                         |
| **3**                 | Lands 10–13, levels 29–41, finale and epilogue | Combo goal, act cards, the finale sequence                   |

Each wave: write the `LevelDef`s, run the simulated-player balance check against the pass-rate
targets in §2.1, then playtest with two or three people on phones.

---

## 3. Player journey

The journey from "never heard of it" to "finished the story and still playing", built without
accounts, ads or tracking.

| Stage                          | What the player should feel    | What happens                                                                                                                                                                                                                   | What to build                                                                                                   |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **1. Discover**                | "That looks gentle and fun."   | They meet it on the personal site's TV, through a shared result card, or from a link.                                                                                                                                          | Link previews (done). Share cards that link back to the game. A short gameplay clip for social posts.           |
| **2. First minute**            | "I get it. That felt good."    | A first-time player goes straight into Journey level 1, not a menu. Wick gives three hints: drag to aim, let go to drop, matching motes merge. The first merge lands within 10 seconds.                                        | First-run routing to level 1. Three hint bubbles that fade after use. A small celebration for the first tier 4. |
| **3. First session (≈10 min)** | "I made something better."     | They finish Sunmeadow's four levels, and the land's colour returns: the first restoration moment. Classic unlocks as "free play".                                                                                              | Restoration moment with a share prompt. A "Continue" button on Home for the next level.                         |
| **4. Coming back (days 2–7)**  | "I want to see the next land." | Home shows the next land's silhouette and Wick's teaser line. A **Daily Glow**: one Classic run per day from a date-based seed, the same for everyone, playable offline. A gentle days-played count, never a punishing streak. | Next-land teaser. Daily Glow (local only; no leaderboard until Phase 2). Days-played counter.                   |
| **5. Mastery (week 2+)**       | "I can do this better."        | Three-star replays. A **Skylight Album** collects every tier seen, every land restored, and firsts such as a first ×5 combo or first tier 9.                                                                                   | Album screen. Local achievements. A star total on the map.                                                      |
| **6. The finale**              | "That meant something."        | The Sanctuary levels, the apex merge, the Skylight reforming, and the montage of restored lands.                                                                                                                               | Finale sequence and epilogue card.                                                                              |
| **7. After the story**         | "There's still more to play."  | **Starlight remixes** replay each land with a twist: fog everywhere, a narrow box, or double wind. Classic and Daily Glow continue. New lands arrive as content updates.                                                       | Remix flag per land (reuses level data with modifiers). Post-launch land drops.                                 |

**The share loop.** Restoring a land and setting a new best both offer a share card. The card
shows the land, the top mote, and the game's name and link, so every share is an invitation.

**Measuring it.** Today the game sends nothing anywhere, by design, so there is no way to see where
players stop. There are two options, and the choice is the owner's: keep it fully private and rely
on playtests, or add privacy-friendly, cookieless counts (for example "level 6 started / won"). The
second option needs a network call, which goes beyond the Phase 1 "no network" rule in
`CLAUDE.md`.
