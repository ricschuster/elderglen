# 64 Window sized canvas, HUD anchoring and UI size (draft)

Status: draft, updated 2026-11-07. The forks below were decided with the owner.
Everything else is the assistant's proposal, and the numbers are placeholders.
Nothing here is built. This turns ADR 0009 (view size and zoom) into a build
plan. Stardew's behaviour is from the owner's memory only (SC-42, SC-46).

## Decided with the owner (2026-11-06)

1. **No cap on the extra view, as in Stardew.** A bigger window shows more
   world at the same zoom. Whether Stardew caps it is unknown (SC-42). This
   replaces the idea of a cap in ADR 0009's "Still open" list. The zoom steps
   keep their own caps (75 to 200 percent, decision 5).
2. **Full-screen menus keep their layout.** The dim backdrop fills the whole
   window and the panel content stays a fixed 960 by 540 box in the centre.
   Every existing layout stays as drawn.
3. **A separate UI size setting, as in Stardew** (from memory, SC-46). World
   zoom and UI size are two settings, each saved per device.

## Decided with the owner (2026-11-07)

All four answers were "do what Stardew does", and the owner then checked each
in the desktop game the same day (SC-42, SC-46, SC-63, SC-64, all done).

4. **UI size is 75 to 150 percent**, as Stardew (SC-46, checked; the owner
   corrected the range from 125 to 150 the same day). Steps of 5 percent are
   from the owner's first answer. The HUD never drops below
   the note 27 touch target size, so on tablets the floor may lift the low end.
5. **World zoom is 75 to 200 percent of the default**, as Stardew (SC-42,
   checked; corrected from 125 to 200 the same day), in 5 percent steps. This
   widens ADR 0009's 75 to 125 percent. If fractional steps shimmer on
   the tablets, fall back to whole steps.
6. **Black bars where the view is bigger than the map** (SC-63, checked).
   This replaces the per area backdrop colour below: the camera centres the map
   and the rest is black, outdoors and indoors. Outdoor maps keep their 8 tile
   scenery margin.
7. **Window mode is Windowed, Borderless Windowed and Fullscreen**, as Stardew
   (SC-64, checked). It is a desktop setting, so it goes in the desktop wrapper ADR
   when that is written. The browser and the tablet have no such choice.

## What this means for the build

- **Canvas.** Phaser's scale mode becomes RESIZE, so the canvas is the window
  size. `src/main.ts` stops fixing 960 by 540. The device pixel ratio is
  respected so text stays sharp.
- **World camera.** Zoom is the default zoom times the player's step. The
  default zoom is chosen so the window shows at least 30 by 17 tiles, and a
  bigger window shows more at the same zoom. The camera recalculates on resize.
- **UI camera and HUD.** The HUD anchors to the screen edges: toolbar bottom
  centre, use button bottom right, clock top right, and so on. It scales by the
  UI size setting, and never below the touch target size in note 27.
- **Menu scenes.** Each draws its backdrop across the whole window and centres
  one container of 960 by 540. A shared helper in `panel.ts` does both, so the
  scenes stop using literal 960 and 540.
- **Pinch and steps.** Zoom steps and pinch work as ADR 0009 says.

## The map margin problem

With no cap, no map can promise enough scenery for every window. A 4K or
ultrawide window can be wider than a whole interior or small area.

- If the view is bigger than the map, the camera centres the map and the rest is
  black (decision 6). No void shows through, and no map needs infinite margin.
- Outdoor maps still keep about 8 tiles of scenery margin, so ordinary windows
  at the zoom out cap never reach the backdrop.
- Check at one wide and one square window, and at both zoom caps.

## Build order

1. The canvas and camera: RESIZE mode, zoom from the setting, a resize handler.
2. HUD anchoring and the UI size setting.
3. The shared menu helper, then move each scene over to it.
4. Zoom and UI size in Options, plus pinch, saved per device.
5. Tests: default size, one wide window, one square window, both zoom caps.

## Still open

- Whether fractional zoom shimmers on the tablet (fall back to whole steps).
- The desktop wrapper ADR, which must cover window mode (SC-64).
