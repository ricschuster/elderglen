# 80 Villager routes (default and rain)

Status: **drafted 2026-11-10, owner answers recorded.** Nothing here is built. The
rules are in `79_villager_schedules.md`, the people in `20_ring1_cast.md`, the
names in note 79 "Settled names", the shop hours in note 79 "Shop hours". This
note is the first layer: a **default route and a rain route for each of the 30**.
Weekday and season overrides come after (layered, note 79 "Writing load").
Times and spots are placeholders, tuned in data, not code.

## Owner answers (2026-11-10), each the Stardew way

1. **The inn is the evening gathering place.** From 18:00 to 22:00 the inn's
   common room holds a rotating handful (the two young adults, the smith, the
   librarian, the courier and area visitors). Everyone else is home.
2. **Children and elders have short wandering routes in town.** Children play on the
   festival green and square and are home by 17:00 to 18:00. Retirees sit on the
   square bench and walk the river path. No school.
3. **Area residents make one or two weekly trips to Hearthwell**, on set weekdays.
   Their area is empty then. Rosmarin and Rundahl never come. See "Town trips".

## Conventions

- **Time** is a game clock on the 6:00 to 26:00 day. 24:00 and later is after midnight.
- **Place ids** are `<area>:<spot>`. Areas: `hw` (Hearthwell), `forest`, `mtn`
  (Mountain), `quarry`, `mines`, `delta`, `beach`. Interiors are
  `hw:<building>/<spot>` with spots `counter`, `home` (bed and kitchen) and `room`.
  Shared outdoor spots in Hearthwell: `hw:square` (cart stop, bench),
  `hw:green` (festival green), `hw:river-path`, `hw:outpost-yard`. A test checks
  that every id exists in the map files (note 79 "Data shape").
- **A route lists stops** as `time place (idle key)`. The person walks between stops.
  Idle keys are strings that do nothing until art exists.
- **Closed day:** on a shop's closed weekday the keeper uses the household's
  `home` stops from 9:00 to closing and may be on the square. That is a weekday
  override, written in the next layer. The default route is for an open day.
- **Rain route** (any rain or storm): the same people, indoors where the default
  was outdoors. Keepers keep their counters. Rain-open shops (note 79) open as normal.
- **Bedtime** after the last stop: the person is at `home`, asleep, door locked.

## Hearthwell

