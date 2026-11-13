# 78 Quarry (draft)

Status: draft, written 2026-11-08 after the owner chose it (note 71, answer 11).
Built 2026-11-09 (#649), see "Built status" at the end. It designs the Quarry map off the Mountain, the repaired
bridge, the regrowing stone and ore, and the stonekeeper dwarf's job. Overview:
`71_map_areas_overview.md`. Stardew facts are from the saved Quarry page (read
2026-11-08, SC-91) and Mountain page (SC-85), as ideas only (ADR 0002).

## Why

Stone is needed in bulk by the carpenter, the Woodland bundle and the Last Seat
(100 stone, note 16, bundle 30), and the Mountain's rocks do not come back
quickly. Stardew solves it with a Quarry past a bridge that a bundle room mends,
where rocks and ore regrow every day. The owner asked for the same for the
stonekeeper dwarf, whose job note 20 only called "bridges and stonework".

## Decisions (draft)

1. **One map, `quarry`, 60 by 44 tiles** (2,640, our own guess, note 19). Longest
   crossing about 12 seconds. Stardew's Quarry is part of its Mountain map (saved
   page). Ours is its own map, so its nightly spawn table and its map properties
   are its own.
2. **One way in, from the Mountain's east road,** across a plank bridge over a
   ravine (note 74, the Quarry exit). Nothing else leads here.
3. **The bridge is ruined until a bundle room mends it** (Stardew: the Crafts Room,
   saved page). Which room is open question 1. The gate is the condition
   `quarry-open` (note 71, contract need 6), read from the hall as the greenhouse
   is (`Hall.roomComplete`), with no saved flag. The morning report says the
   bridge is mended.
4. **Stone and ore regrow every night.** The map has a nightly spawn table (new
   contract need 10 in note 71). Existing rocks block new ones, so clearing the
   map keeps the spawns coming, as the saved page says.
5. **No villagers walk here,** so a chest or a machine placed in the Quarry is
   safe, as the saved page says of its Quarry. The stonekeeper stays at his yard on
   the Mountain (decision 7).
6. **No creatures, no mine mouth, no water, no forage.** It is a work place. A
   Quarry mineshaft (Stardew 1.4) is not planned.
