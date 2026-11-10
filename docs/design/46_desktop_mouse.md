# 46 Desktop mouse: aiming, clicking and the wheel (draft)

Status: draft. Decided with the owner on 2026-11-02. Built: aimed click, right-click as Action and the wheel (`FarmScene`). It is
step 5 (desktop half) of `45_controls_profiles.md`; tap-to-move is the other half
and gets its own note after this one. The Stardew rules below are from memory.
The saved Controls page lists keys only, so none of them is checked.

## Decisions

- **Left-click uses the held tool on the aimed tile (Stardew, from memory).** If
  the tile under the cursor is within reach of the farmer, the click acts on that
  tile. If it is farther, the farmer turns toward the cursor and acts on the
  tile next to them in that direction, as a key press does today. Decided
  2026-11-02.
- **Right-click is Action (note 45).** It shares the same aimed tile. See "Action
  is not built" below for what ships first.
- **Holding left-click repeats**, the same as holding the Use key does now (the
  axe swing repeat in `repeatUse`).
- **The wheel changes the toolbar slot** (Stardew, from memory), wheel down is
  next, wheel up is previous (decided 2026-11-02).
- **Desktop only.** The touch profile never reads the mouse, and the desktop
  profile ignores touch pointers (`pointer.wasTouch`), so a stray touch on a
  touch laptop does nothing.

## Aiming

- **One aimed tile.** Today `facingTile(pos, PLAYER, facing, ts)` is read in
  `update`, `use` and `repeatUse`. These move behind one `aimTile()` in
  `FarmScene`. It returns the tile every use, action and highlight works on.
  Keys and mouse then share every rule after the aim.
- **Two aim modes, last input wins.**
  - *Keys:* the aim is the faced tile, as now. Any movement key or a use key
    press switches to this mode.
  - *Mouse:* once the cursor moves, the aim follows it (see reach). A movement
    key press switches back to keys.
  - Resting the cursor does not fight a walking farmer: only a cursor move
    returns the aim to the mouse.
- **Reach.** A pure function in `src/core/` (free of Phaser), for example
  `aimTile(playerTile, cursorTile, reach)`:
  - Within `reach` tiles of the farmer's tile (Chebyshev distance, so the
    diagonal neighbours count): the aim is the cursor tile.
  - Beyond it: the aim is the neighbour tile in the dominant axis toward the
    cursor, which is also what the farmer faces.
  - The cursor on the farmer's own tile aims at the faced tile.
  - `reach` is 1 tile (owner, 2026-11-08): tools at level 1 only affect the
    cells next to the farmer, diagonals included. It was a placeholder of 2.
    Stronger tool levels may widen their area later. Stardew's real value is
    not checked.
- **Facing follows the aim.** The 4-way facing (`Facing`) is set from the aimed
  tile's direction when a click happens, not on every cursor move, so the
  sprite does not spin while the cursor crosses the farm. It does not turn on
  hover (decided 2026-11-02).
- **The highlight** (the existing `target` marker) sits on the aimed tile while
  in either mode. In the mouse mode, it is red when the tile is out of the map
  or the use could never work there (a wall); a tile that is merely the wrong
  tool for the job still gets the normal message on click. Red, as
  in Stardew's blocked tap-to-move target (decided 2026-11-02).
- **Pointer to tile:** use `camera.getWorldPoint`, so the camera zoom and scroll
  are handled, then divide by the tile size. The pointer position is read at
  click time, not cached from the last move.

## Clicks and the interface

- **The HUD wins.** A click on a toolbar slot or a HUD button selects or presses
  it and never reaches the world. The world camera and the HUD camera are
  separate, so test the HUD first, as the touch dead margin does.
- **Screens paused over the farm** (bin, shop, skills, hall) own their clicks;
  the farm is paused and reads nothing.
- **The desktop profile no longer draws the stick**, so no click can start it
  (already true since step 2). Playtests check it.
- **Right-click and the browser menu:** `input.mouse.disableContextMenu()` once
  when the desktop profile is built, as note 45 says. Not yet checked in a
  browser, including a Mac two-finger tap and Ctrl-click.
- **The wheel and page scroll:** the canvas takes the wheel event so the page
  does not scroll behind it. Check the page has no scrollbar in the fullscreen
  layout.

## Action is not built

Designed since in `47_action_intent.md`; the text below is the state when this note
was written.

The Action intent does not exist yet. Today Use does the farmer's talking, opening
and checking as well as the tool. So:

- **Ships with this step:** left-click as Use, the aim, the highlight, the wheel,
  the context menu fix. Right-click is read and calls Use's current sibling only
  once Action exists; until then right-click does nothing.
- **Action is its own small design,** because it decides which of today's Use
  results move to it (open a door, read a sign, talk, check a plot). Recommend
  a separate note before building it, as the call feedback asks for the big
  picture first.

## Testing

- Unit tests on the pure aim function: inside reach (cursor tile), outside reach
  (dominant axis, both signs), a tie on the diagonal, the farmer's own tile, an
  edge of the map.
- A playtest with Playwright mouse events on the desktop profile: a click near
  the farmer tills the aimed tile and not the faced one; a far click turns the
  farmer and tills the adjacent tile; a click on a toolbar slot selects it and
  uses nothing; the wheel changes the slot; the page does not scroll. Extend the
  existing input-profile playtest.
- Browser check that a right-click shows no browser menu.

## Build order

1. The aim function in `src/core/aim.ts` with tests, and `aimTile()` in
   `FarmScene` replacing the five `facingTile` reads. Keys only, so no visible
   change. Done. `aimAt` is not called yet; step 2 uses it.
2. Mouse aim and the highlight on hover. Done: `FarmScene` has a mouse mode
   and a keys mode (last input wins), `aimTile()` calls `aimAt` on the cursor
   tile, and the highlight is red on a blocked tile. Checked in a headless
   browser with mouse moves.
3. Left-click use, hold to repeat, the HUD hit test, the touch-pointer filter.
   Done, with right-click as Action and `disableContextMenu` (from step 4). A
   click turns the farmer toward the aim first. A press over the HUD or any
   interactive object never reaches the world. Checked in a headless browser:
   a near click aims at the cursor tile, a far click turns and tills the
   adjacent tile, a toolbar click selects and uses nothing, the context menu is
   prevented. Hold-to-repeat with the axe is not yet checked by playtest.
4. The wheel (the context menu fix landed in step 3). Done: wheel down is the
   next slot, up the previous, wrapping. Movement adds up to 100 (one notch)
   per step, so a trackpad is not too fast. Checked in a headless browser: the
   page does not scroll. `farmDebug` now reports `selected`.
5. The playtest additions. Done: `scripts/playtest/mouse.mjs`
   (`npm run playtest:mouse`) covers near and far clicks, the toolbar click, the
   context menu, the wheel with the page scroll, and hold-to-repeat with the axe.
   Right-click Action on a real target and the touch-pointer filter are not
   covered, since headless Playwright mouse events are never touch.

## Open

- **Reach value and shape:** 2 tiles Chebyshev is a placeholder.
- **Action:** designed in `47_action_intent.md`.

Settled 2026-11-02: turn on click only, red highlight, wheel down is next, and
food is eaten with Action, not a left-click (corrected on 2026-11-02, see
note 47; F stays as ours).