| Person | Role | Default route | Rain route |
| --- | --- | --- | --- |
| Odette | Store keeper | 7:00 store/home, 8:50 store/counter (serve), 17:00 store/home (cook), 18:00 inn (sit), 22:00 store/home. Bed 22:30 | Same, but 18:00 stays in store/home |
| Dorrie | Store keeper's partner | 7:30 store/home, 9:00 hw:green (walk), 11:00 store/counter (stock), 14:00 hw:square (chat), 17:00 store/home. Bed 22:00 | 9:00 store/counter (stock) until 17:00, then store/home |
| Fitch | Store child (child) | 8:00 store/home, 9:30 hw:green (play), 12:00 store/home (eat), 13:30 hw:green (play), 17:00 store/home. Bed 20:00 | 9:30 store/home (play) all day |
| Alder | Gardener (works at the store) | 7:00 gardener burrow/home, 8:00 hw:burrow-garden (weed), 9:00 store/counter (help), 13:00 hw:river-path (eat), 14:00 store/counter, 17:00 burrow home. Bed 22:30 | 8:30 store/counter until 17:00, then burrow home |
| Bramwell | Smith | 7:00 smithy/home, 8:50 smithy/counter, 16:00 smithy/room (forge), 19:00 inn (drink), 22:00 smithy/home. Bed 23:00 | Same. The 8:50 to 16:00 counter stands, 19:00 inn |
| Hattie | Inn keeper | 7:00 inn/home, 8:00 inn/room (kitchen), 12:00 inn/counter (open), 24:00 inn/home. Bed 24:30 | Same |
| Podge | Inn partner | 8:00 inn/room (kitchen), 11:00 hw:square (market), 12:30 inn/room (kitchen), 22:00 inn/home. Bed 23:00 | 8:00 inn/room (kitchen) all day, then inn/home |
| Pim | Inn child (child) | 8:00 inn/home, 9:30 hw:green (play), 12:30 inn/room (eat), 14:00 hw:river-path (play), 17:30 inn/home. Bed 20:00 | 9:30 inn/room (play) all day |
| Aurelle | Healer | 7:30 healer/home, 8:50 healer/counter, 17:00 healer/room (study), 19:00 hw:river-path (walk), 21:00 healer/home. Bed 22:30 | Same but 19:00 stays in healer/room |
| Dunmar | Librarian | 8:00 library/home, 9:50 library/counter, 18:00 library/room (read), 19:30 inn (quiet), 22:00 library/home. Bed 23:00 | Same |
| Tilda | Carpenter | 6:30 sawmill/home, 7:30 sawmill/yard (saw), 9:00 sawmill/counter, 17:00 sawmill/home. Bed 22:00 | 9:00 sawmill/counter, 11:00 sawmill/room (work), 17:00 home |
| Rufus | Carpenter's partner | 7:00 sawmill/home, 8:00 sawmill/yard (saw), 12:00 hw:river-path (eat), 13:00 sawmill/yard, 17:30 sawmill/home. Bed 22:00 | 8:00 sawmill/room (work) all day |
| Wren | Carpenter child (child) | 8:00 sawmill/home, 9:30 hw:green (play), 12:00 sawmill/home, 13:30 hw:river-path (play), 17:00 sawmill/home. Bed 20:00 | 9:30 sawmill/home (play) all day |
| Cuthbert | Reeve, steward, postmaster | 6:30 outpost/home, 7:50 outpost/counter, 12:00 hw:outpost-yard (eat), 13:00 outpost/counter, 18:00 hw:square (walk), 19:30 outpost/home. Bed 22:00 | 7:50 outpost/counter until 18:00, then outpost/home |
| Cordelia | Hat-maker | 8:30 hatter/home, 9:50 hatter/counter, 17:00 hatter/room (sew), 19:00 inn (tea), 21:00 hatter/home. Bed 22:30 | Same |
| Barnaby | Hat-maker's sibling | 9:00 hatter/home, 10:00 hatter/room (sew), 12:00 hw:square (market), 13:30 hatter/counter, 17:00 hw:green (sketch), 19:00 inn (drink), 22:00 hatter/home. Bed 23:00 | 10:00 hatter/room until 17:00, then 19:00 inn |
| Linnet | Young adult A (works at the inn) | 7:30 young burrow/home, 9:00 hw:river-path (run), 10:30 inn/counter (serve), 17:00 hw:green (rest), 18:00 inn (serve), 22:00 young burrow/home. Bed 23:00 | 10:30 inn/counter (serve), 18:00 inn, 22:00 burrow home |
| Thistle | Young adult B (works at the inn) | 8:00 young burrow/home, 10:00 inn/room (kitchen), 14:00 hw:square (errands), 16:00 hw:river-path, 18:00 inn/counter (serve), 22:00 burrow home. Bed 23:30 | 10:00 inn/room, 18:00 inn/counter, 22:00 burrow home |
| Hester | Retiree A | 7:00 retired burrow/home, 9:00 hw:square (bench), 11:30 retired burrow/home (eat), 14:00 hw:river-path (walk), 16:30 retired burrow/home. Bed 21:00 | 9:00 retired burrow/home all day |
| Walter | Retiree B | 8:00 retired burrow/home, 9:30 hw:river-path (fish), 12:30 hw:square (bench), 15:00 retired burrow/home, 19:30 inn (one drink), 21:00 retired burrow/home. Bed 21:30 | 9:30 retired burrow/home all day, 19:30 inn |
| Toby | Retirees' grandchild (child) | 8:00 retired burrow/home, 9:30 hw:green (play), 12:00 retired burrow/home (eat), 14:00 hw:river-path (play), 17:30 retired burrow/home. Bed 20:00 | 9:30 retired burrow/home (play) all day |

Aldreth, the courier, lodges at the inn and is in the area table below.

## Outside Hearthwell