7. **The stonekeeper dwarf lives in the Quarry** (owner, 2026-11-08: the dwarf
   equivalent of Stardew's Linus, a hermit who just lives there, no trade). This
   replaces the earlier draft, where he stayed at his yard on the Mountain. He is
   a villager with a home spot, lines and gifts (loves: stone, ore and forage,
   owner 2026-11-08, round two), and the Quarry needs a small camp with a hut
   and a fire for him. No heart events yet. His likes, his lines and how a villager sits in a map
   with no villager walks are open.
8. **The horse rides here** (note 71, answer 10), with `rideable` true.

## Shape and layout

```text
 x:  0        15        30        45      59
 y0  +---------------------------------------+
     |  cliff                                |
     |   PAD A (6..13,5..10)   rubble field  |
 y12 |                    PAD B (28..35,12..17)
     <exit                                   |
 y22 | (0,20..24)   rubble field, node beds  |
     |                       PAD C (46..53,26..31)
 y36 |  cliff and ravine edge (south)        |
y43  +---------------------------------------+
```

| Feature | Place (tiles) | Size | Notes |
| --- | --- | --- | --- |
| Mountain exit | West edge, x 0, y 20 to 24 | 5 tall | `to_mountain`. Entry `from_mountain` at (3, 22) |
| Rubble field | x 2 to 57, y 2 to 41 | The whole floor | Open ground. Nodes spawn on its free tiles |
| Work pads | A (6..13, 5..10), B (28..35, 12..17), C (46..53, 26..31) | 8 by 6 | Flat ground for machines and chests, the Quarry's usable space (saved page). Never spawn rocks, outside the nightly table |
| Cliff border | The edge | | Cosmetic. Solid |

The pads are kept clear of rocks so a player can leave machines there. Everything
else is the nodes' ground.

## Stone and ore, in numbers (placeholders for note 07)

- **Starting nodes.** About 60 rocks, 8 copper nodes, 4 coal nodes and 2 iron nodes,
  hand placed. Placeholder counts.
- **Nightly attempts.** The map tries a number of spawns each night: 5 in year 1,
  1 more each year, at most 10 (open question 3). Each attempt picks a weighted
  kind and a random free tile, and a tile with anything on it is skipped.
- **Table.** The saved page gives the shape: about 45 percent plain rock, 23
  percent hard rock that can drop coal, 8 percent copper, 7.5 percent coal, 4
  percent iron, 1.3 percent gold and a few thousandths of a percent of the rarest
  ore. Ours: plain rock 45, hard rock 23, copper 8, coal 8, iron 4, gold 1.3 and
  Hearthsilver ore 0.02. Weights are placeholders. Gem nodes wait on note 69's
  mineral list, and artifact and seed spots on an artifact note.
- **Ore gates.** Tier follows the Mining level, as note 32 says of the Hilltop quarry
  (copper from the start, iron and gold later). The levels are open (note 07).
- **Rocks break by the rules of the pickaxe** (`44_tool_upgrades.md`, note 22), and
  give stone and the usual finds. Nothing here is a new rule.
- **Trees.** None spawn (open question 4). Wood stays the Forest's job (note 72).

## The bridge and the dwarf

- **The bridge** is a ground run on the Mountain map (x 73 to 78, y 45 to 49) with
  ruined and mended art swapped by the conditional layer (note 74). While it is
  ruined the exit is not authored as an open exit, and the map check runs with
  `quarry-open` true and false (note 71, rule 3). A ruined bridge says so when
  tried, as the greenhouse door does.
- **The stonekeeper dwarf** is at his yard beside the bridge (`74_mountain.md`).
  Before the bridge is mended he talks about it. His job after that is question 2.
  The 100 stone of the Last Seat's fourth bundle is the use the Quarry feeds
  (`16_bundles.md`), and the Last Seat's bridge (#603) is his deeper job later.

## Exits, entries and gates

| Object | Name | Target | Notes |
| --- | --- | --- | --- |
| exit | `to_mountain` | `mountain` entry `from_quarry` | West edge |
| entry | `from_mountain` | (3, 22) | Beside the exit |
| gate | `quarry-open` | condition from the hall | Needed on the Mountain side only |

## Map contract needs

The nightly spawn table (10, new), the conditional layer and `quarry-open` gate
(6), `rideable` (7). Everything else exists.

## Build order and slices

1. Shell: the map, exit, entry, pads, cliffs, collision, the starting nodes.
   The Mountain's exit is staged until the bridge slice.
2. The nightly spawn table, its rules and tests (existing rocks block, a night's
   count, the year rule). A day's passing restores some nodes.
3. The bridge on the Mountain: ruined and mended art, the gate, the room reward
   that sets it, the morning report line.
4. The stonekeeper's counter, if question 2 gives him one.

Work package: #649, "Quarry map, mended bridge, regrowing stone and ore, the
stonekeeper". It follows the Mountain map (#642), step 4b of note 71.

## Open questions for the owner

Each has a recommendation first.

1. **Which bundle room mends the bridge?**
   - A (Stardew, Recommended): the Foragers' Shelf, our first room (note 16). It is
     the room that matches Stardew's Crafts Room: forage bundles plus the Woodland
     bundle of wood, stone and fibre. Its reward, the herb stall, gains the bridge.
     It opens early, so the Quarry comes early, which is when stone is needed.
   - B: the Hearth room, the smith's room, whose Smith's bundle needs bars. Its
     reward, carts, gains the bridge. The Quarry would come late.
2. **What does the stonekeeper dwarf do?**
   - A (Recommended): a yard with a daily line and a bench, no shop. His job, stone
     for the Last Seat's bridge, waits for #603 and #181.
   - B: he buys stone and ore at his yard for coin. This overlaps the Mountain
     smith dwarf's ore buying (note 74), so the two would share one stock.
   - C (Stardew): Stardew has no person in the Quarry (villagers do not travel
     there, saved page), so the dwarf would only keep the bridge and have no trade.
3. **How fast does the Quarry regrow?**
   - A (Recommended): 5 spawn attempts a night in year 1, 1 more a year, at most 10.
     The map is smaller than Stardew's, so the numbers are lower.
   - B (Stardew): the saved page's 7 attempts in year 1, 2 more a year, at most 16.
4. **Do trees spawn in the Quarry?**
   - A (Recommended): no. Wood stays the Forest's job and the Quarry is for stone.
   - B (Stardew): oak and maple seeds spawn at about 6 percent of attempts, and the
     Quarry's tillable tiles take common trees (saved page).

## Owner answers 2026-11-08m

1. **The Foragers' Shelf mends the bridge** (Stardew's Crafts Room). Its herb stall
   reward gains the bridge. The Quarry opens early.
2. **The stonekeeper dwarf just lives there,** like Linus. No shop, no stone buying.
   He moves from his yard to a Quarry camp (decision 7). His Last Seat job waits
   for #603 and #181.
3. **Regrow follows Stardew:** 7 attempts a night in year 1, plus 2 a year, at most
   16 (saved Quarry page). The map is smaller than Stardew's, so the tuning pass
   may scale it; the numbers are placeholders for note 07.
