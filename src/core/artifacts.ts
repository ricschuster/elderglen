import type { Outcome } from "./actions";
import { swingCost } from "./upgrades";
import { dateOf, type Season } from "./calendar";
import artifactData from "../content/artifacts.json";
import type { GameState } from "./save";

/**
 * Artifact spots (`docs/design/69_geodes_and_minerals.md`, "Artifact spots and
 * gem nodes"). A marked spot on the ground of a valley area, dug with the hoe,
 * rolls that area's table of finds. Winter has many more spots. The hoe on mine
 * floor ground can also turn one up. Names, prices and shares are placeholders.
 * Free of Phaser and the DOM.
 */
export interface ArtifactDef {
  id: string;
  name: string;
  sellPrice: number;
  /** Chance in percent per dug spot, by area map id. */
  areas?: Record<string, number>;
  /** The mine bands (1 to 3) whose dirt can give it. */
  mineBands?: number[];
  /** Other places it comes from, in words: a geode kind, a creature, fishing. */
  sources?: string[];
}

export const ARTIFACTS = artifactData.artifacts as ArtifactDef[];
export const COMMON_FINDS = artifactData.commonFinds as {
  item: string;
  weight: number;
}[];
/** The maps that have artifact spots. */
export const ARTIFACT_AREAS = [
  "forest",
  "secret-woods",
  "delta",
  "mountain",
  "cove",
];

export const artifactById = (id: string): ArtifactDef | undefined =>
  ARTIFACTS.find((a) => a.id === id);

/** Spots rolled a day in an area: 0 to 2, and 1 to 3 in winter (near Stardew's averages, SC-154; owner chose it 2026-11-12). */
export const SPOTS_NORMAL: [number, number] = [0, 2];
export const SPOTS_WINTER: [number, number] = [1, 3];
/** Mine dirt gives an artifact this often per hoe use, by band (placeholder; Stardew's lowest is 0.1 percent). */
export const MINE_DIRT_CHANCE = [0.0015, 0.002, 0.0025];
/** Mine floors per band, matching `mine-bands.json`. */
const bandOfFloor = (floor: number): number =>
  floor <= 40 ? 0 : floor <= 80 ? 1 : 2;

export interface SpotTile {
  x: number;
  y: number;
}

const key = (x: number, y: number) => `${x},${y}`;

/** The marked spots lying on one map today. Not saved: they roll each morning. */
export class ArtifactSpots {
  private spots = new Set<string>();

  at(x: number, y: number): boolean {
    return this.spots.has(key(x, y));
  }

  get count(): number {
    return this.spots.size;
  }

  *each(): Generator<SpotTile> {
    for (const k of this.spots) {
      const [x, y] = k.split(",").map(Number) as [number, number];
      yield { x, y };
    }
  }

  add(x: number, y: number): void {
    this.spots.add(key(x, y));
  }

  remove(x: number, y: number): boolean {
    return this.spots.delete(key(x, y));
  }

  /** Clear yesterday's spots and mark today's on the given diggable tiles. */
  roll(season: Season, tiles: readonly SpotTile[], random: () => number): void {
    this.spots.clear();
    const [lo, hi] = season === "winter" ? SPOTS_WINTER : SPOTS_NORMAL;
    const want = lo + Math.floor(random() * (hi - lo + 1));
    const pool = [...tiles];
    for (let i = 0; i < want && pool.length > 0; i++) {
      const t = pool.splice(Math.floor(random() * pool.length), 1)[0]!;
      this.add(t.x, t.y);
    }
  }
}

/** The artifacts an area can give with their chance per dug spot (0 to 1). */
export function areaTable(areaId: string): { id: string; chance: number }[] {
  return ARTIFACTS.filter((a) => a.areas?.[areaId] !== undefined).map((a) => ({
    id: a.id,
    chance: a.areas![areaId]! / 100,
  }));
}

/** What one dug spot gives: an artifact by the area's shares, else a common find. Never empty. */
export function digRoll(areaId: string, random: () => number): string {
  let r = random();
  for (const e of areaTable(areaId)) {
    if (r < e.chance) return e.id;
    r -= e.chance;
  }
  const total = COMMON_FINDS.reduce((n, c) => n + c.weight, 0);
  let w = random() * total;
  for (const c of COMMON_FINDS) {
    w -= c.weight;
    if (w < 0) return c.item;
  }
  return COMMON_FINDS[COMMON_FINDS.length - 1]!.item;
}

/** What the hoe turns up in mine dirt on a floor, if anything. */
export function mineDirtFind(
  floor: number,
  random: () => number,
): string | undefined {
  const band = bandOfFloor(floor);
  if (random() >= MINE_DIRT_CHANCE[band]!) return undefined;
  const pool = ARTIFACTS.filter((a) => a.mineBands?.includes(band + 1));
  return pool[Math.floor(random() * pool.length)]?.id;
}

/** Roll today's spots on one map's world. `tiles` are the open tiles, `winterTiles` the larger winter set. */
export function rollAreaSpots(
  g: Pick<GameState, "day">,
  spots: ArtifactSpots,
  tiles: readonly SpotTile[],
  winterTiles: readonly SpotTile[],
  random: () => number,
): void {
  const season = dateOf(g.day.clock.day).season;
  spots.roll(season, season === "winter" ? winterTiles : tiles, random);
}

/** Energy of a hoe swing, as `TOOL_ENERGY` in `actions.ts` (not imported, to keep the items list free of a cycle). */
const HOE_ENERGY = 2;
function swing(g: GameState): void {
  g.day.act(
    swingCost(HOE_ENERGY, g.toolTiers.hoe, g.skills.level("farming")),
    0,
  );
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

function give(g: GameState, x: number, y: number, item: string): Outcome {
  if (!g.inventory.add(item)) g.ground.drop(x, y, item, 1);
  return { ok: true, item };
}

/** The hoe on a marked spot: the spot is removed and the area's table rolls. */
export function digSpot(
  g: GameState,
  areaId: string,
  x: number,
  y: number,
  random: () => number = Math.random,
): Outcome {
  if (g.day.over) return fail("exhausted");
  if (!g.spots.at(x, y)) return fail("nothing to dig");
  g.spots.remove(x, y);
  swing(g);
  return give(g, x, y, digRoll(areaId, random));
}

/** The hoe on open mine ground: uses a swing and may turn up an artifact. */
export function digMineDirt(
  g: GameState,
  floor: number,
  x: number,
  y: number,
  random: () => number = Math.random,
): Outcome {
  if (g.day.over) return fail("exhausted");
  swing(g);
  const found = mineDirtFind(floor, random);
  return found ? give(g, x, y, found) : { ok: true };
}
