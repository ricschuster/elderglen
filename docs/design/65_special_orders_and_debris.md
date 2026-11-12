# 65 Special Orders and seasonal debris (draft)

Status: draft, 2026-11-06. First build 2026-11-07, see "Built". The four forks below were decided with the owner.
The order list, counts, rewards and debris numbers are the assistant's
proposal, and every number is a placeholder. It settles
the Special Orders that note 57 reserved (SC-32) and the clutter that returns
each season (SC-29, note 55). Stardew's saved Quests page was read as
reference only, and its order list is not copied (ADR 0002): our orders have
our own names, posters and items.

## Decided with the owner (2026-11-06)

1. **The board opens on a fixed day, as Stardew.** Cuthbert, the reeve (note 20), stands behind it. A short scene on Fall 2 of
   year one, in any weather, opens it (checked, SC-32). Each order has its own
   prerequisite (a system built, a season), so a player only sees orders they
   can fill. No order needs the hall.
2. **The clock starts when you accept.** Each order has a fixed window of 7 to
   28 days from acceptance. Waiting never shortens it. Stardew runs the clock
   from posting (checked), so this is ours, chosen for the no pressure tone.
3. **Debris returns each season, in small amounts (Stardew, from memory).**
   Rocks and twigs return on the farm at season start, with a cap. Nothing
   returns in winter. Numbers below.
4. **First time pays a unique reward, repeats pay gold (Stardew).** Our own
   recipes, machines, hats and scenes. Prize Tickets stay out until a prize
   list exists (note 50, "For later").

## Special Orders

- **Where.** The Outpost wall, beside road news (note 57). Orders use the note
  50 quest record with `source: special`. Posters are travellers and carriers,
  not villagers, as note 57 says.
- **Pace (as Stardew, checked).** One new order is posted each week, on the
  first day of the week. A player may accept one new order a week, and may have
  several active at once. The owner recalls two on the board at once (SC-32,
  unchecked), so the board shows two and a posted order stays until taken or
  replaced.
- **Hand-in.** An order fills itself, with no talking to the poster, as in
  Stardew. Where it asks for goods in a place (a pantry, a bin), the goods must
  come from after acceptance, so an order cannot be filled from a full chest.
- **Failing.** Letting the window run out costs nothing. The order can be
  offered again, and goods already put in are returned by mail.
- **Cancel.** Unlike Stardew, an accepted order can be dropped from the journal,
  since a lapse costs nothing anyway.
- **Rewards.** First completion: a unique reward (recipe, machine, hat or scene)
  plus gold. Later completions of a repeatable order pay gold only. Orders that
  mark "no repeat" show a tick once done.
- **Counts toward** the Help Wanted achievements, as in Stardew (notes 38, 50).

### First draft of orders

Our own names and numbers. The "needs" column is the slice that makes the order
possible (`33_build_order.md`). Gold is a placeholder, set when tuning.

| Order | Ask | Window | Needs | First reward | Repeat |
| --- | --- | --- | --- | --- | --- |
| Bumper Harvest | Harvest then ship 100 of one crop in season (not winter) | 28 days | Slice 1 | A second shipping bin | Yes |
| Spring Leeks | Leave 12 leeks at a named house, spring only | 28 days | Slice 1 | A recipe and a scene | No |
| Fine Vegetables | Ship 25 gold quality vegetables to the store bin | 28 days | Slice 1 | A recipe | Yes |
| Barrel Batch | Put 12 of one keg drink in a named kitchen | 14 days | Slice 1 (keg) | A recipe and a scene | No |
| Too Many Fish | Catch 10 of one in season fish | 7 days | Slice 2 | A recipe | Yes |
| Still Waters | Catch 20 fish of one water type | 7 days | Slice 2 | A machine | Yes |
| Clean Waters | Fish or collect 20 trash items, then bin them | 7 days | Slice 2 | A recipe and a scene | No |
| Cave Patrol | Slay 50 of one cave creature | 7 days | Slice 3 | A recipe | Yes |
| Crystal Gift | Hand over one of each of five gems | 7 days | Slice 3 | A machine and a scene | No |
| Pantry Stock | Put 24 eggs in the inn pantry | 14 days | Slice 4 | A machine | Yes |

- Stardew's board also has bone, island and later orders. Ours leave out the
  island (ring 2 has its own board, note 39) and the museum order until the
  gallery exists. More orders are a data change.
