import {
  FarmMap,
  conditionsOf,
  maxTierOf,
  visibleTier,
  type TiledMapJson,
} from "./map";

/** Where a new game starts: a map id and the name of an entry on it. */
export const START = { map: "farm", entry: "start" } as const;

/**
 * Every map in the game, by id. A map id is its file name without extension,
 * and code never assumes where one map sits relative to another.
 */
export class MapRegistry {
  /** Every tier of every map, read once: `maps[id][tier]`. */
  private constructor(
    private readonly maps: Map<string, FarmMap[]>,
    private readonly files: Map<string, TiledMapJson> = new Map(),
  ) {}

  /** Maps read with some conditions held, by id, tier and the conditions the map uses. */
  private readonly variants = new Map<string, FarmMap>();

  /** Read each map at each of its tiers. Throws, naming the map, if one breaks the file format. */
  static fromTiled(files: Record<string, TiledMapJson>): MapRegistry {
    const maps = new Map<string, FarmMap[]>();
    const kept = new Map<string, TiledMapJson>();
    for (const [id, json] of Object.entries(files)) {
      kept.set(id, json);
      try {
        const tiers: FarmMap[] = [];
        for (let t = 0; t <= maxTierOf(json); t++)
          tiers.push(FarmMap.fromTiled(json, t));
        maps.set(id, tiers);
      } catch (e) {
        throw new Error(`map "${id}": ${(e as Error).message}`, { cause: e });
      }
    }
    return new MapRegistry(maps, kept);
  }

  get ids(): string[] {
    return [...this.maps.keys()];
  }

  /**
   * The map with this id as it stands at a building tier (default the first).
   * A map that does not grow ignores the tier, and a tier past the last one
   * the map has gives the last. Throws if there is no such map.
   */
  get(id: string, tier = 0): FarmMap {
    const tiers = this.maps.get(id);
    if (!tiers) throw new Error(`no map "${id}"`);
    return tiers[visibleTier(tier, tiers.length - 1)]!;
  }

  /**
   * The map as it stands when the named conditions hold: layers with `when` or
   * `unless` swap (`cove-open`, `bridge-mended`). Only the conditions the map
   * uses count, so a map with no conditional layers is the plain map.
   */
  getWith(id: string, holds: ReadonlySet<string>, tier = 0): FarmMap {
    const json = this.files.get(id);
    if (!json) throw new Error(`no map "${id}"`);
    const used = conditionsOf(json).filter((c) => holds.has(c));
    if (conditionsOf(json).length === 0) return this.get(id, tier);
    const t = visibleTier(tier, this.maxTier(id));
    const key = `${id}|${t}|${used.sort().join(",")}`;
    let map = this.variants.get(key);
    if (!map) {
      map = FarmMap.fromTiled(json, t, new Set(used));
      this.variants.set(key, map);
    }
    return map;
  }

  /** The highest tier a map has. Zero for a map that does not grow. */
  maxTier(id: string): number {
    const tiers = this.maps.get(id);
    if (!tiers) throw new Error(`no map "${id}"`);
    return tiers.length - 1;
  }

  /** Everything wrong across all maps, in words. Empty when all is well. */
  problems(): string[] {
    const out: string[] = [];
    const start = this.maps.get(START.map)?.[0];
    if (!start) out.push(`the start map "${START.map}" does not exist`);
    else if (!start.entry(START.entry))
      out.push(`the start map has no entry "${START.entry}"`);
    for (const [id, tiers] of this.maps)
      tiers.forEach((plain, tier) => {
        const label = tiers.length > 1 ? `${id} tier ${tier}` : id;
        // A map with conditional layers is checked with every condition true
        // and with every condition false (note 71).
        const names = conditionsOf(this.files.get(id)!);
        const readings: [string, FarmMap][] =
          names.length === 0
            ? [[label, plain]]
            : [
                [
                  `${label} (all conditions true)`,
                  this.getWith(id, new Set(names), tier),
                ],
                [
                  `${label} (all conditions false)`,
                  this.getWith(id, new Set(), tier),
                ],
              ];
        for (const [name, map] of readings)
          for (const p of map.problems()) out.push(`${name}: ${p}`);
        for (const exit of plain.exits) {
          if (exit.map === "" || exit.entry === "") continue;
          // An entry may sit on a higher tier of a growing map (the house's
          // cellar stairs), so the target counts if any tier has it.
          const target = this.maps.get(exit.map);
          if (!target)
            out.push(
              `${label}: exit "${exit.id}" leads to missing map "${exit.map}"`,
            );
          else if (!target.some((t) => t.entry(exit.entry)))
            out.push(
              `${label}: exit "${exit.id}" leads to missing entry "${exit.entry}" on "${exit.map}"`,
            );
        }
      });
    return out;
  }
}
