# 76 Lake cove (draft)

Status: draft, written 2026-11-08 for the owner to review. Nothing here is
built. It designs the Lake cove map and the ferry. Overview and owner questions:
`71_map_areas_overview.md`. Stardew has no area that matches the cove (the saved
Secret Woods and Beach pages are the nearest fishing places, SC-89), so this is
our own design.

## Why

The cove is the Water room reward (`16_bundles.md`, bundle room 3): the ferry is
repaired and a lake cove opens inside ring 1. It holds the rarest ordinary fish
and the first legend, the Hearthwell Carp (`21_fishing.md`, decisions 12 and 13).
No Water room bundle may need a cove fish, so the cove is a goal after the room
and not a step in it. That makes it small, quiet and late.

## Decisions (draft)

1. **One small map, `cove`, 50 by 40 tiles** (2,000, our own guess, note 19). Longest
   crossing 10 seconds. A reward fishing spot, not a trip.
2. **Reached only by the ferry** from the River delta dock. It opens when the Water
   room is complete (condition `cove-open`, contract need 6).
3. **One exit, back to the delta,** the same dock. No other way in or out. The ferry
   back is always free and always running (no schedule), so a player at the cove at
   night is never stranded.
4. **A lake, a shore walk and nothing else.** No shop, no resident, no building, no
   choppable trees. The rarest fish and the legend are the content.
5. **Fresh water.** The cove is a lake, not the sea (note 19, decision 11, and note 21:
   fresh water pots go on it).
6. **Weather and time matter,** because the legend needs rain at dusk in autumn
   (note 21). The cove shows weather and night like any outdoor map.
7. **The horse stays behind.** The ferry works like a door: it dismounts the rider
   and parks the horse beside the dock (`59_horse.md`).

## Shape and layout

```text
 x:  0        12        24        36     49
 y0  +------------------------------------+
     |  cliffs, cosmetic trees            |
     | DOCK (6,8)      COVE WATER         |
     |  \_ ferry       (14..44,10..34)    |
 y14 |   shore path   ring 3 tiles wide   |
     |   loop ... lantern posts ...       |
 y36 |      bench (24,36)                 |
y39  +------------------------------------+
```

| Feature | Place (tiles) | Size | Notes |
| --- | --- | --- | --- |
| Dock and ferry | x 4 to 8, y 6 to 10 | 5 by 5 | North-west. The only exit, `to_delta` |
| Cove water | x 14 to 44, y 10 to 34 | about 30 by 24 | The fishing water |
| Shore path | A ring 3 tiles wide round the water | | Casting spots all round |
| Lantern posts | 6, spaced round the shore | | Scenery that glows at night. The Cove Lantern fish is a night fish (note 21) |
| Bench | (24, 36) | 3 by 1 | A place to sit, scenery now |
| Cliffs and trees | The border | | Cosmetic only |

## Exits, entries and gates

| Object | Name | Target | Notes |
| --- | --- | --- | --- |
| exit | `to_delta` | `delta` entry `from_ferry` | The dock, always open once the player is here |
| entry | `from_ferry` | (9, 8) | Beside the dock exit |
| gate | `cove-open` | condition from the hall | Needed on the delta side only |

## Fishing

- **Cove water:** the 8 fish of note 21 (the rarest ordinary fish, 400 to 700g, and
  the Cove Lantern at night) and the legend the Hearthwell Carp (autumn, dusk, rain,
  the top Hearthwell Rod, note 21).
- **Pots:** fresh water pots, allowed here (note 21).
- **No bundle uses a cove fish.** A test must check that when bundles 13 to 18 are
  built (note 71, shared rule 6).

## Forage

Small. Per-map table (contract need 3), 12 candidate spots round the shore, cap 2.
Goods already in `forage.json`.

| Season | Weights |
| --- | --- |
| Spring | dandelion 50, daffodil 50 |
| Summer | sweet pea 60, spice berry 40 |
| Fall | bramble berry 50, crab apple 50 |
| Winter | crocus 50, snowdrop 50 |

## Map contract needs

Water kind `cove` (1), per-map forage (3), conditional layers and the `cove-open`
gate (6), `rideable: false` (7). The ferry itself is an ordinary gated exit on the
delta and an ordinary exit here.

## Build order and slices

1. After the River delta and the Mountain (note 71 order). Shell: the map, water
   kind, the shore, the exit, the entry.
2. The ferry on the delta side: ruined art, the `cove-open` gate, the Water room
   reward flag, the repaired art.
3. The cove's fish table and the legend (fishing slice 4, #596). Forage table.
4. Lanterns, bench and the night look.

Work package: "Lake cove and the ferry".

## Open

- Question 5 (who keeps the ferry) and question 6 (what the cove is for beyond
  fishing) in note 71.
- Nothing about a ferry animation is designed: today an exit fades like a door.
- The Water room reward flag and the hall art are the hall's (`40_hall_layout.md`).