- Orders that need a system not yet built are simply not drawn. The draw is
  seeded from the week, so a reload gives the same board (as note 50).
- Quest record: add `special` to the `source` values, and fields for the
  window in days, whether it repeats and whether it was done before.

## Seasonal debris

Settles SC-29 and the open clutter rule in note 55. The farm only, as weeds
are (note 29). All numbers are placeholders.

- **When.** On day 1 of spring, summer and fall. Nothing returns on winter day
  1, and winter day 1 clears weeds as note 29 says.
- **What.** Up to 8 rocks and 8 twigs appear on free tillable tiles, and a 10
  percent chance of one stump a season. There is a standing cap of 25 rocks and
  25 twigs on the farm, so a skipped season does not bury it.
- **Where not.** Never on tilled soil, crops, paths, placed objects, furniture
  or the 3 by 3 around a fruit tree. Debris only takes free tiles, as weeds do.
- **Spread.** Trees keep the rule in note 36. Grass spreads slowly onto free
  adjacent tiles outside winter. The grass rate is open (no grass system yet).
- **Drops.** Unchanged from the clearing rules (stone from rocks, wood from
  twigs and stumps).
- **Wood and stone economy.** Returning debris adds a steady wood and stone
  supply, and note 55 already says the wood economy needs a second look. Check
  both in play.

## Build order

1. The quest record change and the Special Orders draw, with tests.
2. The board on the Outpost wall and the Fall 2 scene (needs the Outpost,
   note 57 build order step 5).
3. Orders one at a time, as their systems arrive.
4. Seasonal debris with the weeds work (`29_weeds.md`, slice 1 build 3).

## Built (2026-11-07)

The board has stood on the Outpost wall in Hearthwell since 2026-11-10 (note 77,
"Owner decisions 2026-11-10"), as "Where" above says. Before that it was a farm
counter, then a board on the general store's wall.

Code: `src/core/orders.ts`, `src/core/debris.ts`, data in
`src/content/orders.json`, scene `src/scenes/OrdersScene.ts`. Tests:
`tests/orders.test.ts`, `tests/debris.test.ts`.

- **The board stands on the general store's wall in Hearthwell.** A service tile `orders`
  sits on the store's bottom row, two tiles right of the door, beside the Help Wanted board
  (it stood on the farm until 2026-11-09, note 77). The Outpost's own board stays a stand-in.
- **The Fall 2 scene.** The first time the player is on the farm map on or
  after day 58 (Fall 2, year one), in any weather, a short scene opens the
  board (after waking, or on loading an old save past that day). It shows once.
  Before it, the board is closed and nothing is posted.
- **Draw.** One order is picked each week from a hash of the week number, among
  those fit for the season. A pick stays posted until taken, done (no repeat),
  out of season or replaced; the board shows the newest two (`BOARD_SIZE`).
  The draw is a pure function of the date, so a reload gives the same board.
- **Accept and clock.** One new order a week. The window runs from the day of
  acceptance (`due = accepted + windowDays`), and the last day counts. An
  accepted order can be dropped at the board at no cost.
- **Fill.** Ship orders fill themselves when the bin pays at night, counting
  only goods shipped on or after the acceptance day. Gold is paid at once. The
  first time, the unique reward is a recipe (known through a new `order`
  recipe source) or an item to collect at the board. Repeats pay gold only.
  The morning report names orders filled and orders that ran out.
- **Lapse.** A lapsed order costs nothing and is posted again. The two built
  orders hold no goods, so there is nothing to return by mail (and there is no
  mail yet).
- **Orders built.** Only the two whose systems exist: Bumper Harvest (ship 100
  of one crop in its season, not posted in winter) and Fine Vegetables (ship 25
  gold quality vegetables, fruit does not count). The first rewards are
  placeholders: a big chest stands in for the second shipping bin, and the
  dehydrator recipe (also learnable at Farming level 4) stands in for a recipe.
- **Debris.** On day 1 of spring, summer and fall, up to 8 rocks and 8 twigs
  appear on free tillable farm tiles, a 10 percent chance of one stump, with a
  standing cap of 25 rocks and 25 twigs. Winter brings none. Never on crops,
  soil, objects, services, or the 3 by 3 round a fruit tree. Twigs are new: a
  flat mark that any tool clears in one swing for 1 wood, and that blocks
  tilling and planting like a weed. Rocks are plain stone and block walking as
  rocks do. Old saves load with no twigs.
