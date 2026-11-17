# 27 Touch controls (draft)

Status: tap-to-move built 2026-11-08 (`src/core/pathing.ts`, `src/scenes/FarmScene.ts`);
the floating stick is the second scheme (`src/scenes/controls.ts`). Decided with
the owner on 2026-10-31. Tablet players asked for Stardew's default controls on
2026-11-08, so tap-to-move is the default. A tap on the tile beside the farmer
faces it and uses the held tool (our rule, for careful tilling and placing).
The tap scheme has no Use button, only Action. Reference: the Stardew
Valley Wiki Mobile Controls and Controls pages, read only (ADR 0002).

## Decisions

- Default on a tablet is tap-to-move, as in Stardew. Tap a spot and the farmer
  walks there. Holding a finger down makes the farmer follow it.
- Tapping an object walks to it and acts on it, picking the right tool for the
  job (pickaxe for a rock, axe for a tree). The scythe, seeds and food stay
  manual picks from the toolbar, as in Stardew.
- A second scheme is a floating stick on the left half with a use-tool button
  (hold to repeat) and an action button on the right. The stick we have now is
  the base for it.
- The player switches scheme in options. Two schemes only.
- Keyboard and mouse on desktop are a separate profile and are not mixed with
  touch. See `45_controls_profiles.md`.

## Why two schemes

Stardew's own page says tap-to-move is too imprecise for careful placement, so
it points players to a stick scheme for those jobs. Tilling a tight plot and
placing objects are our careful jobs, so the stick scheme must stay one tap
away in options.

## Settled on 2026-10-31

- **Pathfinding:** tap-to-move finds a route around rocks, trees, water and
  fences on the tile grid (A* on the collision map). The target is highlighted
  red only when no route exists, and the farmer does not move. Stardew also
  highlights a blocked target in red, but its routing stalls on moving NPCs and
  animals; ours re-plans when a moving body blocks the route and gives up
  after a short wait instead of wandering.
- **Edge taps:** the toolbar takes taps only on a slot, with a dead margin round
  the bar. A world tap in the margin along the screen edge walks the farmer and
  never touches the toolbar. Stardew only warns players to take care near the
  edges, so this is a fix where it has none.
- **Layout (changed 2026-11-11, owner):** on touch the toolbar is one fixed column
  down the left edge in its own strip, and the map is drawn to its right, so a
  bar never covers a tile or an exit (the bottom bar hid south exits on the
  tablet). When the window is too short for all slots, the column scrolls by drag
  and keeps the held slot in view; a tap selects. The Row button sits at the
  foot, beside the column. Desktop keeps the bottom bar. In the stick scheme the
  use-tool and action buttons sit above the right end of the screen. When food is selected an Eat button appears
  beside the toolbar (tap-to-move scheme) or takes the action button's place
  (stick scheme).

## Tap uses the held tool when it fits (decided 2026-11-11, built 2026-11-11)

Found on the first tablet play (2026-11-11): a tap one tile away tilled, a tap
two tiles away only walked, so a plot could not be worked by tapping. Stardew's
saved Mobile Controls page says a tap on bare ground only walks, objects
auto-pick the tool, and careful placement is for the stick scheme (SC-123).
Owner chose option A:

- **One rule for every tap.** Tap a tile. If the held item has a use on that
  tile, the farmer walks beside it and uses the item once. If not, the farmer
  only walks there. The tile beside the farmer is the same rule with no walk.
- **What fits:** the hoe on a diggable tile, the can on tilled soil or a crop,
  seeds on tilled soil, fertilizer on a crop or soil, a sprinkler or machine on
  an open tile. Trees and rocks keep the auto-picked axe or pickaxe.
  The scythe stays a manual pick. Anything else only walks.
