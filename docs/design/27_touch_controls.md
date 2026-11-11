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
- **Layout:** the toolbar sits along the bottom in both schemes, so there is one
  position to learn. In the stick scheme the use-tool and action buttons sit
  above the right end of the bar. When food is selected an Eat button appears
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

## Open questions

- Checked on a real tablet (#59, #63) before either scheme is called done. The
  dead margin width, the Eat button size and the give-up wait are placeholders
  until then.
