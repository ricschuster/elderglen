import type { Spot } from "./forage";

/**
 * Rocks you break with the pickaxe (`docs/design/22_mines.md`). Pure rules:
 * this file knows nothing of Phaser. A rock is one tile that blocks walking
 * until it is broken. Plain rocks give stone, copper nodes give ore and coal
 * rocks give coal. The farm has one field of rocks, and each mine floor has
 * its own.
 */

export type RockKind =
  | "stone"
  | "hard"
  | "copper"
  | "coal"
  | "quartz"
  | "geode"
  | "iron"
  | "gold"
  | "hearthsilver";

export interface Rock {
  x: number;
  y: number;
  kind: RockKind;
  /** Swings already landed on it. */
  hits: number;
}

/** Swings to break each kind at each pickaxe grade, Basic to Hearthsilver. Ours, placeholders (note 44): a better pickaxe needs fewer swings. */
const SWINGS_BY_TIER: Record<RockKind, readonly number[]> = {
  stone: [2, 2, 1, 1, 1],
  hard: [3, 3, 2, 2, 1],
  copper: [3, 2, 2, 1, 1],
  coal: [3, 2, 2, 1, 1],
  quartz: [1, 1, 1, 1, 1],
  geode: [3, 3, 2, 1, 1],
  iron: [4, 3, 2, 1, 1],
  gold: [5, 4, 3, 2, 1],
  hearthsilver: [6, 5, 4, 3, 2],
};

/** Swings to break a rock of a kind with a pickaxe of a grade. */
export function swingsToBreak(kind: RockKind, tier: number): number {
  const row = SWINGS_BY_TIER[kind];
  return row[Math.min(tier, row.length - 1)] as number;
}

export const ROCK_KINDS: RockKind[] = [
  "stone",
  "hard",
  "copper",
  "coal",
  "quartz",
  "geode",
  "iron",
  "gold",
  "hearthsilver",
];

const key = (x: number, y: number) => `${x},${y}`;

/** A field of rocks. */
export class Rocks {
  private rocks = new Map<string, Rock>();

  /** A rock on each given tile, plain stone unless the spot names a kind, for a map's starting rocks. */
  constructor(spots: (Spot & { kind?: RockKind })[] = []) {
    for (const s of spots) this.add(s.x, s.y, s.kind ?? "stone");
  }

  save(): Rock[] {
    return [...this.rocks.values()].map((r) => ({ ...r }));
  }

  load(saved: Rock[]): void {
    this.rocks = new Map(saved.map((r) => [key(r.x, r.y), { ...r }]));
  }

  *each(): Generator<Rock> {
    yield* this.rocks.values();
  }

  at(x: number, y: number): Rock | undefined {
    return this.rocks.get(key(x, y));
  }

  get count(): number {
    return this.rocks.size;
  }

  /** Put a rock on a tile. Returns false if one is already there. */
  add(x: number, y: number, kind: RockKind, hits = 0): boolean {
    if (this.at(x, y)) return false;
    this.rocks.set(key(x, y), { x, y, kind, hits });
    return true;
  }

  remove(x: number, y: number): boolean {
    return this.rocks.delete(key(x, y));
  }
}
