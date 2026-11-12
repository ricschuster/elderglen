# 29 Weeds (draft)

Status: draft. Decided with the owner on 2026-10-31. Weeds and Fiber are built
(2026-11-07, slice 1 build 3, `src/core/weeds.ts`): day 1 scatter, spread, one
hit clears, fiber drop, saved. Mixed seed drops built 2026-11-07 with farm types (after the fiber roll: 5 percent on Standard, always on Woodland; the summer flower seed is not built: the game has no flower crops yet, so there is nothing for it to grow). Earlier note: (no crafting
yet) and winter day 1 clear (no winter yet). The fruit tree block is built
(2026-11-07, `src/core/sleep.ts`). Grass and
clutter are not in the game. Reference: the Stardew Valley Wiki
Weeds page, read only (ADR 0002).

## Decisions

- **Spawning.** Lone weeds appear on random tillable tiles of the farm on day 1
  of spring, summer and fall. Winter day 1 clears all weeds, as it clears
  crops (`26_seasons.md`). This replaces the older note that only spring
  brings fresh clutter. Rocks, twigs and grass stay with the spring rule and
  the farm note.
- **Spreading.** A weed left alone can multiply onto an adjacent empty tillable
  tile. It happens most on day 1 of a season, on rainy days and in summer.
  Grass and fences stop the spread. Tilled soil does not.
- **Weeds never destroy anything.** They do not remove placed objects, crops or
  furniture. This is gentler than Stardew, where spread can silently destroy
  placed items. A tablet player should not lose a thing to a weed. Weeds only
  take free tiles.
- **Fruit trees.** Weeds in the 3x3 around a tree stop it growing, as in
  Stardew. A message on waking names the tree. To be confirmed in the farm
  note, which covers fruit trees.
- **Clearing.** Any tool clears a weed in one hit, so tap-to-act on a tablet
  (`27_touch_controls.md`) never needs a tool swap.
- **Drops.** A cut weed has a 50 percent chance of 1 Fiber. If it drops no
  Fiber, there is a 5 percent chance of a mixed seed. In summer, a weed that
  drops neither has a 5 percent chance of a mixed flower seed. Fiber waits for
  crafting in M3. The mixed seeds are the same wild seeds crafted from forage
  (`07_tuning_numbers.md`), so weeding is one more source, not a second system.
- **The player's own farm only.** Weeds do not spawn in the valley or the mines
  in the first version. The wiki spawns them in other areas too, but that is a
  later content question.

## Why this shape

Weeding gives each season a short tidy-up and a reason to look at the whole
farm, and spread turns a skipped day into a small cost without punishing
anyone. Removing item destruction keeps the cozy promise while the spread rule
still pushes the player to keep up.

## Not taken from Stardew

- The Gold Clock and the Raccoon Journal drop boosts. We have neither.
- Special weeds on Forest and Four Corners farms, Green Rain weeds, Large Weeds
  and weapon enchantments. They belong to systems we have not designed.
- The Living Hat drop and Ginger Island weeds.

## Open

- The rate: placeholders are in `36_gathering_trees_sap_fiber.md` (20 weeds on
  day 1, 10 percent spread a night). Playtest to set them. The wiki gives no rate. The owner says Stardew's
  weeds spread very slowly (SC-12), so 10 percent a night is likely too fast.
- Whether fruit trees are blocked by weeds (farm note).
- Whether valley and mine weeds come later.
