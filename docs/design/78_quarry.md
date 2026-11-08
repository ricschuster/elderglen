# 78 Quarry (draft)

Status: draft, written 2026-11-08 after the owner chose it (note 71, answer 11).
Nothing here is built. It designs the Quarry map off the Mountain, the repaired
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
7. **The stonekeeper dwarf keeps the bridge and the yard,** and his job is open
   question 2. He is not in the Quarry.
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

## Open

- Question 1 to 4 above.
- Whether gem nodes and artifact spots join the table, with notes 69 and the
  artifact design.
- The Mining level gates for iron and gold nodes (note 07).
- Size 60 by 44 is a guess, confirmed on the first Tiled draft (note 19).
