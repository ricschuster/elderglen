# 67 Tilling on any grass (draft)

Status: draft, 2026-11-07. One decision came from the owner after a browser
playtest: "no tilled areas at start" and, asked how the start should look,
"hoe works on any grass". Everything else here is the assistant's proposal and
every number is a placeholder. Nothing here is built. Stardew's saved Hoe,
Tools and Farm Maps pages were read as reference only and nothing is copied
(ADR 0002).

## The problem

The placeholder farm paints its 96 tillable tiles as a flat brown patch. The
owner read that as already tilled and could not tell what the hoe could do. The
rule underneath is a `soil` layer in the map (`05_farm_map_placeholder.md`): the
hoe works only on tiles marked there, and grass elsewhere refuses ("cannot dig
here").

## Decision (owner, 2026-11-07)

**The hoe works on any open grass tile.** Nothing on the farm looks tilled at the
start. Brown soil appears only where the player digs. The brown patch goes.

## What it overrides

- **Note 55, decision 6 and the "big open field of bare ground".** Note 55 had a
  field of bare earth with a grass border that holds no crops. With this
  decision the whole open lawn is farmland and the border rule goes. The
  cluttered, cleared-by-hand look of note 55 stays, since trees, stumps, rocks and
  weeds still sit on the grass until cleared.
- **Note 32, "every type has less farmland".** Farmland is no longer a fixed
  layer, so a type's size is how much open grass it starts with, and clearing
  adds more. See "Farm types".
- **Stardew.** Stardew tills only exposed soil and keeps a fixed tillable layer
  per farm (saved Hoe and Farm Maps pages, which count tillable and
  non-tillable but buildable tiles). So this is our own rule.

## The rule

A tile can be tilled when all of these hold:

1. It is on a farm map (not the house, mines, cave or hall, which have no soil
   layer today and keep none).
2. Its ground is grass. Not path, water, wall or any blocked tile, and not an
   exit or service tile.
3. It is clear: no tree, stump, rock, weed, forage, sprinkler, machine, chest,
   dug plot or goods on it (`isClear` in `src/core/actions.ts` already checks
   these).

The map contract keeps a layer, but it changes meaning: `soil` is renamed
"tillable" in the notes and marks every open grass tile the generator or the
map author allows. It is still data, so a map can fence off lawn that must stay
lawn, such as the greenhouse patch or a flower bed. It is no longer drawn
differently. The ground tile for the old patch becomes ordinary grass.

Chosen over a pure runtime check on the ground tile id because the map author
keeps control of the exceptions and the rule code (`isTillable`) does not change.

## Knock-on effects

- **Weeds** (`29_weeds.md`, `36_gathering_trees_sap_fiber.md`). Weeds spawn and
  spread on tillable tiles. Over the whole lawn that is about 1,000 tiles
  instead of 96 on the 40 by 30 placeholder, so spread at 10 percent a night
  would run away and fiber supply would swell. See question 1.
- **Woodland's fiber gate** (note 63, sim finding in handoff 2026-11-07e): the
  day 1 count of 20 is unchanged, but more free tiles for spread means more
  fiber. Re-run the sim after the build.
- **Farm choice preview** (`FarmChoiceScene`) colours tiles by `isTillable`. It
  would show the whole lawn. Change it to show the open grass share, which is
  what the card now means.
- **Sim bot** (`scripts/sim/bot.ts`) picks tiles to till from `isTillable` and
  clears weeds to find soil. It still works but will choose tiles by distance to
  the bin or water, which it does not do today. Check its numbers after.
- **Sprinklers, fruit trees and fertilizer** need no rule change. Sprinklers
  already water only dug tiles.
- **Tests:** `tests/farmtypes.test.ts` asserts Woodland has 35 to 50 percent of
  Standard's tillable tiles. That becomes a check on open grass at the start,
  with trees counted as not open. `tests/map.test.ts` fixtures keep working.
- **Saves:** no change. Dug plots are saved already.

## Farm types

Woodland's perk was a small farm. With any-grass its dense trees and stumps
still leave about 40 percent of the lawn open on day 1, so the start is the same.
The difference is that the player can clear more, and Woodland's large stumps
regrow (`32_farm_types.md`), so some of it keeps coming back. That fits the
foraging theme. The size row in note 32 then reads "open grass at the start".
Later types do the same with water, rock and clutter.

## Build plan (when approved)

1. `scripts/gen-farm-map.mjs`: stop painting the patch. Mark the open grass as
   tillable and leave paths, water, buildings and a margin by each door off.
2. Repaint nothing: the old soil ground tile stays in the tileset unused.
3. Update the farm choice preview, the farm types test and the notes named above.
4. Re-run the sim and the playtests, and re-tune the weed spread if question 1
   needs it.

## Open questions for the owner

1. **Where do weeds spawn and spread?**
   - Anywhere tillable, with the spread chance cut so the farm does not drown
     (our proposal, **Recommended**). Placeholder: spread stays 10 percent but a
     weed only spreads while fewer than 60 weeds are on the farm.
   - Only within a few tiles of dug soil, so the lawn stays tidy.
   - (Stardew) Not known: the saved Weeds page gives no spawn area. Marked open
     as SC-62.
2. **Does the lawn by a door stay clear?** Tilling the tile in front of a door
   would let a player wall in a building with crops. Proposal: the tile faced
   from each door and the paths cannot be tilled. (Stardew) Stardew's tillable
   layer excludes such tiles, from memory.
3. **Is any-grass the rule for every farm type**, or does one type (Hilltop,
   Riverside) keep a fixed field? Proposal: every type, so one rule.
