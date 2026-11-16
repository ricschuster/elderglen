# 102 Social tab, tools in the pack, and HUD pass

Status: draft, owner feedback 2026-11-16. Design before build. Extends notes 49
(menu), 64 (window and HUD) and 37 (equipment).

## Owner feedback

1. The Social tab should show everyone in the game, or most of them, like
   Stardew's page (portrait, name, relationship, hearts, gift boxes, talk box).
2. Tools should be movable in the backpack.
3. Backpack slots should be bigger on a desktop screen. Stardew's are large.
4. The HUD should get something like Stardew's top-right clock panel with gold,
   and an energy bar. The skill bars at top left are an option.

## Decisions (owner, 2026-11-16)

- **Social lists the whole roster (Stardew, from memory, SC-184).** People not
  yet met show as a greyed row with "???" and no portrait detail. No hearts or
  boxes until met. Today `socialRows` (`src/core/menupages.ts`) filters to met
  people only, and `unmetCount` already exists.
- **Tools live in the pack (Stardew, from memory, SC-185).** They are ordinary
  stacks that can be moved, but cannot be trashed, sold or dropped. This drops
  the fixed tool strip in note 49. Today toolbar slots 0 to 3 are the four tools
  by index (`src/scenes/hud.ts`, slot mapping near line 431).
- **Write this note first** and build after it is settled.

## Open points to settle before building

- **Social row layout: settled 2026-11-16 (owner).** Rows follow the fixed
  roster order, unmet people in place as "???" rows (Stardew, unchecked, SC-184).
  Each met row shows the portrait, name with the relationship line under it
  (friend, dating, spouse), up to ten hearts (greyed past the current cap), two
  gift boxes and one talk box (Stardew). The gift boxes show this week's gifts
  against the weekly rule (`POINTS.weeklyGifts`, two) and tick as gifts are
  given; a spouse takes gifts daily, so a spouse row shows no gift boxes. The
  talk box ticks for today (`talkedOn`). Tap or click a row to open a detail
  page with a larger portrait, hearts, birthday and the gift log (note 61).
  That page is our own addition, and it works on touch. Build needs a
  `weekGifts` read in `friendship.ts` and a `SocialRow` with relationship,
  weekGifts and met.
- **Scrolling: settled 2026-11-16.** Wheel and drag on desktop, finger drag on
  touch, plus a thin scroll bar on the right showing position (Stardew,
  unchecked, SC-186).
- **Spouse and children rows: settled 2026-11-16.** The spouse keeps their
  roster place with a spouse line. Children sit in a short section after the
  roster, hearts only (Stardew, from memory, SC-186).
- **Tool rules: settled 2026-11-16, chests allowed (owner, same day).** Tools
  are free to move and can go in chests, but cannot be trashed, sold, shipped or
  dropped. The touch tool button and tap-to-move auto-pick use the first
  matching tool in the pack (never a chest), so moving a tool never breaks them.
  Old saves kept the tools apart, so load puts any missing tool in the front
  slots and shifts the rest along (the pack grows if it is full).
- **Slot size: settled 2026-11-16.** A larger base slot (64 px, up from 44) on
  desktop windows wide enough for it, still scaled by the UI size setting. Touch
  keeps its current size. The pack grid and toolbar re-flow to fit.
- **Clock panel: settled 2026-11-16.** Top right: weekday and date, time, a
  weather icon and a festival or birthday icon, and gold in its own box
  (Stardew). The sun and moon dial is art, so a placeholder until M3d.
- **Energy bar: settled 2026-11-16.** A vertical bar bottom right with an "E"
  label, always shown, green fading to red (Stardew). Health is a second bar
  beside it only in the mines or while hurt (from memory, SC-187).
- **Skill bars top left: settled 2026-11-16.** Off. Skills stay on the Skills
  tab. Decide again later.
- **Touch HUD: settled 2026-11-16, copy this arrangement.** The owner's tablet
  photo (Stardew mobile, reference only, ADR 0002: copy the arrangement, never
  the art) shows:
  - the toolbar as a vertical strip down the left edge, tools first, then a gap,
    then the other items;
  - top right, a compact panel: date box and time box side by side, gold below;
  - under it two round buttons, quests (journal) and menu, stacked;
  - the energy bar bottom right, vertical, with its "E" label;
  - the play area clear in the middle.
  Note 27 already puts the toolbar in a left column on touch (it scrolls by drag
  when the window is too short, a tap selects, the Row button sits at the foot,
  desktop keeps the bottom bar). So the photo is the existing tap-to-move
  layout, and this note only adds the right side: the compact date and time
  panel with gold, the quests and menu buttons under it, and the energy bar
  bottom right. In the second (stick) scheme the use and action buttons sit
  above the right end of the screen (note 27), clear of the bar, and the energy
  bar moves up if they overlap. Desktop keeps a horizontal toolbar along the
  bottom with the same panel and bar. Check on the owner's tablet that the panel
  and buttons clear the notch and the Android edge.

The pack stays at 12 slots including the four tools (Stardew).

## Built status

- **Batch A, Social tab: built (2026-11-16).** `socialRows` returns the whole
  roster with met, relationship, weekGifts and spouse; `childRows` and
  `birthdayText` added; `Friendship.weekGifts(id, day)` reads the week count.
  `SocialScene` has rows, hearts, two gift boxes, a talk box, wheel, drag and
  key scrolling with a bar, a detail page (gift log, birthday, back) and a
  children section. Portraits are placeholder tinted squares with an initial
  (no portrait art exists yet). Not yet checked in a browser or on touch.
- **Batch B, tools in the pack: built (2026-11-16).** Tools are stacks with ids
  `tool:hoe` and so on (`src/core/toolitems.ts`); tiers stay in `toolTiers`, so
  upgrades need no stack lookup. The toolbar is the pack's slots by index, so the
  fixed strip is gone; `findTool` serves auto-pick. Tools are safe from defeat
  and sort first. Tools use pack slots, so a new pack has 8 free slots (the sim
  bot gets 4 extra). Not checked in a browser.
- **Batch D, slot size: built (2026-11-16).** `hudSlot` in `src/core/view.ts`
  picks 64 on a desktop window wide enough for the whole bar at the UI size set,
  else 44; touch stays 44. `Hud.layout` takes the slot and re-places the bottom
  bar each resize. The Pack tab already used 64 px cells inside the menu box,
  which `menuZoom` shrinks to fit, and no other grid shares the HUD constant.
  Not checked in a browser.
- **Batch E, portraits: built (2026-11-16).** Portraits are the head and shoulders
  of the current villager sprite, scaled by a whole number with nearest-neighbour
  filtering in a frame (`src/scenes/portrait.ts`, maths in `src/core/portrait.ts`);
  unmet rows show a flat grey silhouette. They come from the current sprites until
  real art in M3d. Not checked in a browser.
- Not built: clock panel, energy bar, touch HUD.

## Checks added

SC-184 to SC-187 in note 54.