4. **Trees spawn:** oak and maple seeds at about 6 percent of attempts, and
   tillable Quarry tiles take common trees (Stardew). This replaces "no trees" in
   the draft and the line "Wood stays the Forest's job".

## Open

- Questions 1 to 4 are answered (above). Left: the dwarf's camp and the villager details, and the tree rules on a map with no forest.
- Whether gem nodes and artifact spots join the table, with notes 69 and the
  artifact design.
- The Mining level gates for iron and gold nodes (note 07).
- Size 60 by 44 is a guess, confirmed on the first Tiled draft (note 19).

## Built status (2026-11-09, #649)

All four build slices are built: the map, the nightly spawns, the bridge on the
Mountain (note 74 "Built status (2026-11-09, #649)") and the dwarf's camp.

- **Map** `src/content/maps/quarry.json`, 60 by 44, `wild`, rideable, written by
  `scripts/drafts/gen-quarry-map.mjs` once and hand edited from then on. A two tile cliff border,
  exit `to_mountain` at x 0, y 20 to 24 and entry `from_mountain` at (3, 22), a short
  path to the camp, three clear pads (regions `pad-a` (6, 5), `pad-b` (28, 12), `pad-c`
  (46, 26), 8 by 6, region property `pad`), and 60 stone rocks, 8 copper, 4 coal and 2 iron
  placed by the generator with a fixed seed (map `rock` objects gained an optional `kind`).
  Pads never take a spawn, a weed or returning debris (`FarmMap.isPad`, `areas.ts`).
- **Nightly spawns:** `src/content/spawns.json` has `quarry` with owner answer 3
  (7 attempts in year 1, 2 more a year, at most 16) and weights plain rock 45, hard rock 23,
  copper 8, coal 8, iron 4, gold 1.3, Hearthsilver 0.02, oak seed 3, maple seed 3 (the two
  seeds are about 6 percent, answer 4). `areasEndDay` runs it after the other area rules
  on every map with a table (`placeSpawn` in `src/core/areas.ts`). Free tiles are the
  planting rules' open tiles with nothing on them, off the pads and paths.
- **Gate:** `quarry-open` is read from the hall (`src/core/quarry.ts`, `holdsOf`): the
  Foragers' Shelf complete (owner answer 1). No saved flag for the gate. The morning
  report says once that the bridge is mended (`SleepReport.quarryBridge`, remembered by
  the world flag `quarry-told`).
- **Camp:** a hut (solid, no interior) at x 8 to 12, y 30 to 33, a fire at (14, 35)
  and the dwarf's post at (11, 35), a `stonekeeper` service. One line a day from
  `CAMP_LINES`. Placeholder tiles stand in for the dwarf and the fire.
- **Choices where the notes were silent:**
  - Hard rock has no kind of its own yet, so it spawns as plain stone. A nightly attempt
    on it is a stone rock.
  - Ore tiers do not follow the Mining level yet (note 07 has no levels), so all ores can
    spawn in year 1.
  - Spawn tile candidates are the planting rules' open tiles (`canPlantTree`), not tillable
    tiles, since the Quarry has no soil. "Tillable tiles take common trees" is therefore
    only the seeds in the table; no other tree rule was added.
  - The dwarf has no gifts, likes or heart events and no schedule: he stands at his post.
    His loves (stone, ore, forage) wait on the gift system (#599).
  - Weeds and the seasonal debris also return here by the shared area rules.
  - The yard post's line changes once the bridge is mended (note 74).
- **Not built:** gem nodes and artifact spots, Mining level gates on ore, a hard rock
  kind that can drop coal, the dwarf's sprite and gifts, the Last Seat bridge job (#603).
- **Playtest:** `npm run playtest:quarry`. Tests: `tests/quarry.test.ts`.

## Built status (2026-11-12, hard rock and ore gates)

- **Hard rock** is its own rock kind (`hard`): 3 swings at the basic pickaxe (stone 2), 3 mining XP,
  gives stone, or coal 30 percent of the time (`HARD_COAL_CHANCE`, placeholder, note 07). The
  nightly `hard-rock` spawn places it (it used to place plain stone).
- **Ore gates:** each spawn kind may carry `minLevel` in `spawns.json`. Placeholders: iron 2, gold 5,
  Hearthsilver 8; copper and coal from the start. A kind above the player's Mining level is left out
  of that night's draw. Numbers need the owner's say (note 07).
- **Still not built:** gem nodes (wait for the final mineral list, note 69) and artifact spots (no
  artifact design), the dwarf's sprite and gifts, the Last Seat bridge job (#603).
