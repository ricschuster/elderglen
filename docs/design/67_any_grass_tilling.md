# 67 Diggable earth and the start look

Status: settled and built 2026-11-07 (owner: pale earth, no tillable green grass on the farm, yards pale too, rocks and forage may stand on the field, and a yellower tint for fertile land). Standard has 887 tillable tiles, all of the walkable ground bar paths. Woodland has 404 (46 percent), keeping green forest and its three forage clearings. Earlier text: draft, revised the same day. File name kept from the first
draft ("any grass"). The owner's playtest said "no tilled areas at start", and
then, asked what the start should look like, "hoe works on any grass". After the
Stardew check below the owner leaned to **pale earth** ("maybe the pale earth
makes the most sense"). That lean is the proposal here, not yet confirmed. Every
number is a placeholder. Nothing here is built. Stardew's saved Modding Maps,
Grass, Weeds, Hoe and Farm Maps pages were read as reference only and nothing is
copied (ADR 0002).

## The problem

The placeholder farm paints its 96 tillable tiles as a flat brown patch. The
owner read that as already tilled and could not tell what the hoe could do. The
rule underneath is a `soil` layer in the map (`05_farm_map_placeholder.md`): the
hoe works only on tiles marked there, and elsewhere it refuses ("cannot dig
here").

## What Stardew does (checked, saved pages read 2026-11-07)

- **Diggable is a per-tile property of the map.** The Modding Maps page lists
  `Diggable` as a tile property that "marks the tile as diggable with the hoe and
  enables planting crops". A tile also has a type (Dirt, Stone, Grass or Wood).
  So Stardew has a fixed tillable layer, as we do, and the hoe never works on a
  tile that lacks it.
- **Green grass and diggable ground are different things.** The Grass page says
  grass tufts spread only to tillable tiles and "will not naturally spread on
  green, 'grassy' tiles". So the farm's field is diggable earth that grass grows
  on as a clutter object, and green decorative grass elsewhere is not tillable.
  This matches the owner's point that lawn on the farm works, but it is not
  "grass" in the grown sense.
- **Tilled dirt wears off.** Modding Maps gives a per-location chance that empty
  tilled dirt disappears overnight, default 0.1 on farms, 0 in greenhouses and 1
  anywhere else. We have no such rule. Noted only, not proposed here.
- **Weeds** spawn on "any tillable tile" of the farm on day 1 of each season
  except winter, and spread to an adjacent tillable tile (saved Weeds page). That
  answers SC-62.
- **Size.** The Standard farm has 3,427 tillable tiles and 235 non-tillable but
  buildable ones (saved Farm Maps page, SC-25).

So "the hoe works on any green grass" is **not** Stardew. "The hoe works on the
whole field of pale diggable earth" is.

## Decision and proposal

Owner decision (2026-11-07): nothing looks tilled at the start, and the player
can tell what the hoe works on.

Proposal (**Recommended**): **pale diggable earth.** The field is a large area of
flat, light, unfurrowed earth, clearly lighter than the dark furrowed brown of
tilled soil, with the clutter of note 55 on it. Green grass stays on borders and
decorative patches and cannot be tilled. This is note 55's "big open field of
bare ground, grass border holds no crops" with two changes: the tile is paler,
and the field is big enough to feel like a farm (see "Size").

This drops the first draft's rule that any green grass tile is tillable. The
reasons: it matches Stardew, it keeps the map author's control (a `soil` layer
as now), and the player reads the ground by sight, since pale earth means
diggable and green means not.

## The rule

A tile can be tilled when all of these hold:

1. It is on a farm map (the house, mines, cave and hall have no soil layer and
   keep none).
2. It is marked tillable in the map's `soil` layer, which is drawn as pale earth
   and covers the field only.
3. It is clear: no tree, stump, rock, weed, forage, sprinkler, machine, chest, dug
   plot, exit, service tile or goods on it (`isClear` in `src/core/actions.ts`
   already checks these).

No rule code changes. `isTillable` stays. The changes are data and art.

## What to build (when approved)

1. Art: a new ground tile, pale untilled earth, flat with a light speckle and no
   furrows. The existing dark brown tile, the dry and wet soil textures and the
   tilled look stay as they are. The pale tile must differ from the dry tilled
   soil (`paintSoil` in `src/scenes/art.ts`) at a glance on a tablet.
2. The farm map JSON: paint the field with the new tile. Size per
   "Size".
3. The farm choice preview colours tiles by `isTillable`. It keeps working, and
   should use the same pale colour.
4. Tests: `tests/farmtypes.test.ts` (Woodland about 40 percent of Standard)
   still holds if both fields scale together.
5. Re-run the sim and the playtests.

## Size

The placeholder field is 96 tiles on a 40 by 30 map. Stardew's is 3,427 (saved
page). Note 55 already targets a map of about 80 by 65 (SC-25 half answered) and
leaves the tillable count open. This note does not set the count. It only says
the field should be a clear majority of the open ground, so a large part of the
farm reads as pale earth, as in the owner's playtest. Until note 55 is settled,
the placeholder can grow to a block of about 20 by 14 as a stopgap, with Woodland
scaled to about 40 percent as note 32 says. Weed spawn stays a fixed 20 a season
(`36_gathering_trees_sap_fiber.md`), so a bigger field does not change the fiber
supply on day 1. Spread is the only thing that grows with the field. See
question 1.

## Farm types

Unchanged. Every type still has less farmland than Standard, and each map marks
its own pale earth (`32_farm_types.md`).

## Open questions for the owner

1. **Weeds over a bigger field.**
   - (Stardew, Recommended) Weeds spawn on any tillable tile and spread to an
     adjacent tillable tile, as the saved Weeds page says. Our numbers stay (20
     a season, 10 percent spread a night). Re-run the sim, and add a cap on total
     weeds only if spread runs away.
   - A cap from the start, for example no spread while 60 weeds stand.
2. **Pale earth or green grass for the field?** Pale earth is proposed above and
   matches Stardew. The first draft's "any green grass tile" is not Stardew and
   is dropped unless the owner wants it back.
3. **Should the tile in front of each door stay green and untillable?** That
   stops crops walling in a building. (Stardew) The farm's buildable but
   non-tillable tiles suggest the same (saved Farm Maps page), but the page does
   not say which tiles. Proposal: yes, a one tile margin.
