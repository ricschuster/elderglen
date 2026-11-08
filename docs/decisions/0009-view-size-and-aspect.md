# View size, screen ratios and player zoom

## Status

Accepted (owner, 2026-11-06). Settles the open "minimum visible tile count" in
`docs/design/06_map_style.md`. The zoom limits are Stardew's own, checked 2026-11-07 (SC-42): 75 to 200 percent. The 125 percent figures below are superseded.

## Context

Note 19 sized areas in "screens" of 40 by 25 tiles (1920 by 1200 at 3x), but the
game draws a 960 by 540 canvas at 2x zoom, which shows 30 by 17 tiles on every
device. The two never matched. Tablets and monitors also come in other ratios
(16:10, 3:2, 4:3, ultrawide), and a fixed fit leaves bars on those. Players also
expect to zoom in and out, on a tablet by pinching.

## Decision

- The default view is 30 by 17 tiles (about 510). This is what the game shows
  now. On the SM-T500 a tile is about 64 physical px.
- Wider or squarer windows show more tiles at the same zoom, so 30 by 17 is the
  default and the least a window shows at default zoom, not a fixed size.
- The player can zoom in and out: a zoom setting in a few steps, plus pinch on
  touch, saved per device. Steps are fractions of the default zoom, so pixels are
  slightly uneven between steps (art stays 16 px tiles).
- Zoom has a cap in both directions. Placeholder range: 75 percent (about 40 by
  22 tiles) to 125 percent (about 24 by 14; Stardew goes to 200, about 15 by 8). Tune on the tablet.
- Every map must look right at the widest view (the zoom out cap on the widest
  window), so each map needs a border margin of scenery, not void. Update
  2026-11-06: the extra view has no cap (note 64), so a view bigger than a map
  shows a flat backdrop colour instead of void.
- The HUD anchors to the screen edges, not to a 960 by 540 box.
- Stardew's zoom steps and caps are not known (note 54, SC-42). The owner
  recalls a zoom out cap and is unsure about zoom in.

## Consequences

- Note 19 counts screens as 510 tiles. Area sizes in tiles and crossing times
  do not change.
- The scene camera and HUD need work before this is built: the canvas sizes to
  the window, and the camera zoom follows the setting. Built in #520 (note 64).
- Maps need about 8 tiles of border margin on each side, to be checked at the
  widest view.
- Tests and playtests should run at the default size, one wide and one square
  window, and the two zoom caps.
- Fractional zoom may shimmer on scrolling pixel art. Check on the tablet, and
  if it is poor, fall back to whole number steps.
