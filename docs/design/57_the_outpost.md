# 57 The Outpost (draft)

Status: draft. Decided with the owner on 2026-11-06. Nothing here is built. The
Outpost is the carrier post in Hearthwell (`19_valley_layout.md`,
`20_ring1_cast.md`). This note says what it does, and sorts the ways the game
now talks to the player so they do not pile up.

## Decisions (owner, 2026-11-06)

- **Two boards, and the Help Wanted board stays at the general store.** Note 50
  is unchanged: one request a day, 2 days to finish, outside the store.
- **The Outpost wall holds a second, separate board that grows in stages.** Road
  news is there from the start. Special Orders appear later, as in Stardew.
  Special Orders are Stardew's second board (the saved wiki is not read yet, so
  the unlock and details are unchecked, SC-32).
- **One travelling trader, on fixed days.** Stalls outside the Outpost. Stock is
  a small seeded daily draw from a data table.
- **Road news is both flavour and a forecast.** Lines of gossip from beyond the
  valley, the trader's next visit, and tomorrow's weather.

## The ways the game talks to the player

The owner flagged that there are now several. Each one has one job.

| Channel | Where | Job | Starts | Note |
| --- | --- | --- | --- | --- |
| Mailbox | Farm | Letters and attachments, delivered overnight | Day 1 | 51 |
| Help Wanted board | Outside the general store | One small villager errand a day | After day 1 (SC-27) | 50 |
| Road news board | Outpost wall | Gossip, the trader's days, forecast | Day 1 | here |
| Special Orders board | Outpost wall, beside road news | Bigger orders with timers and rewards | Placeholder: after the first hall project (SC-32) | here, later |
| Steward at the counter | Outpost | Says the news aloud, hall hint and toast | Day 1 | 39, 20 |
| Journal | Menu | Records quests, projects and mail. Never a source | Day 1 | 49 |

Rules that keep them apart:

- **Only the mailbox, the two order boards and story beats create quests.** News
  and the steward never create one. Journal shows them, nothing else does.
- **Each board has one place to read it.** Reading the news board is a tap on
  it. The steward speaks the same news, so nothing is only said aloud.
- **No new channel without a row in this table.**

## Road news

- **Flavour:** short lines in `src/content/`, one or two new per day, drawn by
  the day's seed. Written in the voice of `18_dialogue.md`. This is where the
  lore drip-feeds, such as news of carriers on the road. It has no game effect.
- **The trader notice:** says which day the trader arrives and what kind of goods.
- **Forecast:** tomorrow's weather. It is a rule in `src/core/` that reads the
  same roll the overnight step uses, so it is never wrong. A festival heads-up
  the day before is also posted.
- **The farmhouse TV gives the same forecast (Stardew, decided 2026-11-06).** The
  owner confirmed the forecast and says the real TV also has a luck report and a
  cooking show, which we do not copy yet (SC-33). It reads the same rule, so the TV, the board and
  the steward never disagree. The bed forecast already in
  `07_tuning_numbers.md` is the same rule too. The TV is the first thing that
  gives the house TV a job, and note 41 should say so when next edited.
- The board shows today's news. Missed days are not kept.

## Special Orders (reserved, not designed)

- The board is built but empty until the unlock. Orders use the note 50 quest
  record with `source: special`, a longer deadline, and posters who are
  travellers and carriers, not villagers.
- Shape, count, timers and rewards wait for the Stardew check (SC-32). Until
  then no orders are written and the unlock is a placeholder.
- Designed in `65_special_orders_and_debris.md` (2026-11-06): opens Fall 2 of
  year one, the clock starts on acceptance, first completion pays a unique
  reward and repeats pay gold.

## The trader

- **One trader, placeholder name "the road trader".** A halfling or human
  outsider, not a villager and not a candidate for marriage. No lore tie to the
  wardens.
- **A shop only (owner, 2026-11-08).** The player cannot talk to the trader.
  No dialogue, no friendship, no gifts, and no place on the valley map. Only the
  stall and the shop screen exist. They are not one of the 30 named people
  (`20_ring1_cast.md`). Like Stardew's Traveling Cart merchant, from memory and
  unchecked.
- **Visits Wednesday and Saturday (decided 2026-11-06).** A season is 28 days,
  four clean weeks of seven (`26_seasons.md`). Never more than three days
  between visits. Stalls by the Outpost steps from morning to
  evening. Gone on other days, so a trip is a choice.
- **Stock:** 4 to 6 items drawn from a data table, seeded from the day, so a
  reload gives the same stock. Items are things the player cannot buy
  elsewhere yet: a rare seed, a recipe, a decoration. Price is 1.5 times sell
  value (placeholder, in `07_tuning_numbers.md`).
- **Rules:** the draw, the price and the shop sheet follow the existing shop
  screen. A recipe or unlock already owned is not offered again.
- Table and prices live in `src/content/`, the draw in `src/core/` with tests.

## The steward and the building

- **Steward's day:** the steward is Cuthbert, the reeve (note 20). His hours
  are in note 80 (at the counter from 7:50, in his rooms in the evening); the
  old placeholder of 9:00 to 17:00 is replaced. Mail and parcels are lore only: the player gets mail at
  the farm mailbox (note 51). The steward is not a second mail point.
- **The hall hint and toast** stay with the steward (`39_completion_total.md`).
  They walk over from the Outpost to open the hall for hall business.
- **The courier** stands by the notice board or sits on the bench outside. The
  lore stage 2 mark is left on the road news board (`09_story_and_lore.md`).
- **Interior map (placeholder):** one room, about 14 by 10 tiles, one door. A
  counter, the notice wall, a bench, and a stair or door to the steward's rooms.
  A second small map holds the steward's rooms, reached by that door
  (decided 2026-11-06, `58_interiors.md`). Trader stall and boards are outside by the door.

## Build order

1. Road news lines and the daily draw, with the forecast rule and tests.
2. The Outpost exterior and the news board.
3. The trader table, the daily draw and the shop screen.
4. The interior and the steward's counter and schedule, with villager
   schedules.
5. Special Orders, as designed in note 65.

## Open

- The Special Orders list and numbers (note 65).
- Stardew's TV also has luck and cooking channels (SC-33). The trader days and markup are
  ours, not Stardew's.
- Exact lore line cadence, and who writes them.
