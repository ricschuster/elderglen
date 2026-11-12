import { homeWorld } from "./areas";
import { FARM_STORE, GREENHOUSE_STORE } from "./mapstore";
import type { GameState } from "./save";
import type { MachineJob } from "./machines";
import { isFarmMap } from "./farmtypes";
import { placeableById } from "./placeables";

/**
 * The generic placed list (`docs/design/89_placement_system.md`, "Saving"):
 * one list per map of `{ x, y, id, state }`, where `state` is the placeable's
 * own data (a machine's job, a chest's slots). Step 1B builds it beside the
 * three older lists (sprinklers, machines, chests) with a lossless bridge in
 * both directions, so each kind can move over in its own small step and a save
 * never loses a sprinkler, machine or chest. Pure rules.
 */
export interface PlacedItem {
  x: number;
  y: number;
  id: string;
  /** The placeable's own data. Absent when it has none. */
  state?: Record<string, unknown>;
}

/** Every map's placeables, by map id (`FARM_STORE`, `GREENHOUSE_STORE`, a house map id). */
export type PlacedSave = Record<string, PlacedItem[]>;

const key = (x: number, y: number) => `${x},${y}`;

export class PlacedStore {
  private maps = new Map<string, Map<string, PlacedItem>>();

  /** One tile holds one placeable. False if the tile is taken. */
  add(map: string, item: PlacedItem): boolean {
    const m = this.maps.get(map) ?? new Map<string, PlacedItem>();
    if (m.has(key(item.x, item.y))) return false;
    m.set(key(item.x, item.y), copy(item));
    this.maps.set(map, m);
    return true;
  }

  get(map: string, x: number, y: number): PlacedItem | undefined {
    return this.maps.get(map)?.get(key(x, y));
  }

  remove(map: string, x: number, y: number): PlacedItem | undefined {
    const item = this.get(map, x, y);
    this.maps.get(map)?.delete(key(x, y));
    return item;
  }

  *each(map: string): Generator<PlacedItem> {
    yield* this.maps.get(map)?.values() ?? [];
  }

  get count(): number {
    let n = 0;
    for (const m of this.maps.values()) n += m.size;
    return n;
  }

  /** Maps with at least one placeable, in the order first used. */
  mapIds(): string[] {
    return [...this.maps].filter(([, m]) => m.size > 0).map(([id]) => id);
  }

  save(): PlacedSave {
    return Object.fromEntries(
      this.mapIds().map((id) => [id, [...this.each(id)].map(copy)]),
    );
  }

  /** Read a saved list. Rows that are not a whole placeable are dropped, never guessed. */
  load(raw: unknown): void {
    this.maps.clear();
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return;
    for (const [map, list] of Object.entries(raw)) {
      if (!Array.isArray(list)) continue;
      for (const p of list as Partial<PlacedItem>[]) {
        if (
          typeof p !== "object" ||
          p === null ||
          !Number.isInteger(p.x) ||
          !Number.isInteger(p.y) ||
          typeof p.id !== "string" ||
          p.id === ""
        )
          continue;
        const state =
          typeof p.state === "object" &&
          p.state !== null &&
          !Array.isArray(p.state)
            ? p.state
            : undefined;
        this.add(map, {
          x: p.x as number,
          y: p.y as number,
          id: p.id,
          ...(state ? { state } : {}),
        });
      }
    }
  }
}

function copy(p: PlacedItem): PlacedItem {
  return {
    x: p.x,
    y: p.y,
    id: p.id,
    ...(p.state ? { state: structuredClone(p.state) } : {}),
  };
}

/**
 * The migration read: the three older lists of a loaded game, as one store.
 * The farm's sprinklers and machines go under the farm, the greenhouse's under
 * the greenhouse, and chests under their map (every farm map is the farm). A
 * chest's slots and a machine's job become `state`. Loading a save has already
 * moved old house frames, so this reads what the game now holds.
 */
export function collectPlaced(g: GameState): PlacedStore {
  const home = homeWorld(g);
  const out = new PlacedStore();
  for (const s of home.sprinklers.each()) out.add(FARM_STORE, s);
  for (const s of g.greenhouseSprinklers.each()) out.add(GREENHOUSE_STORE, s);
  for (const m of home.machines.each())
    out.add(FARM_STORE, {
      x: m.x,
      y: m.y,
      id: m.id,
      ...(m.job ? { state: { job: m.job } } : {}),
    });
  for (const c of g.chests.each("farm"))
    out.add(FARM_STORE, {
      x: c.x,
      y: c.y,
      id: c.id,
      state: { slots: c.items.save() },
    });
  const others = new Set<string>();
  for (const c of g.chests.all()) if (!isFarmMap(c.map)) others.add(c.map);
  for (const map of others)
    for (const c of g.chests.each(map))
      out.add(map, {
        x: c.x,
        y: c.y,
        id: c.id,
        state: { slots: c.items.save() },
      });
  return out;
}

/** The reverse bridge: set the three older lists from a store. Used until the last kind has moved. */
export function applyPlaced(g: GameState, store: PlacedStore): void {
  const home = homeWorld(g);
  const jobOf = (p: PlacedItem) => p.state?.job as MachineJob | undefined;
  home.sprinklers.load([]);
  g.greenhouseSprinklers.load([]);
  home.machines.load([]);
  g.chests.load([]);
  for (const p of store.each(FARM_STORE)) {
    const kind = placeableById(p.id)?.kind;
    if (kind === "chest")
      g.chests.add("farm", p.x, p.y, p.id)?.items.load(slotsOf(p));
    else if (kind === "sprinkler") home.sprinklers.add(p.x, p.y, p.id);
    else if (kind === "machine")
      home.machines.add({ x: p.x, y: p.y, id: p.id, job: jobOf(p) });
  }
  for (const p of store.each(GREENHOUSE_STORE))
    g.greenhouseSprinklers.add(p.x, p.y, p.id);
  for (const map of store.mapIds()) {
    if (map === FARM_STORE || map === GREENHOUSE_STORE) continue;
    for (const p of store.each(map))
      g.chests.add(map, p.x, p.y, p.id)?.items.load(slotsOf(p));
  }
}

function slotsOf(p: PlacedItem): ({ id: string; count: number } | null)[] {
  return Array.isArray(p.state?.slots)
    ? (p.state.slots as ({ id: string; count: number } | null)[])
    : [];
}