- **Save.** `orders` and `twigs` are optional keys. An old save loads with a
  closed board; a malformed `orders` record is ignored.
- **Built 2026-11-12: three more orders** that count from logs, so no scene hooks them: Too Many Fish (10 of one in-season fish, 7 days), Still Waters (20 fish from one water, 7 days) and Cave Patrol (50 of one creature kind, 7 days). A taken order keeps the fish and kill tallies from the day it was taken (`base`), and a nightly check reads the logs. Their first rewards are recipes through the `order` source (charcoal kiln, recycler, seed maker, all placeholders).
- **Not built.** Grass spreading (no grass system), the completion tracker
  (#196), the Help Wanted achievement count (no quests exist yet, only
  `Orders.totalDone` is kept for it), one order (Clean Waters needs a trash count; the four hand-in orders are built, see "Goods hand-in"), a journal row for
  taken orders (no journal yet, the board lists them), and the mail return (no order holds goods yet).
  Placeholder numbers are in `07_tuning_numbers.md`.

## Goods hand-in to a named place (owner answer 2026-11-12, #875)

Settled in the M3b finish list. The orders that wait on it are Spring Leeks, Barrel
Batch, Pantry Stock and Crystal Gift (the three fish and cave orders are built from the
logs, so #875's first wording was out of date).

- **A drop chest at each named place.** Taking such an order puts a marked chest in the
  named place (the inn pantry, a named kitchen or house). The player fills it over the
  days the order runs, from the pack. The nightly check counts the matching goods in
  the chest and, when the count is met, removes them and pays out. It reuses the chest
  store and the one saved `placed` list (note 89), with a `bound to order` state.
- Goods stay in the chest until the order ends. If the window lapses, the player can
  take them back (this answers the last open line below for these orders).
- Stardew's way of taking order goods is not checked (register row to add).
- Open: the places (the inn pantry exists in note 24; which kitchen for Barrel Batch),
  the chest's look, and Crystal Gift's five gems, which are placeholders.

### Built (2026-11-12)

Spring Leeks, Barrel Batch, Pantry Stock and Crystal Gift are built, in `orders.json` as
`hand-in` asks. Code: `acceptOrder`, `dropOrder`, `handInTally` and the nightly chest
check in `src/core/orders.ts`; the binding is `order` and `closed` on a placed chest
(`chests.ts`, saved in the chest's `placed` state). Tests: `tests/handin.test.ts`.

- **Taking** the order stands a plain chest at the named tile with the order bound to it. It
  is refused if the tile already holds a chest. A bound chest cannot be lifted or pushed.
  Dropping the order from the board works as before.
- **Counting** runs each night with the other orders. Quality is ignored. Spring Leeks
  counts 12 leeks in all; Barrel Batch 12 of one wine, juice or mead (not a mix); Pantry
  Stock 24 eggs; Crystal Gift one each of five different gems. When met, only the asked
  goods are taken out and gold is paid, the first reward is owed at the board.
- **Ending** (done, lapsed or dropped) closes the chest. Goods left in it can be taken back
  through the chest screen, and it is removed on the first night after it is empty. A
  closed chest still holds its tile, so the order cannot be retaken there until it is empty.
- **Placeholders.** The places are a guess, one tile each: the fisher hut (3,5) for leeks,
  the inn (7,5) as the kitchen and (5,5) as the pantry, the smithy (6,8) for gems. The first
  rewards are stand-ins: cheese press recipe, a keg, a mayonnaise machine, a loom. The
  scenes that note 65 names for Spring Leeks, Barrel Batch and Crystal Gift are not built.
  Pantry Stock counts "egg" only (not duck eggs). Gold is a placeholder.
- **Not built:** the chest's own look (it is a plain chest), the mail return (goods are
  taken back by hand instead), a Stardew check row for how Stardew takes order goods.

## Still open

- The real list: more orders, final gold, the first rewards and their scenes.
- The chance a week has an order, and what the board shows if none can be drawn.
- Whether the board shows two orders or a different number (SC-32).
- The grass spread rate and whether grass exists as a tile before slice 1.
- Whether an order's goods can be returned in full if the window lapses.
