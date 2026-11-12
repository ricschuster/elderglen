# 62 Heart events

Status: **core rules decided with the owner on 2026-11-06.** The form, the
triggers, the rewards and replay are set. The event list, the scene commands and
the first scripts are not. **Built (#600, 2026-11):** the core rules (`src/core/heartevents.ts`), the runner (`eventrun.ts`, `HeartEventScene`) and three placeholder proof events (`src/content/heart-events.json`). Built 2026-11-12: the presence window of note 84 (a `window` field, a start-inside-window check and a validator test that the person keeps the place in that window). Not built: the real event list and the spouse events. It builds on
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
- Still open: the event list per person, which events give which rewards (#873).
