# 47 The Action intent: what Use does and what Action does (draft)

Status: draft. Decided with the owner on 2026-11-02. Built: the `use` and `action` intents (`src/scenes/controls.ts`) and right-click as Action. It
finishes the intent seam of `45_controls_profiles.md` and unblocks right-click in
`46_desktop_mouse.md`. The Stardew split is from memory. The saved Controls page
says only "Use tool or place item" for C and left-click and "Check/Do Action" for
X and right-click. The saved Mobile Controls page adds that tapping a rock or tree
picks the right tool.

## Decisions

- **The Stardew split (decided 2026-11-02).** Use swings tools and places
  things. Action is everything you check, open, pick or eat.
- **Eating is on Action, F stays as ours.** This corrects note 46, which had a
  left-click on food eating. Left-click on food does nothing. F keeps its own
  eat intent as an extra.
- **Action works with any slot selected,** including an empty one, and does
  nothing quietly when the tile has nothing to act on: no message, no energy.
- **The `action` key and mouse button already exist** in the bindings (X, with
  right-click planned). Only the intent and its handler are new.

## What moves

Today `FarmScene.use()` does all of this. After the split:

| Thing on the aimed tile | Today | After |
| --- | --- | --- |
| Shop, bin, hall, festival (services) | Use | Action |
| Ripe crop | Use | Action |
| Forage item | Use | Action |
| Shaking a fruit tree | Use | Action |
| Held food | the Eat key or button | Action, and the Eat key |
| Hoe, axe, can on a tile | Use | Use |
| Planting a seed or a tree seed | Use | Use |
| Clearing a seedling with hoe or can | Use | Use |
| Later: talking, chests, doors, animals | none | Action |

- **A tile with a service:** Use does nothing there (no tool swing, no energy). A
  swing on a shop door has no point.
- **A tile with a ripe crop:** Use with a hoe or can on it does nothing and costs
  nothing. Use with a seed says the tile is taken (the existing plant refusal).
- **Held-slot independence:** Action never reads the held slot, except for food
  (below). The "nothing held" message belongs to Use only.

## Order on one tile

Action takes the first that applies:

1. A service (open its screen).
2. A fruit tree with fruit (shake).
3. A forage item (pick up).
4. A ripe crop (harvest).
5. Held food, if the tile held nothing (eat).

Food comes last, so standing at a crop with an apple selected harvests first. That
order is ours; Stardew's is not checked.

## Core change

- `useHeld` in `src/core/tools.ts` splits: tool and plant cases stay, and the last
  two lines (`shake`, `forage`, `harvest`) move to a new `act(g, map, x, y)` in
  `src/core/` beside it. It returns the same `Outcome` and the same reasons, plus
  a new quiet "nothing here" result that shows no message.
- `FarmScene` gets `action()` beside `use()`, both reading the one `aimTile()`
  from note 46. Services move out of `use()` into `action()`.
- `Intents` in `controls.ts` gains `action`. The desktop profile fires it from the
  bound key and from right-click. The touch profile fires it from the stick
  scheme's action button and from the tap-to-move walk.
- The eat path calls the same eat function as today; only the trigger changes.

## Touch

- **Stick scheme:** the use and action buttons note 27 already draws. The action
  button now does what it says. When food is selected, the Eat button of note 27
  is the action button, so there is no third button.
- **Tap-to-move (not built, own note):** a tap on a crop, forage, a service door
  or an NPC walks there and fires Action; a tap on a rock or tree fires Use with
  the right tool; a tap on bare soil walks only. This is where Stardew's auto tool
  choice lives and it moves into that note.

## Hints and help

- The desktop hint line already built from the bindings lists Action, with the
  right-click shown beside the key.
- Messages that said "Select a tool or item" or "Nothing to pick here" stay with
  Use or move with their action; a quiet miss on Action has no text.

## Migration cost

- Scripted playtests press the Use key to harvest, pick forage, open the shop and
  the bin. They move to Action, and the shared `scripts/playtest/` helpers need an
  `action` call. This is most of the work and should be its own step.
- Unit tests of `useHeld` split into `useHeld` and `act`.
- Help text, the title screen controls line and `07_tuning_numbers.md` need no new
  numbers.
- Note 46 and note 45 change where they mention left-click eating.

## Build order

1. `act()` in core with tests and the quiet result. Done. `useHeld` still
   delegates its hand case to the same helper, so nothing changes in play until
   step 2 removes it.
2. `action()` in `FarmScene`, the `Intents` entry, the desktop key wiring, and
   Use ignoring services and crops. Playtest helpers move to Action. Done. Two
   departures: the hand tool still picks and harvests on Use, and the touch Eat
   button became the Action button here, since touch players had no other way to
   open a shop or harvest.
3. Eat on Action, with the F key as the extra.
4. Touch action button and the Eat button merge (stick scheme).
5. Right-click, in step 3 of note 46.

## Open

- **The order of the five** in "Order on one tile" is unchecked.
- **Food after a miss:** whether an apple is eaten when the tile has nothing is
  from memory. The alternative is to eat only with the tile empty and the cursor
  off any object.
- **Energy:** harvest and forage cost nothing today and stay so.
- **The in-game menu and the journal** are designed in `49_menu_and_journal.md`.

Update 2026-11-08: the Hand tool no longer exists. Action does its picking,
shaking and harvesting. See `70_tools_in_the_backpack.md`.
