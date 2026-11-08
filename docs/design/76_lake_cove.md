# 76 Lake cove (draft)

Status: draft, written 2026-11-08, owner answers recorded the same day (note 71). Nothing here is
built. M3b. It designs the Lake cove map and the ferry. Overview and owner questions:
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
3. **One exit, back to the delta,** the same dock. No other way in or out. Nobody
   keeps the ferry (owner, 2026-11-08): you step on the boat, like a door, so it
   is always free and always running, with no schedule, and a player at the cove
   at night is never stranded.
4. **A lake, a shore walk and one small extra.** No shop, no resident, no building,
   no choppable trees. The rarest fish and the legend are the content, plus a
   **hidden treasure spot** (decision 8).
5. **Fresh water.** The cove is a lake, not the sea (note 19, decision 11, and note 21:
   fresh water pots go on it).
6. **Weather and time matter,** because the legend needs rain at dusk in autumn
   (note 21). The cove shows weather and night like any outdoor map.
7. **The horse stays behind.** The ferry works like a door: it dismounts the rider
   and parks the horse beside the dock (`59_horse.md`).
8. **The extra: a hidden treasure spot (drafter's pick, FLAGGED FOR OWNER VETO).**
   The owner asked for a small extra beyond fishing and left the choice to the
   drafter between a hidden treasure spot and a mist-only dawn event (the two
   options of the earlier draft). The treasure spot is picked: one spot on the
   shore, found by looking (a faint glint on a ledge, and a small stone pile),
   that gives one chest per season, never random, opened with the Action button.
   Why it wins: it needs no new event system or clock rule, it is a plain
   `service`-style tile with a save flag, it works on touch, it is easy to test,
   and it rewards a walk round the shore on a trip that is otherwise only
   fishing. The mist-only dawn event (a mist on the water at dawn that raises the
   rare bite rate for that morning) stays the alternative if the owner prefers it.
   Contents are placeholders for note 07: a seasonal pick from the pools of an
   existing note (geodes, a lure, bait, a cooking ingredient), no unique item that
   a bundle or the completion tracker could need.

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
| Treasure spot | (41, 36) | 1 | South-east ledge, off the shore path. One chest a season (decision 8) |
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
4. Lanterns, bench, the night look and the treasure spot (decision 8).

Work package: "Lake cove and the ferry".

## Open

- The treasure spot is a drafter's pick (note 71, answer 6) and waits on the
  owner's veto. The treasure contents are placeholders. A save flag per season
  records the chest taken.
- Nothing about a ferry animation is designed: today an exit fades like a door.
- The Water room reward flag and the hall art are the hall's (`40_hall_layout.md`).
