# 83 The ancestors' shrine and the evaluation (draft)

Status: draft, 2026-11-11. The four forks below were decided with the owner.
The point list is the assistant's proposal for the owner to reshape, and every
number is a placeholder. Nothing here is built. Stardew's Grandpa page was read
as reference only (ADR 0002, saved page, checked in note 54 as SC-132). No text
is copied.

## Decided with the owner (2026-11-11)

1. **There is a shrine with candles (Stardew), and it is an ancestors' shrine
   (owner, 2026-11-11).** Oriel Thimblemoss did not die (note 09, "The relative":
   they retired to Evenglade), so this is not a grave and Oriel is not a ghost.
   It honours the Thimblemoss line, "connecting to the past". It stands in a
   special place on the farm, not beside the path (the spot is open, below). It
   lights up to four candles.
2. **The evaluation runs at the start of year 3, and can be redone any time
   (Stardew).** A note at the shrine says so. Redo is by placing a Diamond in the
   shrine, as Stardew does. It only rewards. Year two loses nothing (note 63).
3. **The score counts our own milestones, about 20 points.** Not the museum,
   marriage, pet or keys, which we lack.
4. **The top candle gives a statue (Stardew), paying Hearthsilver ore.** Stardew's
   Statue of Perfection pays 2 to 8 iridium ore a day when you interact with it.
   Ours pays the metal above gold, Hearthsilver ore (note 22, note 44).

## Stardew, for comparison

21 points; candles at 0 to 3, 4 to 7, 8 to 11 and 12 or more. The statue needs
all four. Nothing else changes in the game.

5. **Points and cuts follow Stardew's (owner, 2026-11-11).** 20 points, candles at
   1 to 3, 4 to 7, 8 to 11 and 12 or more.
6. **The statue pays 2 to 8 Hearthsilver ore, once a day, as Stardew (owner,
   2026-11-11).** Used by hand, not a machine. Hearthsilver nodes give 1 to 2 ore
   (note 22), so tune this if it floods the smith.
7. **A co-op farm has one score (owner, 2026-11-11).** Every player's work counts
   together, with one set of candles and one statue. Stardew's co-op behaviour is
   not checked.
8. **A wedding or festival delays the year 3 scene, the candles still light
   (Stardew, checked on the saved page).** Assistant's default, not asked.

9. **The evaluation is a quiet scene at the shrine, then a letter from Oriel
   (owner, 2026-11-11).** The candles light, a few short lines come from the
   ancestors, and the next morning a warm, brief letter from Oriel arrives by
   post. Oriel stays alive and far away. Stardew's Grandpa returns as a ghost
   (checked on the saved page); ours does not, as Oriel is alive.
10. **Three ancestors (owner, 2026-11-11):** a founder who first cleared the
    farm, a seedkeeper, and Oriel's own parent. Oriel is on a living marker, not
    carved. Names are open.
11. **The shrine is four candle stands around a standing stone (owner,
    2026-11-11),** one stand per candle, on a small stone circle, the family
    stone at the centre.
12. **Diamonds come from every Stardew source we already have (owner,
    2026-11-11):** gem nodes (mine from floor 50, Quarry, deep dig), plus rare
    monster drops and fishing treasure chests where those systems exist. Sources
    we lack (panning, Trout Derby, fish pond products) are added when built. Stardew's
    sources are in SC-134.

13. **Fish, shipped and cooking need every item on the list, one point each
    (Stardew, owner 2026-11-11).** The lists are the counters' own (note 39).
14. **Friends: 8 hearts with 5 villagers, then with 10 (Stardew, owner
    2026-11-11).** Our hearts are 250 points each (`friendship.json`), so 8
    hearts is 2000 points. Stardew tests for 1975, slightly under 8 hearts (saved
    page); ours tests for the full 2000. Children are excluded, as in note 39.
15. **The first evaluation is the long scene, a redo is short (owner,
    2026-11-11).** A redo only lights the candles and gives one line.
16. **The Diamond sells high and is liked by every villager as a gift (Stardew,
    owner 2026-11-11).** Stardew sells it for 750g and every giftable villager
    likes or loves it (saved Diamond page). The price is a placeholder for
    `07_tuning_numbers.md`.

## Proposed points (about 20, placeholders)

| Area | Points | Source |
| --- | --- | --- |
| Earnings | 7 | One each at 50k, 100k, 200k, 300k, 500k; two at 1,000,000g |
| Skills | 2 | 30 total levels, then all at the top level |
| Fish | 1 | Every fish caught (fish counter) |
| Shipped | 1 | Every item shipped (shipped counter) |
| Cooking | 1 | Every dish cooked (cooking counter) |
| Friends | 2 | Eight hearts with five villagers, then ten |
| Hall | 3 | Every bundle done (1), the ending scene played (2) |
| Deepmark key | 1 | The floor 120 chest opened (note 22) |
| Slayer | 1 | The slayer goals done |
| Summit | 1 | The summit reached |
| Rare boost items | 1 | All found |
| **Total** | **20** | |

Candles: 1 at 0 to 3, 2 at 4 to 7, 3 at 8 to 11 and 4 at 12 or more (decided).
Several counters are locked at 0 until their systems exist, so four candles
cannot be reached yet.

## Open

1. The earnings and skill thresholds still follow Stardew's numbers in the table
   below and may need tuning to our economy. Several counters are locked at 0, so
   four candles cannot be reached yet.
2. The Diamond item itself (name, art, exact sell price) and its node share in
   `mine-bands.json`, with the Quarry and deep dig shares. Needs a gem entry.
3. Where the shrine stands: a special place on the farm, chosen with the farm layout
   (note 55, build issue #776). Not beside the path.
4. The three ancestors' names and one line about each (note 09, "The relative"
   neighbours), the ancestors' short lines at the scene, and the text of Oriel's
   letter.
5. The long first scene's exact length and shots (a scene runner like the heart
   events, #600), and the one-line redo.
