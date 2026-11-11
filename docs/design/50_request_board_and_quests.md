# 50 The request board and quests (draft)

Status: draft. Decided with the owner on 2026-11-02. First slice built 2026-11-08 (see "Built"). Note
38 settled that a daily request board stands at the general store and counts
toward two errand achievements. This note gives it types, pay, rules and a
quest record. The quest log in the journal (`49_menu_and_journal.md`) shows what
this note creates. The saved Quests page is the Stardew source.

## Decisions

- **The board posts one request a day, with 2 days to finish (Stardew, note
  38).** The day posted and the next day. There is no penalty for skipping or
  for letting one lapse. A lapsed request drops off the journal by itself. The
  chance a day has a request, and no request on day 1, are tuning numbers.
- **Delivery and gathering come first (decided 2026-11-02).** The other types
  arrive with the systems they need: fishing, slaying and saying hello wait for
  fishing, the mines and villagers. The type is a data field, so a new type is
  a content change and a counter.
- **Delivery pays three times the item's normal-quality sell price (Stardew,
  decided 2026-11-02).** The multiplier is from the saved page. It beats the
  shipping bin on purpose, so a request is a real choice. Friendship (150 points
  in Stardew) is paid once hearts exist.
- **Gathering pay is ours.** Stardew scales it by the count and the player's
  skills and a little chance, and the saved page gives no formula. It goes in
  `07_tuning_numbers.md` as a placeholder when built.
- **Delivery is handed to the poster, with a board fallback (decided
  2026-11-02).** Each request names the villager who posted it. Once villagers
  can be talked to, the item is handed to them. Until then the board itself takes
  the item and pays. The data is the same either way, only the turn-in point
  moves. Simply holding the item does not complete it: it must be handed over
  (Stardew).
- **A delivery is not a gift (Stardew).** It does not count as giving a gift.
- **Gathering counts from acceptance (Stardew, decided 2026-11-02).** Only
  items collected after accepting count, shown as a counter in the journal.
  Stock in the pack or a chest does not. Stardew counts bought items too.
  When the count is met, the poster completes it.
- **Requests only name what the player can reach (Stardew).** A crop, forage or
  gathered item of the current season that the player already has access to.
  Nobody who has not been met posts a request. The chance of a delivery request
  does not rise as more villagers are met.
- **There is no cap on active requests, and any can be cancelled in the
  journal (Stardew, decided 2026-11-02).** One request a day with a 2 day limit
  keeps the list short without a rule.
- **The star counter and Prize Ticket are left out for now (decided
  2026-11-02).** Stardew's board counts a star per finished request and gives a
  Prize Ticket at three, spent at a prize machine in the mayor's house. We have
  no prize list, so the counter waits for one. Adding it later does not change
  the request record. See "For later".
- **Story quests share the record but none are written here (decided
  2026-11-02).** In Stardew they come by mail, have no time limit and teach the
  game. Authoring them needs the story and dialogue notes. Mail is designed in
  `51_mail_and_letters.md`.
- **Both errand achievements stay as note 38 has them:** 10 requests earns the
  Spotted Bow hat and a 500g letter, and 40 earns the Hen Mask and 2,500g.

## The quest record

One data record covers every quest, whatever its source.

| Field | Meaning |
| --- | --- |
| id | Unique name |
| source | `board`, `letter`, `hall` or `special` (note 65). Only `board` is built |
| type | `delivery` or `gathering`. Later: `fishing`, `slaying`, `hello` |
| poster | The villager who asked, or the board while villagers are missing |
| want | Item id and count |
| reward | Gold, and later friendship |
| posted day, deadline | The deadline is empty for story quests |
| progress | The gathering counter, saved with the game |
| state | `open`, `done`, `lapsed` or `cancelled` |

- The tables of what can be asked live in `src/content/`: item pools by type and
  season, and the count ranges. Rules (daily draw, progress, completion, expiry)
  live in `src/core/` with tests, free of Phaser.
- The draw is seeded from the day so a reload gives the same board.
- Save: open quests, their progress and the count completed for the achievements.
  Plan the version bump with the first slice that builds this.

## The board and the journal

- **The board** stands outside the general store. A mark floats over it when a
  new request is posted. Tapping or using it shows the day's request and
  Accept. Accepting adds it to the journal.
- **The journal's Quests section** lists each open request by title. Expanding
  one shows its text, what it wants, the gathering counter and the days left.
  Cancel is under it.
- Touch needs no drag, and every action is a tap on a button.

## Built

Built 2026-11-08: delivery and gathering requests (steps 1 to 3 and 5 of the
build order). `src/core/quests.ts`, `src/content/requests.json`, a Request Board
at the general store (`RequestsScene`), the open list under the hat box's "Open
requests" row (no journal shell yet), gathering credit from forage, harvest,
wood, fiber and mining drops, the Errand Runner and Valley Helper achievements
and their letters, and an optional `quests` save field (no version bump, as
mail). Placeholders are in `07_tuning_numbers.md`. Left out: the star counter
and prize tickets, story quests, friendship pay, hand-in to the poster (the
board takes it), fishing, slaying and hello types, and the journal section.
Items picked up off the ground after a full pack do not count toward gathering.

## Build order

1. The quest record, the daily draw and the expiry rule in `src/core/`, with
   tests. Item pools for delivery by season.
2. Gathering progress from collection events (forage, wood, stone), with tests.
3. The board scene and Accept, with the board taking turn-in.
4. The journal Quests section (needs the journal shell in note 49).
5. The achievement counters and the mail letters, with note 38.
6. Hand-in to the poster, once villagers can be talked to.

## For later

- **Prize tickets.** If a prize list is designed, add a star counter to the
  board and a ticket every three finished requests. It needs a prize machine and
  a place for it. Stardew's machine is in the mayor's house; ours would stand at the Long
  Table with Cuthbert, the reeve (note 20), as the host.
- **Fishing, slaying and hello requests** with their systems.
- **Story quests** with the story, dialogue and mail notes.

## Open

- The chance a day has a request, and the day it begins. Decided 2026-11-03: as
  Stardew does. The owner says most days have a request from early on, but the
  exact chance and start day are unchecked (SC-27). Use a placeholder.
- Item pools, count ranges and gathering pay (tuning).
- Whether the board can hold more than one request at a time: settled (owner, SC-10), it can.
