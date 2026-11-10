# 48 Tap-to-move on touch (draft)

Status: draft. Decided with the owner on 2026-11-02. Nothing here is built. It is
the touch half of step 5 of `45_controls_profiles.md` and turns the settled rules
of `27_touch_controls.md` into a build plan. It uses the aim seam of
`46_desktop_mouse.md` and the Action intent of `47_action_intent.md`. The saved
Mobile Controls page says: tap anywhere and the farmer walks there; tap an item to
action it and the right tool is picked for rocks, wood, stumps and boulders; tap
an NPC or animal to walk next to them and interact.

## Decisions

- **A tap on bare ground only walks (Stardew, decided 2026-11-02).** Tilling,
  watering and planting are done with the stick scheme, which stays one tap away
  in options (note 27, "Why two schemes"). So tap-to-move cannot farm on its own.
  This is a deliberate limit and the options screen should say so.
- **An auto-picked tool stays selected (Stardew, decided 2026-11-02).** A tap on a
  tree selects the axe and leaves it in hand. The toolbar follows the pick.
- **A tap on an object walks next to it and acts.** Which intent depends on the
  object, below. A tap with no route turns the target red and the farmer stays.
- **Holding a finger follows it in a straight line, with no routing (Stardew,
  decided 2026-11-02).** The saved Mobile Controls page says follow-my-finger
  moves directly toward the finger without routing around blocking objects. The
  farmer stops at a tree or rock until the finger moves round it. A tap still
  routes (below).
- **A tap on a seedling picks the axe (decided 2026-11-02).** One rule for
  everything that grows as a tree. Stardew's seedling tool is not checked.
- **An auto-pick pulses the new toolbar slot (ours, decided 2026-11-02).** A
  short pulse of about half a second, so the player sees why the tool changed.
  Stardew shows only the moved highlight, and the saved page warns that edge taps
  can change the tool unexpectedly.
- **A tap on a plot that is not ripe just walks, with no hint (Stardew, decided
  2026-11-02).** The options screen already says a tap cannot farm.
- **The stick scheme is unchanged.** Until this is built, both touch schemes use
  the stick (note 45).

## What a tap does

| Tap lands on | Farmer does |
| --- | --- |
| Bare ground, reachable | Walks there |
| Bare ground, no route | Red target, stays |
| Tree, stump or seedling | Walks beside it, selects the axe, fires Use |
| Weed (note 29) | Walks beside it, fires Use with the held tool. Any tool clears a weed, so the pick does not change |
| Ripe crop, forage, fruit tree with fruit | Walks beside it, fires Action |
| Service (shop, bin, hall, festival) | Walks beside it, fires Action |
| Later: NPC, animal, chest | Walks beside it, fires Action |
| A planted or tilled plot, not ripe | Walks there (no tool use, per the first decision) |

- **"Beside"** means the nearest of the four neighbour tiles by route length, with
  a tie broken in favour of the side the farmer is already on. The farmer faces the
  target, then fires. Standing on the target tile is never used, so a walkable
  crop or forage tile is approached from a neighbour like a blocked one.
- **The aimed tile is the target tile** for the whole walk and the fire, so the
  highlight sits on it from the tap. While a hold follows, the aimed tile is the
  tile under the finger. This is a third aim source beside keys and
  the mouse in note 46, and a touch-only one.
- **Seedlings** are cleared with the hoe or can in the build today, and with the
  axe as well. The tap picks the axe, which also clears them.
- **Energy:** a swing on an exhausted farmer fires and shows the usual line.

## Tap and hold

- A **tap** is a press released within 250 ms and 12 px of where it began. It sets
  a target and the farmer walks there on their own.
- A **hold** longer than that makes the farmer follow the finger: the farmer
  walks in a straight line toward the finger until it lifts (note 27). It does
  not use `findPath`, so a blocker stops the walk.
