// What changed in a map's world, as the host saw it (note 53, "Guest copies follow the host's result").
// The host compares the saved form of each part of a map's world (trees, rocks, soil and crops, machines
// and the rest) with what it last told the guests, and sends only the entries that differ. A guest copy
// takes those entries as they are, so a random roll (a drop, a quality, a find) is rolled once, on the host.
// Free of Phaser and the DOM.
import { homeWorld, isAreaMap, type World } from "./areas";
import { isFarmMap, resolveMapId } from "./farmtypes";
import type { GameState } from "./save";

/** The entries of one part that changed: `set` by key (tile "x,y"), `del` the keys that are gone. */
export interface SectionFx {
  set?: Record<string, unknown>;
  del?: string[];
}

/** The changed parts of one map's world. Names starting "g:" are parts of the game state that no map owns. */
export type WorldFx = Record<string, SectionFx>;

interface WorldSection {
  name: string;
  read: (w: World) => unknown;
  write: (w: World, v: never) => void;
}

interface GlobalSection {
  name: string;
  read: (g: GameState) => unknown;
  write: (g: GameState, v: never) => void;
}

const WORLD_SECTIONS: WorldSection[] = [
  {
    name: "trees",
    read: (w) => w.trees.save(),
    write: (w, v) => w.trees.load(v),
  },
  {
    name: "rocks",
    read: (w) => w.rocks.save(),
    write: (w, v) => w.rocks.load(v),
  },
  {
    name: "weeds",
    read: (w) => w.weeds.save(),
    write: (w, v) => w.weeds.load(v),
  },
  {
    name: "twigs",
    read: (w) => w.twigs.save(),
    write: (w, v) => w.twigs.load(v),
  },
  {
    name: "forage",
    read: (w) => w.forage.save(),
    write: (w, v) => w.forage.load(v),
  },
  {
    name: "spots",
    read: (w) => w.spots.save(),
    write: (w, v) => w.spots.load(v),
  },
  { name: "farm", read: (w) => w.farm.save(), write: (w, v) => w.farm.load(v) },
  {
    name: "sprinklers",
    read: (w) => w.sprinklers.save(),
    write: (w, v) => w.sprinklers.load(v),
  },
  {
    name: "fruitTrees",
    read: (w) => w.fruitTrees.save(),
    write: (w, v) => w.fruitTrees.load(v),
  },
  {
    name: "machines",
    read: (w) => w.machines.save(),
    write: (w, v) => w.machines.load(v),
  },
];

/** Parts of the state the farm intents reach that are not in a map's world. */
const GLOBAL_SECTIONS: GlobalSection[] = [
  {
    name: "g:casks",
    read: (g) => g.casks.save(),
    write: (g, v) => g.casks.load(v),
  },
  {
    name: "g:indoorMachines",
    read: (g) => g.indoorMachines.save(),
    write: (g, v) => g.indoorMachines.load(v),
  },
  {
    name: "g:teaBushes",
    read: (g) => g.teaBushes.save(),
    write: (g, v) => g.teaBushes.load(v),
  },
  {
    name: "g:pots",
    read: (g) => g.pots.save(),
    write: (g, v) => g.pots.load(v),
  },
];

/** A saved part as entries by key: tile for a list of things on tiles, the record's own keys otherwise. */
function keyed(saved: unknown): Map<string, unknown> {
  const m = new Map<string, unknown>();
  if (Array.isArray(saved))
    saved.forEach((e, i) => {
      const r = e as { x?: unknown; y?: unknown; map?: unknown } | null;
      const k =
        typeof r?.x === "number" && typeof r.y === "number"
          ? `${typeof r.map === "string" ? `${r.map}|` : ""}${r.x},${r.y}`
          : `#${i}`;
      m.set(k, e);
    });
  else if (saved && typeof saved === "object")
    for (const [k, v] of Object.entries(saved)) m.set(k, v);
  return m;
}

interface Entry {
  json: string;
  value: unknown;
}
type Snap = Map<string, Map<string, Entry>>;

function entriesOf(saved: unknown): Map<string, Entry> {
  const out = new Map<string, Entry>();
  for (const [k, v] of keyed(saved))
    out.set(k, { json: JSON.stringify(v), value: v });
  return out;
}