| Person | Area and role | Default route | Rain route |
| --- | --- | --- | --- |
| Dilly | Forest, animal keeper | 6:30 forest:farmstead/home, 7:30 forest:paddock (feed), 9:00 forest:farmstead/counter, 16:00 forest:paddock (tend), 18:00 forest:farmstead/home. Bed 22:00 | 7:30 forest:farmstead/room (tend), 9:00 counter, 16:00 farmstead/room, 18:00 home |
| Rosmarin | Forest, hermit witch | 8:00 forest:hermit-tower/home, 9:00 forest:hermit-garden (tend), 12:00 forest:hermit-tower/room (brew), 15:00 forest:fairy-ring (stand), 18:00 hermit-tower/home. Bed 23:30 | 9:00 hermit-tower/room all day, then home |
| Rundahl (Old Greencoat) | Forest, the Wanderer | 8:00 forest:camp (fire), 10:00 forest:farm-road (walk), 13:00 forest:camp (sit), 16:00 forest:wood-path (walk), 19:00 forest:camp (fire). Sleeps at the camp tent, no door | 8:00 forest:camp (under the tent) all day |
| Korvi | Mountain, smith dwarf | 6:30 mtn:forge/home, 8:00 mtn:forge/counter, 17:00 mtn:forge/room (hammer), 20:00 mtn:forge/home. Bed 23:00 | Same |
| Marl | Quarry, stonekeeper | 7:00 quarry:camp/home, 8:00 quarry:yard (work), 12:00 quarry:camp (eat), 13:00 quarry:bridge (check), 17:00 quarry:yard, 19:00 quarry:camp/home. Bed 22:00 | 8:00 quarry:camp (mend) until 17:00, then home |
| Maren | Mines, trainer | 7:00 mines:hall/home, 8:00 mines:hall/dummy (spar), 12:00 mines:hall/home (eat), 13:00 mines:hall/dummy, 19:00 mines:hall/home. Bed 22:00 | Same (underground) |
| Rushie | Delta, fisher | 5:30 delta:hut/home, 6:30 delta:dock (fish), 9:00 delta:hut/counter, 17:00 delta:dock (fish), 20:00 delta:hut/home. Bed 21:30 | 9:00 delta:hut/counter all day, 17:00 delta:hut/home |
| Thalwen | Beach, sea elf | 7:00 beach:cottage/home, 9:00 beach:dunes (gaze), 12:00 beach:cottage/room, 14:00 beach:shore (walk), 18:00 beach:cottage/counter (stall), 20:00 cottage/home. Bed 23:00 | 9:00 beach:cottage/room all day, 18:00 stall |
| Aldreth | Courier, lodges at the inn | 7:00 inn/home, 8:30 hw:outpost-yard (carriers), 12:00 inn/counter (eat), 13:00 hw:outpost-yard, 18:00 inn (sit), 22:30 inn/home. Bed 23:30 | 8:30 outpost/room (sort) until 12:00, then inn |

Aldreth is called Lane until the reveal (ADR 0013), and Rundahl shows as Old
Greencoat (note 79). The route data uses the real names, the display name layer
is separate.

## Town trips (weekday override table, one or two weeks)

Placeholder weekdays, spread so no weekday empties more than two areas. A trip
replaces the whole day after the area's morning stops and returns the person home
to their area by bedtime. Their area has no one in it on that day (note 79,
rule 6).

| Person | Trip day | Town stops | Leaves for home |
| --- | --- | --- | --- |
| Dilly | Tuesday | 10:30 arrives hw:square, 11:00 store/counter, 12:30 inn, 14:00 hw:green (sit) | 15:30 |
| Rushie | Saturday | 10:30 hw:square, 11:30 hw:outpost-yard (the trader), 13:00 inn | 15:00 |
| Maren | Friday | 10:00 smithy (talk to Bramwell), 12:00 inn, 15:00 hw:river-path | 17:00 |
| Thalwen | Sunday | 11:00 hw:square, 12:30 library (visit), 14:30 hw:river-path (gaze) | 16:30 |
| Korvi | Saturday | 11:00 hw:square, 12:30 smithy, 14:00 inn | 17:00 |
| Marl | Sunday | 10:30 hw:square, 12:00 inn, 14:00 hw:green | 16:30 |

The Forest and Mountain have the farm road and the Hearthwell road to walk, which
takes about an hour each way at the base speed, so a trip leaves home first
(about 9:00 for Dilly and Korvi). The stops above are arrival times in town.
On a rainy trip day the person does not travel and uses the rain route at home.

## Weekday overrides (decided 2026-11-10)

Owner answers, each the Stardew way: a keeper goes out on a short outing on their
shop's closed day, one weekly town gathering (a Wednesday market on the square),
and a few people change on Saturday and Sunday. Selection order stays as note 79
(festival, rain, weekday, season, default), so **rain wins over a weekday
override**, and a weekday override only replaces the stops it lists. All later
stops fall through to the default.

**Closed-day rule.** On a keeper's closed weekday their counter stops are
replaced by the outing below. In rain, the rain route applies, and the counter
stops become `room` (the shop stays shut), except the rain-open shops (carpenter,
fisher, Forest keeper) whose rain route stands as written. A keeper away on a
trip day (below) closes their counter for the hours they are away. "Open daily"
(note 79) means no weekly closed day, not that the keeper never leaves.

