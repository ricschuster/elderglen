import type { Farm } from "./farm";
import { tileKey } from "./tilekey";

/**
 * Sprinklers (`docs/design/31_farm_growth.md`). A placed sprinkler waters the
 * tilled tiles in its reach each morning. Two tiers are built: the basic one
 * (the four tiles beside it) and the quality one (the eight around it). The
 * 24 tile tier needs iridium and waits. Pure rules.
 */
export interface SprinklerDef {
  id: string;
  name: string;
  /** Tile offsets watered each morning. */
  reach: readonly (readonly [number, number])[];
  sellPrice: number;
}

const SIDES = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const;
const CORNERS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

export const SPRINKLERS: readonly SprinklerDef[] = [
  { id: "sprinkler", name: "Sprinkler", reach: SIDES, sellPrice: 100 },
  {
    id: "quality-sprinkler",
    name: "Quality sprinkler",
    reach: [...SIDES, ...CORNERS],
    sellPrice: 450,
  },
];

export function sprinklerById(
  id: string | undefined,
): SprinklerDef | undefined {
  return SPRINKLERS.find((s) => s.id === id);
}

export interface PlacedSprinkler {
  x: number;
  y: number;
  id: string;
}

/** The sprinklers standing on the farm. */
export class Sprinklers {
  private placed = new Map<string, PlacedSprinkler>();

  save(): PlacedSprinkler[] {
    return [...this.placed.values()].map((s) => ({ ...s }));
  }

  load(saved: PlacedSprinkler[]): void {
    this.placed = new Map(saved.map((s) => [tileKey(s.x, s.y), { ...s }]));
  }

  *each(): Generator<PlacedSprinkler> {
    yield* this.placed.values();
  }

  /** The sprinkler id on a tile, if any. */
  at(x: number, y: number): string | undefined {
    return this.placed.get(tileKey(x, y))?.id;
  }

  get count(): number {
    return this.placed.size;
  }

  /** Stand a sprinkler on a tile. False if the tile has one or the id is unknown. */
  add(x: number, y: number, id: string): boolean {
    if (!sprinklerById(id) || this.placed.has(tileKey(x, y))) return false;
    this.placed.set(tileKey(x, y), { x, y, id });
    return true;
  }

  /** Take up the sprinkler on a tile and return its id. */
  remove(x: number, y: number): string | undefined {
    const id = this.at(x, y);
    this.placed.delete(tileKey(x, y));
    return id;
  }

  /** Water every tilled tile in reach of any sprinkler. Returns how many tiles were watered. */
  water(farm: Farm): number {
    let n = 0;
    for (const s of this.placed.values())
      for (const [dx, dy] of sprinklerById(s.id)?.reach ?? [])
        if (farm.water(s.x + dx, s.y + dy)) n += 1;
    return n;
  }
}
