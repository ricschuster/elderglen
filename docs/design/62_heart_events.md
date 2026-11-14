# 62 Heart events

Status: **core rules decided with the owner on 2026-11-06.** The form, the
triggers, the rewards and replay are set. The event list, the scene commands and
the first scripts are not. **Built (#600, 2026-11):** the core rules (`src/core/heartevents.ts`), the runner (`eventrun.ts`, `HeartEventScene`) and four placeholder events (`src/content/heart-events.json`): three proofs and Cordelia's 4 heart event, which unlocks tailoring (note 96). Built 2026-11-12: the presence window of note 84 (a `window` field, a start-inside-window check and a validator test that the person keeps the place in that window). Not built: the real event list and the spouse events. It builds on
`61_friendship_and_gifts.md` and is layer 4 in `18_dialogue.md`.

Source: the saved Stardew Friendship page, read 2026-11-06 (events unlock at
heart levels, most can be seen out of order, some can be missed for good). The
rest is Stardew's shape from the owner's play and memory, unchecked
(SC-45).

## Decided (2026-11-06)

1. **A heart event is a full cut-scene (Stardew).** Control is taken. The camera
   pans and holds, several people move on a script, there are portraits,
   dialogue, emotes, music and small effects, and sometimes a choice. This is the
   costly option. It is chosen on purpose, and the cost is held by the layers
   below.
2. **It starts when the player walks into the place.** Each event names a
   place, a heart level and optional conditions (season, weather, an earlier
   event, a hall milestone, a flag). It starts when the player steps into the
   spot, not by menu. **A short warning comes first**, so no afternoon is lost
   without notice, as festivals already do (`14_festival_calendar.md`). The
   player may say "not now" and the event waits. One event a day, and none on a
   festival day. The owner says Stardew also warns (checked in play 2026-11-07, SC-45; how it warns is not recorded), so ours matches.
3. **Events may reward. Talks may not (`18_dialogue.md`).** An event can set a
   story flag, give an item, a recipe or a house keepsake. Choices in an event
   only change how fast hearts rise or which lines follow. They never take
   hearts away and never change other people's opinions. Stardew lets some
   choices lower friendship. Ours do not, which keeps the no-loss rule for
   choices decided in `61_friendship_and_gifts.md`.
4. **Events can be replayed from the journal.** Seen events are listed in the
   Social tab (`49_menu_and_journal.md`) and can be replayed without rewards. An
   event that has not been seen stays waiting. Nothing is lost for good. Stardew
   lets some events be missed for good. The owner says it also has a replay
   (checked in play 2026-11-07, SC-45).

## Shape

- **Heart steps.** Events sit at 2, 4, 6, 8 and 10 hearts for the 14 candidates
  and the deep tier. The standard tier gets fewer, set at writing. Courtship
  events unlock after the bouquet (`12_marriage.md`) at the heart steps above 8.
  A spouse's events use the extra hearts.
- **Presence (2026-11-11, note 84).** An event starts only if the person's route
  has them on the event's map, and the scene places them. No event days. The event
  record has a time window that must overlap the route.
- **Order.** Events run in any order within a person, except where a story needs
  one first. No event needs a person to be reached by a date.
- **Not on the first-playable path.** No event gates the hall, the bundles or the
  ending. They are a reward for being a neighbour.

## Cost, and how it is held

Full cut-scenes need a scene runner, and each scene needs art and writing. The
cost is paced:

1. **The scene runner first,** as one small piece of code: commands such as
   walk, face, say, choose, pan, wait, emote, play music and set flag. The
   scenes are data, with a validator that checks every path ends and every flag
   is defined (as for conversations).
2. **One scene proves the runner.** Then the eight slice 4 people, 2 and 4 hearts
   only. The 6, 8 and 10 heart events follow layer by layer, and the other 22
   people after them.
3. **Layer 4 comes after layers 1 to 3** for every person (`18_dialogue.md`).
   This stands: base lines and reactive lines for everyone before any event.
4. **Reuse.** A shared set of emotes, walk paths and stage marks per map, so a
   scene is mostly text and a few moves. Event sprites (a person sitting, a
   gift, a surprise pose) are the main new art, per person.

## Scene commands (draft, 2026-11-06)

A scene is a list of commands in data. The runner knows only these, so a new
scene never needs code. Each command has a name and a few fields.

| Group | Commands |
| --- | --- |
| Stage | `place` (put a person on a stage mark), `walk` (a person along a named path), `face`, `pose` (an event sprite such as sitting), `hide`, `show` |
| Camera | `pan` (to a mark or a person), `hold`, `zoom`, `snap` (cut back to the player) |
| Talk | `say` (person, line id, portrait), `emote` (person, emote name), `choose` (a few answers, each jumping to a label) |
| Flow | `wait`, `label`, `jump`, `if` (flag or heart test, then jump), `end` |
| Sound | `music` (play, change or stop), `sfx` |
| Effects | `fade`, `shake`, `tint`, `weather` (a short local effect only) |
| Result | `setFlag`, `give` (item, recipe or keepsake), `rise` (the heart speed note of a choice), `unlockMail` |

- **Stage marks and paths are per map,** named in the map data and shared by
  every scene on that map (the reuse rule above). A scene refers to "counter",
  "table_a" or "door", never to tile numbers.
- **Control is taken at `start` and returned at `end`.** `end` always returns
  control, restores the camera and the time of day, and marks the event seen.
- **The player is always a stage actor,** moved by `place` and `walk` like
  anyone else. Their look comes from the save.
- **No command lowers hearts.** There is no `lose` command. `rise` only sets a
  speed, in line with the no loss rule.
- **`give` is skipped on replay,** and so is `setFlag` for story flags. A
  replay runs the same commands with the Result group turned off.

### Validator rules

Checked at build time and in a unit test, as for conversations
(`18_dialogue.md`):

1. Every path reaches `end`. No loop without a `wait` or a line.
2. Every `jump` and `choose` target is a defined `label`, and every label is used.
3. Every flag read or set is in the flag list, and every flag read is set
   somewhere.
4. Every person, stage mark, path, sprite pose, emote, music id and line id
   exists.
5. Every `give` names a real item or recipe.
6. No unreachable commands, and no `choose` with fewer than two answers.
7. Event conditions use only known flags and hearts. A scene may not set a flag
   that an earlier layer of the same person reads.
8. Banned words and the no em dash rule apply to every line, as for talks.

## Data and build

- **An event record:** id, person, place, heart level, conditions, the script
  (a list of commands), rewards, and the replay flag. One file per person
  under `src/content/`, next to the conversations.
- **Save fields:** events seen, per person, and the events waiting. Replay needs
  nothing else.
- **Core module:** the trigger rules live in `src/core/` and are unit tested.
  The scene runner lives in `src/scenes/`, because it uses the camera.
- **Build order:** slice 4 (`33_build_order.md`), after friendship and layers 1
  to 3.

## Not decided (open)

- Whether the command set above is enough once the first scene is written. The
  proof scene may add or drop commands.
- Which events give which rewards, and the heart event list per person.
- Music for events, left to the audio plan.
- The group event for dating several people (Stardew has one that blocks gifts
  for a week). Ours has none: no pairing limits means no jealousy event.

## Owner decisions (2026-11-12)

- **Count.** A standard tier person gets up to five events, at 2, 4, 6, 8 and 10 hearts.
  The 10 heart event is kept because friends run to 10 hearts (note 61, rule 1). Stardew's
  own count is from memory and unchecked (SC-45).
- **Warning.** A visible mark over the person plus a short soft chime, with a text line the
  first time only. Walking away is "not now" and the event waits. It works on a tablet with
  no text to read.
- Still open: the event list per person, the story of each scene and the item names.

### Scale and rewards (owner answers 2026-11-12, #873)

- **M3b scale.** Every person gets two events, at 2 and 6 hearts, about 60 scenes with
  placeholder text. The 4, 8 and 10 heart slots are kept in the data as empty and are
  written with the voice sheets in M3d. The 14 candidates and deep tier then reach five.
  Courtship events stay out (CLAUDE.md scope).
- **Reward pattern, fixed by heart step, with a person-specific item** that follows that
  person's tastes (note 61, so #872 comes first): 2 hearts a small gift item; 4 a recipe
  or craft recipe; 6 a useful item or a shop or tool unlock; 8 a keepsake (decor or
  hat); 10 a unique keepsake. Only 2 and 6 are built in M3b. Stardew's reward pattern
  is unchecked (add to SC-152).
- **Build order.** Gift tastes (#872), then the event list per person as a table in this
  note, then the scenes as data in `heart-events.json`, one person per file as note 62
  says. Scenes reuse the proof engine, so they are a data job a subagent can do.

## Event list, first draft (2026-11-13, for owner edit)

Owner chose on 2026-11-13: Claude drafts the whole list, the owner edits. The four built
events stay, and Rosmarin 4 and Cordelia 4 are extra slots (those two people have 2, 4 and
6). Odette 2 and Hattie 2 (rain) fill their 2 heart slots. So 58 events are new.

How to read it: **Place** is a note 80 id and **Window** is a stretch the person's default
route holds them there, so the note 84 overlap test should pass. A weekday or season in the
Condition column is a first guess. **Seed** is one line of story, ours, for the voice sheets
to expand in M3d. **Reward** follows the fixed pattern: 2 hearts a small gift item the person
loves or likes (note 61 and 90 ids), 6 hearts a useful item, recipe or unlock. Every 6 heart
reward and every story seed is a placeholder to edit. Times are placeholders.

| Person | Hearts | Place | Window | Condition | Seed | Reward |
| --- | --- | --- | --- | --- | --- | --- |
| Odette | 2 | hw:store | 9:00 to 16:00 | built | Counts coins, asks for help with a late order | Letter later teaches the tea sapling |
| Odette | 6 | hw:store | 17:00 to 18:00 | none | Shows the shop's old ledger and the first jar she sold | Jam tart recipe (dish) |
| Dorrie | 2 | hw:green | 9:00 to 11:00 | dry | Walks the green, asks what the player is growing | peach |
| Dorrie | 6 | hw:store | 11:00 to 14:00 | none | Finds a ledger mistake and the player helps find it | market-pie (plain item, owner 2026-11-13) |
| Fitch | 2 | hw:green | 9:30 to 12:00 | dry | Wants to trade a shiny find | apple |
| Fitch | 6 | hw:green | 13:30 to 17:00 | dry | Proud of a hoard, hides one thing for the player | pocket-coin |
| Alder | 2 | hw:burrow-garden | 8:00 to 9:00 | none | Weeding, grumbles about slugs | kale |
| Alder | 6 | hw:store | 9:00 to 13:00 | none | Brings a seedling to the store and asks for a name | Mixed seed packet x5 |
| Bramwell | 2 | hw:smithy | 16:00 to 19:00 | none | Forge cools, asks the player to hold a tong | iron-bar |
| Bramwell | 6 | hw:smithy | 16:00 to 19:00 | none | Shows the first blade he made, mends a tool | gold-bar (plain item, owner 2026-11-13) |
| Hattie | 2 | hw:inn | any open | rain | Built | Built |
| Hattie | 6 | hw:inn | 12:00 to 17:00 | none | The kitchen is short staffed, the player carries trays | Farmhouse stew recipe (dish) |
| Podge | 2 | hw:square | 11:00 to 12:30 | dry | Tastes the stalls and offers a spoon | chanterelle |
| Podge | 6 | hw:inn | 12:30 to 17:00 | none | Teaches a stew in the kitchen | mushroom-stew recipe |
| Pim | 2 | hw:green | 9:30 to 12:30 | dry | Wants to play a game, will not take no | honey |
| Pim | 6 | hw:river-path | 14:00 to 17:30 | dry | Dares the player to cross the stones | Spinning top (decor) |
| Aurelle | 2 | hw:river-path | 19:00 to 21:00 | dry | Evening walk, notices a herb on the bank | fiddlehead-fern |
| Aurelle | 6 | hw:healer | 8:50 to 17:00 | none | Needs a remedy brewed, the player gathers | Healing broth recipe (dish) |
| Dunmar | 2 | hw:library | 9:50 to 18:00 | none | A book is missing and he suspects a thief | quartz-crystal |
| Dunmar | 6 | hw:library | 18:00 to 19:30 | none | Shows his favour ledger and where the player stands | mushroom-stew (plain item, owner 2026-11-13) |
| Tilda | 2 | hw:sawmill | 7:30 to 9:00 | none | A beam is stuck, asks for a hand | wood |
| Tilda | 6 | hw:sawmill | 9:00 to 17:00 | none | Shows drafts for the player's farm | copper-bar (plain item, owner 2026-11-13) |
| Rufus | 2 | hw:sawmill | 8:00 to 12:00 | none | Whittles a bird and asks which it is | corn |
| Rufus | 6 | hw:river-path | 12:00 to 13:00 | none | Fishing, tells where he caught nothing | Fine bait x10 |
| Wren | 2 | hw:river-path | 13:30 to 17:00 | dry | Climbs a tree, cannot get down | pine-nut |
| Wren | 6 | hw:green | 9:30 to 12:00 | dry | Found a nest, wants it kept secret | Feather jar (decor) |
| Cuthbert | 2 | hw:outpost-yard | 12:00 to 13:00 | none | Eats lunch, asks about the hall's progress | honey |
| Cuthbert | 6 | hw:square | 18:00 to 19:30 | none | Walks the square and tells the valley's founding | A letter next morning with a hall hint |
| Cordelia | 2 | hw:hatter | 9:50 to 17:00 | none | Matches a hat to the player's face | cloth |
| Cordelia | 4 | hw:hatter | built | built | Machine event | Unlocks tailoring |
| Cordelia | 6 | hw:hatter | 17:00 to 19:00 | none | A hat for a festival, the player picks the trim | Trimmed Festival Hat |
| Barnaby | 2 | hw:green | 17:00 to 19:00 | none | Sketches the player in the wrong hat | grape-wine (a keg wine) |
| Barnaby | 6 | hw:inn | 19:00 to 22:00 | none | Plays a prank on Cordelia, the player is in on it | Jester's Cap |
| Linnet | 2 | hw:river-path | 9:00 to 10:30 | dry | Running, challenges the player to a race | peach |
| Linnet | 6 | hw:inn | 18:00 to 22:00 | none | Wants to try the player's job for a day | Runner's porridge recipe (dish) |
| Thistle | 2 | hw:library | 10:00 to 14:00 (rest) | none | Reads under a counter, hides the book | crocus |
| Thistle | 6 | hw:river-path | 16:00 to 18:00 | dry | Reads a poem aloud to the river | Poetry book stand (decor) |
| Hester | 2 | hw:square | 9:00 to 11:30 | dry | Knits on the bench and asks the news | wool |
| Hester | 6 | hw:river-path | 14:00 to 16:30 | dry | Tells a scandal about Walter | Hester's Knit Cap |
| Walter | 2 | hw:river-path | 9:30 to 12:30 | dry | Fishing, a long tale about the one that got away | perch |
| Walter | 6 | hw:inn | 19:30 to 21:00 | none | Shows a lucky lure | Glint lure |
| Toby | 2 | hw:green | 9:30 to 12:00 | dry | Shows a beetle | cockleshell |
| Toby | 6 | hw:river-path | 14:00 to 17:30 | dry | Finds a shell no one has seen | Shell dish (decor) |
| Dilly | 2 | forest:paddock | 7:30 to 9:00 | none | Feeding time, asks the player to hold a lamb | egg |
| Dilly | 6 | forest:paddock | 16:00 to 18:00 | none | A sick animal, the player fetches a remedy | Honeyed milk recipe (dish) |
| Rosmarin | 2 | forest:hermit-garden | 9:00 to 12:00 | none | Catches the player at the fence, sets a test | wild-ginger |
| Rosmarin | 4 | forest:fairy-ring | built | built | Fairy ring event | Letter flag, tea sapling chain |
| Rosmarin | 6 | forest:hermit-tower | 12:00 to 15:00 | none | Brews something, shows the tower room | Tower tonic recipe (dish) |
| Rundahl | 2 | forest:camp | 8:00 to 10:00 | none | Offers tea at the fire, asks nothing | wild-garlic |
| Rundahl | 6 | forest:camp | 13:00 to 16:00 | none | A story of the road, hints at the wardens | fiddlehead-fern (plain item, owner 2026-11-13) |
| Korvi | 2 | mtn:forge | 8:00 to 17:00 | none | Sparks fly, asks for ore | copper-bar |
| Korvi | 6 | mtn:forge | 17:00 to 20:00 | none | Shows a dwarven alloy | Hearthsilver bar x2 |
| Marl | 2 | quarry:yard | 8:00 to 12:00 | none | Cracks a stone, names the vein | quartz-crystal |
| Marl | 6 | quarry:bridge | 13:00 to 17:00 | none | Hums while checking the bridge, tells its history | granite-gudgeon (plain item, owner 2026-11-13) |
| Maren | 2 | mines:hall | 8:00 to 12:00 | none | Counts reps, asks the player to spot | hearty-omelette |
| Maren | 6 | mines:hall | 13:00 to 19:00 | none | A bout against the dummy | Camp scramble recipe (dish) |
| Rushie | 2 | delta:dock | 6:30 to 9:00 | none | Laughs at a tangled line | mackerel |
| Rushie | 6 | delta:dock | 17:00 to 20:00 | none | Shows a favourite spot at dusk | Moth lure |
| Thalwen | 2 | beach:dunes | 9:00 to 12:00 | dry | Gazes at the land and asks what a tree is | #shell item, razor-clam |
| Thalwen | 6 | beach:shore | 14:00 to 18:00 | dry | Shows a sea song, the tide answers | Tide bowl (decor) |
| Aldreth | 2 | hw:outpost-yard | 8:30 to 12:00 | none | Sorts bags, asks the player to carry one | fried-egg |
| Aldreth | 6 | hw:inn | 18:00 to 22:30 | none | Tired of roads, says what the warden's work costs | hearty-omelette (plain item, owner 2026-11-13) |

### Notes on the draft

- Hester, Walter and the children rest at home when it rains, so every event for them is
  dry weather. Rain events (like Hattie 2) are worth adding for a few people; the rain
  route sends people to rooms, which gives a closed in feel.
- Dry-weather events for the area residents (Rushie, Thalwen, Dilly) rely on their
  town trip days not removing them from the area. The validator test must check that.
- Thalwen 2 gives a `#shell` item or razor-clam, the person's own loves, not a new item.
Decided 2026-11-13 (owner, Stardew): no unlock rewards in M3b, those seven are plain items.
- Rewards that are an unlock (price cut, tool perk, road pass) need a built effect before
  they work. Until then the reward can be a plain item. Decide which unlocks are real.

### Edits applied (2026-11-14, owner: "go with the recommendation", #873)

- The 21 placeholder 6 heart rewards are now real: seven new event-taught dishes (source kind
  `event`), five decor keepsakes, three new hats (`give` takes a `hat`), existing bait, lures
  and hearthsilver for the fishers and Korvi, and a hall hint letter for Cuthbert. All are
  placeholder names and numbers. The decor, hats and dishes have colour art only.
- Four rain events at 4 hearts: Odette (store), Dunmar (library), Aurelle (healer), Thistle
  (inn kitchen, since Thistle is at the inn in rain, not the library).
- Dry weather conditions were already set on every "dry" row.
- Data is one file per person in `src/content/heart-events/`, with `_shared.json` for the
  flags and emotes. Events now run in person order, not the old table order.
- Left: the story seeds and windows were taken as drafted; the owner can still change them.
