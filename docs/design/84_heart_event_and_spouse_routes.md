# 84 Heart event and spouse routes

Status: **drafted 2026-11-11, owner answers recorded.** Nothing here is built. It
closes note 80 open item 4 and note 79 rule 7. It builds on `62_heart_events.md`
(the scene runner), `12_marriage.md` (the marriage steps), `79_villager_schedules.md`
(the route rules) and `41_house.md` (the farmhouse). Times and tiles are
placeholders, tuned in data.

Source: the saved Stardew Marriage page, read 2026-11-11 (spouse chores, rooms,
outside areas, wedding timing, divorce). Everything marked "unchecked" is
registered in note 54 (SC-138, SC-139).

## Decided (owner, 2026-11-11)

1. **A heart event needs the person on the map, and the scene places them.** The
   trigger (note 62) fires only if the person's normal route (note 80) has them
   on the event's map when the player steps into the event place. The scene then
   moves everyone to its stage marks with `place` and `walk`, and afterwards the
   person resumes the route from where it would be at that clock time (the pure
   function of note 79 rule 9). **There are no event days and no special event
   routes.** A person who is not there just means the event waits. The event
   place must therefore lie on the person's route during a stated time window, a
   field on the event record, and a test checks that the window and the route
   overlap on at least one open weekday in a season the event allows. Stardew
   gives each event a place, a time window and conditions; how it handles an
   absent person is unchecked (SC-138).
2. **A route is never switched by a heart event.** Note 79 rule 7 allowed it. The
   owner kept it simple: the only route change from a relationship is marriage.
   A story event that needs a changed life (a moved shop, a new hobby) is a
   story-flag override in the weekday and season layers, written with that
   story, not here.
3. **The spouse keeps their village job (owner, 2026-11-11).** This replaces the
   note 12 line "the spouse stays on the farm". The spouse still never travels to
   other rings and has no second home; they walk from the farm to their usual
   route in ring 1 and back. **Not Stardew:** the saved page has spouses living at
   the farmhouse and doing chores.
4. **One shared spouse room and one shared outside corner, 14 prop sets
   (owner, 2026-11-11).** Stardew gives each spouse a unique room and outside
   area (checked on the saved page: a room to the right of the bedroom and a 2 by 8
   tile area north-east of the house, each with an activity). Ours is one room shell
   and one corner built once, with a prop set and an idle key per spouse.
5. **The wedding is on the festival green (owner, 2026-11-11),** always, not the
   Long Table, so it never depends on the bundles. The Long Table stays a hall
   building and is not part of it. Stardew: the saved page gives the timing (a
   morning scene three days after the token, put off by a town-square event or a
   green rain day) but not the venue (SC-139).

## Spouse routes

The spouse takes a **spouse route** that replaces their own default, rain and
weekday routes on every day from the morning after the wedding (note 79 selection
order: heart-event or spouse route, then festival, then weekday, then season).
The spouse route is **built from the person's own route**, not written again:

| Part | Rule | Placeholder |
| --- | --- | --- |
| Wake | Wakes in the farmhouse double bed (`farm:house/bed`) | 6:00 |
| Chores | Small helps only (note 12): feeds the animals, waters a few crops near the house in the growing seasons. No repairs, no full watering | 6:30 to 7:30 |
| Breakfast | At the kitchen. May leave a dish as a gift, once a day, an item from their liked list | 7:30 to 8:00 |
| Leave | Walks to their first stop of the day that their old route lists after 9:00. Leaves early enough to arrive on time, from the walk length | about 8:00 |
| Work | Keeps every stop of their old route from the first work stop to the last stop before 17:00. Shop counters keep the shop hours of note 79 | 9:00 to 17:00 |
| Home | Walks back to the farm. The old `home` stops (parents, the house they grew up in) are dropped | arrives about 18:00 |
| Evening | **Fair weather:** at their outside corner (the 2 by 8 tile area north-east of the farmhouse), doing their idle key. **Rain, snow or winter:** in the room or the kitchen | 18:00 to 21:30 |
| Bed | In the double bed | 22:00 |

Rules:

1. **Stay-home days.** On rain, on a closed day of their old counter (note 80
   open item 1) and on festival days the spouse does not go to work. They stay
   at the farm, or go to the festival with the player's invitation and come back
   with the same wedding-day rules as any villager. On a festival they use their
   own festival spot (note 82) from the opening and are home by the bed time.