/** Whether a map has a world the guests keep a copy of (the farm and the area maps; mine floors have map state). */
export function hasWorldFx(g: GameState, name: string): boolean {
  const id = resolveMapId(name, g.farmType);
  return isFarmMap(id) || isAreaMap(id);
}

function worldOf(g: GameState, id: string): World | undefined {
  if (isFarmMap(id)) return homeWorld(g);
  return g.areas[id];
}

function capture(g: GameState, id: string): Snap {
  const snap: Snap = new Map();
  const w = worldOf(g, id);
  if (w) for (const s of WORLD_SECTIONS) snap.set(s.name, entriesOf(s.read(w)));
  return snap;
}

function captureGlobal(g: GameState): Snap {
  const snap: Snap = new Map();
  for (const s of GLOBAL_SECTIONS) snap.set(s.name, entriesOf(s.read(g)));
  return snap;
}

function diff(before: Snap, after: Snap, into: WorldFx): void {
  for (const [name, now] of after) {
    const was = before.get(name);
    const set: Record<string, unknown> = {};
    const del: string[] = [];
    for (const [k, e] of now)
      if (was?.get(k)?.json !== e.json) set[k] = e.value;
    if (was) for (const k of was.keys()) if (!now.has(k)) del.push(k);
    if (Object.keys(set).length > 0 || del.length > 0)
      into[name] = {
        ...(Object.keys(set).length > 0 ? { set } : {}),
        ...(del.length > 0 ? { del } : {}),
      };
  }
}

/** The host's record of what every guest copy holds of each map's world, and the diff against the world now. */
export class WorldFxTracker {
  private readonly last = new Map<string, Snap>();
  private extras: Snap | undefined;

  /** The guests now hold the whole farm (a snapshot was sent): what they hold is the world as it stands. */
  rebase(g: GameState): void {
    this.last.clear();
    for (const id of [
      resolveMapId("farm", g.farmType),
      ...Object.keys(g.areas),
    ])
      this.last.set(id, capture(g, id));
    this.extras = captureGlobal(g);
  }

  /**
   * What changed on these maps since the last call, one message each. A map not seen before is taken as it
   * stands, with nothing sent. The shared parts (casks, tea bushes, pots) ride with the first message.
   */
  flush(g: GameState, names: string[]): { map: string; fx: WorldFx }[] {
    const out: { map: string; fx: WorldFx }[] = [];
    const ids = [...new Set(names.map((n) => resolveMapId(n, g.farmType)))];
    for (const id of ids) {
      if (!hasWorldFx(g, id)) continue;
      const now = capture(g, id);
      const was = this.last.get(id);
      this.last.set(id, now);
      if (!was) continue;
      const fx: WorldFx = {};
      diff(was, now, fx);
      if (Object.keys(fx).length > 0) out.push({ map: id, fx });
    }
    const first = ids[0];
    if (first !== undefined) {
      const now = captureGlobal(g);
      const fx: WorldFx = {};
      if (this.extras) diff(this.extras, now, fx);
      this.extras = now;
      if (Object.keys(fx).length > 0) {
        const at = out.find((o) => o.map === resolveMapId(first, g.farmType));
        if (at) Object.assign(at.fx, fx);
        else out.push({ map: resolveMapId(first, g.farmType), fx });
      }
    }
    return out;
  }
}

/** Take the host's changes into a guest's copy. True when anything was applied. */
export function applyWorldFx(g: GameState, map: string, fx: WorldFx): boolean {
  const id = resolveMapId(map, g.farmType);
  const w = worldOf(g, id);
  let changed = false;
  for (const [name, change] of Object.entries(fx)) {
    const read = (): unknown => {
      const ws = WORLD_SECTIONS.find((s) => s.name === name);
      if (ws) return w ? ws.read(w) : undefined;
      return GLOBAL_SECTIONS.find((s) => s.name === name)?.read(g);
    };
    const now = read();
    if (now === undefined || now === null) continue;
    const m = keyed(now);
    for (const k of change.del ?? []) m.delete(k);
    for (const [k, v] of Object.entries(change.set ?? {})) m.set(k, v);
    const next = Array.isArray(now) ? [...m.values()] : Object.fromEntries(m);
    const ws = WORLD_SECTIONS.find((s) => s.name === name);
    if (ws && w) ws.write(w, next as never);
    else GLOBAL_SECTIONS.find((s) => s.name === name)?.write(g, next as never);
    changed = true;
  }
  return changed;
}
