import type { GameState } from "../../src/core/save";

/**
 * Walk over everything lying on the ground, as a player would: pull every pile
 * on the current ground and on the mine floors dug today into the backpack.
 * Drops from rocks, trees, creatures and digs lie on the ground (note 43).
 */
export function sweep(g: GameState): void {
  const grounds = [g.ground];
  for (let n = 1; n <= 130; n++) {
    const f = g.mines.today(n, g.day.clock.day);
    if (f) grounds.push(f.ground);
  }
  for (const ground of grounds)
    ground.collect(g.inventory, { x: 0, y: 0 }, 1000);
}