- **Holding on an object** that was tapped as in the table keeps repeating the
  swing as the axe repeat does today, while the finger stays down and the tile
  still has something to chop.
- 250 ms and 12 px are placeholders until the real tablet check (#59, #63), with
  the existing margin and the give-up wait.

## Pathing

- **A pure function in `src/core/pathing.ts`,** (planned as `path.ts`) free of Phaser: `findPath(from, to,
  blocked)` over tiles, four-way A*, returning the tile list or nothing. It is unit
  tested.
- **What blocks:** `map.isBlocked` and, on the farm, `state.trees.blocks`, the
  same two checks `update` already hands to `move()`. Nothing else blocks today
  (no fences, no NPCs, no animals).
- **Four-way, not eight,** because the farmer's box (`PLAYER`, 10 px wide) is
  narrower than a tile but would clip diagonal corners. Waypoints are tile
  centres.
- **Walking:** the scene turns the next waypoint into a direction vector and feeds
  it to the same `move()` as the stick, so speed, collision and the camera behave
  as they do now. `Controls.vector()` returns that vector for the tap profile.
- **Re-planning:** if the farmer's real position stops advancing for 400 ms (a
  clipped corner, a tree that grew), plan again from the current tile. After 2
  failed plans give up and drop the target. Both numbers are placeholders. Moving
  bodies join this when NPCs and animals exist (note 27: re-plan, then give up).
- **Red target:** the highlight is red only when no route exists, as note 27
  settled. The aimed tile that is an object but has no free neighbour is also
  red.

## Interrupts

Any of these drops the target and the pending action: the stick or a drag past
the 12 px that starts a hold, a new tap (which replaces it), a screen opening over
the farm, a map exit, sleeping or the day ending, and the farmer leaving the
scene. The pending action never fires after an interrupt.

## Interface rules

- **Taps on the toolbar and HUD** go to them first and never become targets. The
  dead margin round the bar and the edge rule of note 27 apply: a world tap in the
  margin walks and never touches the toolbar.
- **Desktop ignores all of this.** The tap code is part of the touch profile only,
  and the mouse code ignores touch pointers (note 46).
- **Eat:** when food is selected the Eat button of note 27 sits beside the
  toolbar and fires Action's eat path (note 47).

## Seam changes

- `Controls` gains a way for the touch profile to hand the scene a tap (a tile and
  whether it is a hold) instead of a vector. The scene owns the path and the
  pending action, since it knows the map and the state.
- The scene's `aimTile()` has a third source: the active tap target.
- `planTap` in `src/core/pathing.ts` (planned as a new `tap.ts`) classifies a tile as walk, tool or action from the table
  above (pure, tested). The scene calls it, then `findPath`.

## Testing

- `findPath` unit tests: open ground, around a tree, no route, a target that is
  itself blocked, the start equal to the goal, a long route.
- `classifyTap` unit tests for each row of the table.
- `npm run playtest:touch` gains synthetic taps: tap to a far tile, tap a tree and
  watch the axe selected and the tree take damage, tap a ripe crop, tap a blocked
  tile and see the farmer stay. Synthetic events may not show a real long press
  context menu (note 45); that stays a tablet check.

## Build order

1. `findPath` and `classifyTap` in core, with tests. No visible change.
2. The touch profile reports a tap; the scene walks a path to a bare tile.
3. Tap an object: face it, select the tool, fire Use or Action. Needs note 47
   step 2 for Action.
4. Hold to follow, hold to repeat, the red target, the interrupts.
5. The playtest additions, then the real tablet check.

## Open

- **Tap and hold numbers, re-plan wait, give-up count:** placeholders.
- **Rocks and boulders** wait for the pickaxe and the mines. The table gets a row
  when they exist.
- **Gifting by tap.** The saved page says a tap on a villager with a giftable
  item selected gives it. That waits for villagers and the gift system.
- **Diagonal smoothing** of the four-way route, if the walk looks stiff.
- **Real tablet check** (#59, #63).
