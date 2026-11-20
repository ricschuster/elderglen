import type { Inventory } from "./inventory";
import type { GameState } from "./save";

/** One stack of goods lying on a tile. */
export interface Pile {
  x: number;
  y: number;
  id: string;
  count: number;
}

/**
 * How near the player must be to pull goods in, in tiles (Chebyshev). The base
 * is ours, a placeholder: the saved Stardew pages give only that rings add 1 or
 * 2 tiles of magnetism. Magnet rings add to it through `bonus` (`equipment.ts`).
 */
export const BASE_PICKUP_RADIUS = 1;

export function pickupRadius(bonus = 0): number {
  return BASE_PICKUP_RADIUS + bonus;
}

/**
 * Goods on the ground that did not fit the backpack. They stay until picked up
 * and are saved with the game, so nothing a tree drops is ever lost
 * (`docs/design/43_wood_source.md`).
 */
export class GroundItems {
  private piles: Pile[] = [];

  save(): Pile[] {
    return this.piles.map((p) => ({ ...p }));
  }

  load(saved: Pile[]): void {
    this.piles = saved.map((p) => ({ ...p }));
  }

  each(): readonly Pile[] {
    return this.piles;
  }

  at(x: number, y: number): Pile[] {
    return this.piles.filter((p) => p.x === x && p.y === y);
  }

  get count(): number {
    return this.piles.length;
  }

  /** Leave goods on a tile, joining a pile of the same item there. */
  drop(x: number, y: number, id: string, count: number): void {
    if (count <= 0) return;
    const pile = this.piles.find((p) => p.x === x && p.y === y && p.id === id);
    if (pile) pile.count += count;
    else this.piles.push({ x, y, id, count });
  }

  /**
   * Pull in every pile within `radius` tiles of the player's tile, as far as
   * the backpack has room. Returns true if anything moved.
   */
  collect(
    inv: Inventory,
    at: { x: number; y: number },
    radius: number,
  ): boolean {
    let moved = false;
    for (const pile of this.piles) {
      if (Math.max(Math.abs(pile.x - at.x), Math.abs(pile.y - at.y)) > radius)
        continue;
      const n = Math.min(pile.count, inv.room(pile.id));
      if (n <= 0 || !inv.add(pile.id, n)) continue;
      pile.count -= n;
      moved = true;
    }
    this.piles = this.piles.filter((p) => p.count > 0);
    return moved;
  }
}

/**
 * The ground goods lie on where the player is: the state's (the farm's, or the
 * area's while in one), or the mine floor's own, so a pile left in the mines
 * never turns up on the farm at the same coordinates.
 */
export function groundOf(g: GameState, floor: number | undefined): GroundItems {
  return floor === undefined
    ? g.ground
    : g.mines.visit(floor, g.day.clock.day).ground;
}

/**
 * Leave goods lying on the ground at a tile, for the player to walk over and
 * pull in (`docs/design/43_wood_source.md`, "Drops lie on the ground"). Goods
 * from rocks, trees, creatures and digs never go straight to the pack, so a
 * full pack never refuses them.
 */
export function dropGoods(
  g: GameState,
  floor: number | undefined,
  x: number,
  y: number,
  id: string,
  count: number,
): void {
  groundOf(g, floor).drop(x, y, id, count);
}