2. **Chores need nothing from the player,** so a late or absent player never
   fails them. The helps stop in winter (no watering).
3. **Gifts and talk.** A spouse can be talked to on the farm or in the village by
   the usual rules. Stardew lifts its twice a week gift cap after marriage and keeps
   the once a day cap (checked). Ours has the daily cap of note 61 only.
4. **Old home and old job.** The person's old house stays on the map with their
   family. Their old bed is empty. The family still visit the festivals.
5. **Divorce** (note 12): the spouse route ends the next morning and the person
   goes back to their own routes. The spouse room and the corner vanish and the items
   left in the room go to one chest in the bedroom (note 85, owner 2026-11-11, as
   Stardew, checked: the room and the outside area are gone the next morning and
   items left in the room are put in a chest). The ex-spouse stays friendly at the old heart level (note 12, not
   Stardew, which resets hearts and turns hostile).
6. **No clash with the route rules.** Blocked paths use note 79 rule 10 (wait
   then step around). The farmhouse door is never locked to the spouse.

## The wedding

- **Timing (Stardew, checked):** the ceremony is in the morning, **three days
  after** the token is accepted. The calendar shows a token mark on that day. It
  is put off to the next free day when that day is a festival or green rain day.
- **Place:** the festival green in Hearthwell (decision 5). The scene places the
  guests on stage marks of the green, not on the festival spots of note 82, so the
  Showing's props are not needed. A wedding is never on a festival day, so the
  green is free.
- **Scene:** a ledger-joining scene run by the note 62 scene runner: the hat-maker
  or the steward reads out the two ledgers, hats are given (note 12), the pair
  step through. Then the player and spouse are put in the farmhouse at 6:00 the
  next morning.
- **Guests:** every villager who is on the green or the square on a normal
  morning. A divorced ex-spouse does not come (Stardew, checked).
  The player's own wedding look is the save's (note 12), the wedding look is left
  to the art pass (#58).
- **The day:** the day is free. Shops keep their hours. Nothing is due. The
  spouse route starts the morning after.

## Courtship, proposal and the flags the routes read

The steps and their gifts are settled in note 12. This note adds only the route
and event flags they set:

| Flag | Set by | Read by |
| --- | --- | --- |
| `bouquet-<id>` | The bouquet is accepted at 8 hearts | Courtship events (note 62), the heart cap of 10 |
| `token-<id>` | The token is accepted | The calendar mark, the wedding scene |
| `spouse` (the id) | The wedding scene ends | The spouse route, the spouse events, the 14 heart cap |
| `ex-<id>` | Divorce | Stops the spouse route, hides the spouse events |

One spouse at a time (note 12).

## Spouse events

Spouse events use the extra hearts above 10 (note 62), up to 14 (Stardew: checked
on the saved page, the cap is 14). They follow decision 1: the spouse is on the
farm map or the village map by route, and the scene places them. Their places are
the farmhouse rooms, the outside corner and the green, so **no new interior is
needed.** The list of events is written with the heart events per person.

## What this changes

- Note 12: the line "The spouse stays on the farm" (Decided) is superseded by
  decision 3 here. Spouse chores stay as written (small helps).
- Note 62: add decision 1 to "Shape" (presence rule and the time window field).
- Note 79 rule 7 and note 80 open item 4: closed by this note.
- Note 41: the spouse room is the one shared room of decision 4, set up on marriage
  from tier 1, to the right of the bedroom (note 85).
- Note 55 (farm layout): reserve the outside corner, a 2 by 8 tile area north-east
  of the farmhouse, and a bed, kitchen and door route for the spouse.
- Data: a `spouseWindow` field on an event, a `spouse` field on the save, and a
  `spouseRoute(personId)` function in `src/core/`, a pure function of the old route.

## Open

- The outside corner is settled in note 85: x 70 to 71, y 4 to 11 on the farm, no
  fence.
- The 14 prop sets and idle keys (art, with the voice sheets).
- Whether a spouse's old job keeps going if they run a shop: the shop stays staffed
  by the same person with the shop's own hours (draft: yes), so the family run it
  on their stay-home days.
- The fee amount for divorce (note 12; Stardew's is 50,000g, checked).
- How long the walk is for the far areas (the Mines and the Quarry), and whether the
  spouse should only keep a shortened route there (to tune in play).
- Whether guests at the wedding all fit on the green's marks.