- **Drag works the tiles.** With the hoe, can or seeds held, a finger dragged
  over tiles works each new reachable tile, as the mouse drag does on desktop
  (note 55 "Built status", #780, #783). A drag with any other item only follows
  the finger.
- **Energy and seeds.** A tap that only walks never costs energy or a seed.
- **The mark.** The target outline is white when the tap will use the item,
  grey when it will only walk, red when there is no route.
- **Test.** Unit tests for the "does the held item fit this tile" decision in
  `src/core/` (free of Phaser); a tablet check of a 4 by 4 plot, tilled, planted
  and watered by taps and drags.

## Tap makes the Action button obsolete (decided 2026-11-11, built 2026-11-11, not yet played on the tablet)

In the tap-to-move scheme the Action button goes, as the Use button did. Every
job it does gets a tap target. Owner answers, 2026-11-11 (Stardew's saved Mobile
Controls page says only "Tap on items to action them" and that tapping an NPC,
animal or pet walks you next to them and interacts; eating and the horse are not
on it, SC-125 and SC-126):

- **Services, doors, talking, chests.** Already a tap: walk beside it and run
  Action. Unchanged.
- **Ripe crop, forage item, fruit on a tree.** A tap walks beside it and runs
  Action, whatever is held (a hoe or can included). The soil-work rule above
  still decides tiles with no crop; a ripe crop is a harvest first.
- **Eating.** Tap your own farmer to eat the held food. With nothing edible held
  the tap only walks (the farmer is under the finger, so nothing moves).
- **The horse.** Tap the horse to mount. Tap your own farmer to get off. The
  "Press Action to get off" message says "Tap yourself to get off" in this
  scheme.
- **The stick scheme keeps its Action button.** Nothing else changes there.
- **Test.** Unit test for what a tap on each of these tiles resolves to (in
  `src/core/`); a tablet check of harvesting a plot, eating and riding by taps.

## Open questions

- Checked on a real tablet (#59, #63) before either scheme is called done. The
  dead margin width, the Eat button size and the give-up wait are placeholders
  until then.

## Reference: Stardew's mobile control options (owner screenshot, 2026-11-16)

Reference only (ADR 0002). The Stardew mobile options page offers a list of
control schemes (names as shown, from the owner's tablet):

1. Tap-to-move and Auto-Attack (selected by default)
2. Tap-to-move and Attack Joystick
3. Invisible Joystick and 2 Buttons
4. Invisible Joystick and 1 Button
5. Tap-to-move and Joystick and Buttons
6. Tap-to-move and (Joystick and Buttons) (weapons)
7. Tap-to-move and Joystick and (Buttons) (weapons)
8. Tap-to-move and Joystick
9. Joystick and Buttons

Ours today: tap-to-move (default, no buttons) and a floating stick with use and
action buttons. Rows 2, 6 and 7 are about weapons in the mines; rows 3 and 4 use
an invisible stick so nothing sits on the screen.

## Control schemes list (decided 2026-11-16, built 2026-11-16)

Owner decision: the Options tab offers a list of the nine, named as Stardew names
them. Default stays tap-to-move and Auto-Attack. The old two-way setting still
loads: "tap" becomes Tap-to-move and Auto-Attack, "stick" becomes Joystick and
Buttons. Each scheme is a recipe of parts in `src/core/controlschemes.ts`
(tested in `tests/controlschemes.test.ts`); `src/scenes/controls.ts` builds the
sticks and `hud.ts` shows the buttons.

Parts: tap-to-move, a move stick (visible ring or invisible), a Use and an Action
button (or one combined button), an Auto-Attack, an attack-aim stick. Behaviour
of each Stardew scheme is unchecked (SC-188), so these are our readings:

| # | Scheme | Our reading |
| --- | ------ | ----------- |
| 1 | Tap-to-move and Auto-Attack | As before, plus a held weapon swings by itself at the nearest creature in reach. Stardew's exact auto-attack rule is unknown. |
| 2 | Tap-to-move and Attack Joystick | Tap-to-move, plus an aim stick in the lower-right corner while a weapon is held: push to face and swing that way (a sling shoots along it). Guess. |
| 3 | Invisible Joystick and 2 Buttons | The floating stick with nothing drawn, plus Use and Action. Guess. |
| 4 | Invisible Joystick and 1 Button | Invisible stick and one "Do" button: it acts on a person, service, ripe crop or the horse ahead, else uses the held item. Guess. |
| 5 | Tap-to-move and Joystick and Buttons | Tap-to-move, a visible stick, Use and Action. Guess. |
| 6 | Tap-to-move and (Joystick and Buttons) (weapons) | Tap-to-move; the stick and both buttons appear only while a weapon is held. Guess. |
| 7 | Tap-to-move and Joystick and (Buttons) (weapons) | Tap-to-move and the stick always; the buttons appear only with a weapon. Guess. |
| 8 | Tap-to-move and Joystick | Tap-to-move and a visible stick, no buttons. Guess. |
| 9 | Joystick and Buttons | Our existing stick scheme (left half, Use and Action). |

Rules for the combined schemes: with tap-to-move on, the move stick takes only
the lower-left corner of the screen (below 45 percent of the height), so taps
elsewhere still walk; a push on the stick cancels a tap route. Without
tap-to-move the stick takes the whole left half as before. A finger a stick has
claimed never reaches the tap handler. Placeholders to settle on the tablet: the
zone sizes, the aim stick's corner, the one-button rule, whether Auto-Attack
should also run in schemes 3 to 9 (it does not now), and the Options list
layout (nine rows, one "Use this" button each). Schemes 1 and 9 are the only
ones that match something we had before; the rest are guesses (SC-188).

## Compared with the saved Mobile Controls page (2026-11-17, SC-188)

Read from `docs/reference/stardew/Mobile_Controls.html` (reference only, ADR 0002). Where the built scheme
agrees, the "guess" mark above is now a checked reading.

- **Agrees:** 2 (aim stick bottom right while a weapon is held, push to face and swing; no auto-attack),
  5, 6, 7, 8 and 9 (the page says 6 and 7 are scheme 5 with the parts shown only with a weapon, and 9 is
  scheme 5 with no tap-to-move), 3 (floating stick on the left half, Use held to repeat), and auto-attack
  only in scheme 1.
- **Differs, 4 (one button):** Stardew has no button. A tap on the right half, released under 0.25 s, is
  Use; held over 0.25 s it is Action. Ours is a "Do" button that picks Use or Action from what is ahead.
- **Differs, 1 (auto-attack):** Stardew auto-equips a weapon from the pack (the last used, else the highest
  slot) when a tool or nothing is held, and swings at an enemy in range. It does not run with a slingshot or
  a non-tool item in hand, and an equipped scythe may attack. Tapping an enemy walks to it and uses the
  weapon's secondary attack. Ours swings only a weapon already held, and has no tap-on-enemy secondary.
- **Not on our side yet:** the "Show controls" toggle in the top left (off means scheme 1, on means the
  chosen scheme). Stardew's schemes 5 to 9 draw a fixed stick on the left; ours draws a floating ring.
- **Tap-to-move extras:** a giftable held item is given by tapping an NPC, and tapping a stone, tree or stump
  auto-picks the tool. The second is built (above); the gift tap is not checked.

### Decided 2026-11-17 (owner): copy Stardew for schemes 4 and 1

Not built yet.

- **Scheme 4 uses the tap-duration rule.** No drawn button. A tap on the right half released under 0.25 s is
  Use; held over 0.25 s it is Action. The invisible stick keeps the left half. The `oneButton` part in
  `src/core/controlschemes.ts` becomes a `tapDuration` part, with the 0.25 s threshold a named constant and a
  unit test for both sides of it.
- **Scheme 1 auto-attack equips a weapon.** With a tool or nothing held and a weapon in the pack, an enemy in
  range makes the farmer equip the last used weapon (else the one in the highest slot), face the enemy and
  swing its primary attack. No auto-attack with a slingshot or a non-tool item in hand (bombs, food); an
  equipped scythe may attack. Tapping an enemy walks to it and uses the weapon's secondary attack, the only
  way to do it in this scheme. No attack mid-walk to a tapped spot; it does attack while following a finger.
  The rule lives in `src/core/` (free of Phaser) with unit tests. Open for the build: how "last used weapon"
  is remembered, and whether the equip shows a hotbar highlight.
- **Left as is, for now:** the Show controls toggle and the fixed stick in schemes 5 to 9 (a floating ring);
  neither was asked about.
