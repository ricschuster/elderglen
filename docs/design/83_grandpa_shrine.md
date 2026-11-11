# 83 The farm shrine and the evaluation (draft)

Status: draft, 2026-11-11. The four forks below were decided with the owner.
The point list is the assistant's proposal for the owner to reshape, and every
number is a placeholder. Nothing here is built. Stardew's Grandpa page was read
as reference only (ADR 0002, saved page, checked in note 54 as SC-132). No text
is copied.

## Decided with the owner (2026-11-11)

1. **There is a shrine with candles (Stardew).** It stands on the farm, in a
   corner chosen with the farm layout (note 55). It lights up to four candles.
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

Candles at the same cut points scaled to the total: about 1 at 0 to 3, 2 at 4 to 7,
3 at 8 to 11 and 4 at 12 or more (placeholders; check against a normal save).

## Open

1. The point list and the candle cuts. Many counters are still locked at 0 (friends,
   slayer, elderfruit), so the top score is not reachable until those exist.
2. The Diamond item. We have none yet. Source (owner, 2026-11-11, as Stardew's
   Diamond page): gem nodes in the mine from floor 50, in the Quarry, and in the
   ring 2 deep dig. Stardew has more sources (monster drops, panning, treasure
   chests, fish ponds); which of those ours takes is open. It needs a gem
   entry and a node share in `mine-bands.json`.
3. How many ore a day, and which days. The statue is a daily interaction, not
   a machine.
4. Where the shrine stands, and the grandfather figure's name and the letter
   it speaks (story note 09).
5. The evaluation scene on year 3 day 1 and whether a festival or a wedding
   overrides it (Stardew: a wedding overrides the scene, the candles still light).
6. Whether co-op farms score per farm or per player (milestone M4).