| Person | Closed day | Outing (replaces counter hours) | Then |
| --- | --- | --- | --- |
| Odette | Wednesday | 9:30 hw:square (market), 11:30 hw:river-path (walk), 13:00 store/home | default from 17:00 |
| Bramwell | Friday | 9:00 hw:river-path (fish), 13:00 inn (eat), 15:00 smithy/room (forge) | default from 19:00 |
| Tilda | Tuesday | Rain-open: the default route stands in rain. Dry: 9:00 hw:square (errands), 11:00 sawmill/yard (repair), 14:00 hw:green (sit) | default from 17:00 |
| Cordelia | Sunday | 10:00 hw:green (sketch), 12:30 inn (lunch), 15:00 hatter/room (sew) | default from 19:00 |
| Dunmar | Monday | 10:00 hw:river-path (walk), 12:30 inn (lunch), 14:30 library/room (read) | default from 19:30 |
| Aurelle | Saturday | 10:00 hw:burrow-garden (herbs, with Alder), 12:30 hw:square, 15:00 healer/room (study) | default from 19:00 |
| Hattie | Thursday | Kitchen counter shut, common room stays open for the evening. 8:00 inn/room, 11:00 hw:square (errands), 13:00 inn/home (rest), 18:00 inn (sit, not serving). Podge and the young adults serve | home 24:00 |
| Cuthbert | Sunday | 10:00 hw:green (stroll), 12:00 inn (lunch), 14:00 outpost/room (sort mail) | default from 18:00 |
| Dilly | Monday | Rain-open. Dry: 7:30 forest:paddock (feed), 10:00 forest:lake (rest), 13:00 farmstead/room | default from 16:00 |
| Rushie | Saturday | Rain-open. Dry: her Saturday is also her town trip day (see below) | default from 20:00 |

Rushie closes on a trip day for the hours she is away; she has no extra outing.
The farmstead is thus closed on Monday and on Tuesday (Dilly's trip), the same as
Stardew's Marnie, who is closed two days.

**Wednesday market.** Wednesday is the trader's day (note 57) and the store is
shut, so the square is full: 9:30 to 11:30 at hw:square (market) are Odette,
Dorrie, Podge, Barnaby, Hester and Walter. They drop their own Wednesday stops
for that window only. Cuthbert stands at hw:outpost-yard (stalls) from 9:00 to
12:00 on Wednesday and Saturday, then returns to the counter. Aldreth is at
hw:outpost-yard (browse) 10:00 to 12:00 on both days.

**Weekend changes (a few people).**

| Person | Days | Change |
| --- | --- | --- |
| Fitch, Pim, Wren, Toby | Saturday, Sunday | 9:00 hw:green (play) all morning, home 12:30 to 13:30 for lunch, 13:30 hw:green (play) until 17:30. Bed 20:00 as default |
| Linnet | Saturday, Sunday | Day off until 17:30: 9:00 hw:river-path (run), 12:00 hw:square, 14:00 hw:green (rest). Serves from 18:00 as default |
| Thistle | Saturday, Sunday | Day off until 17:30: 10:00 library (read), 13:00 hw:green, 16:00 hw:river-path. Serves from 18:00 as default |
| Alder | Sunday | 14:00 retired burrow/home (visit Hester and Walter), 16:30 default |
| Rufus | Saturday | 12:00 hw:river-path (fish) until 17:00, then default |
| Walter | Saturday | 9:30 hw:river-path (fish) with Rufus until 12:30, then default |

Shop hours do not change at the weekend (note 79 "Shop hours").

## Town trips from the area side

A trip day replaces the person's stops from the leaving time to their return.
The area is empty and the counter is closed during that time. Times are
placeholders for the walk (about one hour each way, same as the base speed).

| Person | Leaves | Arrives in town | Leaves town | Home by |
| --- | --- | --- | --- | --- |
| Dilly (Tuesday) | 9:30 | 10:30 | 15:30 | 16:30 |
| Rushie (Saturday) | 9:30 | 10:30 | 15:00 | 16:00 |
| Maren (Friday) | 8:30 | 10:00 | 17:00 | 18:30 |
| Thalwen (Sunday) | 10:00 | 11:00 | 16:30 | 17:30 |
| Korvi (Saturday) | 10:00 | 11:00 | 17:00 | 18:00 |
| Marl (Sunday) | 9:30 | 10:30 | 16:30 | 17:30 |

Maren's trip is longer: the mines are the farthest. The mines hall counter is
Maren's dummy only, so no shop closes. On a trip day the person's area stops
after the return are the default's.

## Open items

1. **Weekday overrides**: done above. Left: a count of closed counters per weekday
   (the owner can check the load), and heart-event days.
2. **Season overrides**: the fisher in winter (note 79), Rundahl's camp in the
   snow, the retirees and children indoors in winter.
3. **Festival spots**: each person's spot on the green per festival, written with
   the festival maps (note 66).
4. **Heart event and spouse routes** (note 79 rule 7) wait for #600 and note 12.
5. **Register**: SC-106 and SC-109 are still open. Everything here is from memory
   (Stardew's schedules are per person), not checked.
