import { isClear } from "./actions";
import type { Outcome } from "./actions";
import type { FarmMap } from "./map";
import { FARM_STORE } from "./mapstore";
import { mayPlaceOn, placeTag } from "./placeables";
import type { PlacedItem } from "./placedstore";
import type { GameState } from "./save";

/**
 * Lightning rods and battery packs (`docs/design/34_crafting.md` and
 * `07_tuning_numbers.md`, from the saved Weather and Lightning Rod pages with our
 * numbers). On a storm day there is a small chance of a strike every 10 game
 * minutes. A strike lands on a rod with chance `1 - (charged / all)^2`. A hit rod
 * makes one battery pack the next morning and ignores more strikes that day.
 * With no rod, or on a miss, a strike only flashes: the farm is never harmed.
 * A rod is a placeable (`docs/design/89_placement_system.md`) kept in the generic
 * placed store under the farm, with `state { hit, pack }`: `hit` once struck
 * today, `pack` when a battery pack waits on it. The morning turns a hit into a
 * waiting pack, and the player takes it with Action. Pure rules.
 */
export const STRIKE_CHANCE = 0.03;
export const STRIKE_MINUTES = 10;
export const LIGHTNING_ROD = "lightning-rod";
export const BATTERY_PACK = "battery-pack";

const fail = (reason: string): Outcome => ({ ok: false, reason });

/** The state a rod keeps in the placed store. */
export interface RodState {
  hit: boolean;
  pack: boolean;
}

const stateOf = (p: PlacedItem): RodState => ({
  hit: p.state?.hit === true,
  pack: p.state?.pack === true,
});

const setState = (p: PlacedItem, s: RodState): void => {
  p.state = { hit: s.hit, pack: s.pack };
};

/** Every rod on the farm. */
export function rodsOf(g: GameState): PlacedItem[] {
  return [...g.placed.each(FARM_STORE)].filter((p) => p.id === LIGHTNING_ROD);
}

export function rodAt(
  g: GameState,
  x: number,
  y: number,
): PlacedItem | undefined {
  const p = g.placed.get(FARM_STORE, x, y);
  return p?.id === LIGHTNING_ROD ? p : undefined;
}

/** True when a battery pack waits on the rod at this tile. */
export function packWaiting(g: GameState, x: number, y: number): boolean {
  const rod = rodAt(g, x, y);
  return !!rod && stateOf(rod).pack;
}

/**
 * Stand a rod from the backpack on the faced tile. Only the farm, outdoors in
 * the open (the place table), on clear ground. Free, and any number may stand.
 */
export function placeRod(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
): Outcome {
  if (g.inventory.count(LIGHTNING_ROD) < 1) return fail("no rod");
  if (
    !mayPlaceOn(LIGHTNING_ROD, placeTag(map, mapId)) ||
    !isClear(g, map, x, y)
  )
    return fail("cannot place here");
  if (!g.placed.add(FARM_STORE, { x, y, id: LIGHTNING_ROD }))
    return fail("cannot place here");
  g.inventory.remove(LIGHTNING_ROD);
  return { ok: true };
}

/**
 * Take a rod up into the backpack, with the pack waiting on it if there is
 * one. Both must fit, or the rod stays.
 */
export function pickUpRod(g: GameState, x: number, y: number): Outcome {
  const rod = rodAt(g, x, y);
  if (!rod) return fail("nothing to act on");
  const pack = stateOf(rod).pack;
  if (
    g.inventory.room(LIGHTNING_ROD) < 1 ||
    (pack && g.inventory.room(BATTERY_PACK) < 1)
  )
    return fail("backpack full");
  g.placed.remove(FARM_STORE, x, y);
  g.inventory.add(LIGHTNING_ROD);
  if (pack) g.inventory.add(BATTERY_PACK);
  return { ok: true, item: LIGHTNING_ROD };
}

/** Action on a rod: take the battery pack it made in the night. */
export function takePack(g: GameState, x: number, y: number): Outcome {
  const rod = rodAt(g, x, y);
  if (!rod || !stateOf(rod).pack) return fail("nothing to act on");
  if (g.inventory.room(BATTERY_PACK) < 1) return fail("backpack full");
  g.inventory.add(BATTERY_PACK);
  setState(rod, { ...stateOf(rod), pack: false });
  return {
    ok: true,
    item: BATTERY_PACK,
    note: "You take the battery pack the rod made in the storm.",
  };
}

/**
 * One strike falls. Returns the rod that caught it, if any. The chance of a
 * catch is `1 - (charged / all)^2`, so a spent rod does not take a second strike.
 */
export function strikeRods(
  g: GameState,
  random: () => number,
): PlacedItem | undefined {
  const rods = rodsOf(g);
  const free = rods.filter((r) => !stateOf(r).hit);
  if (free.length === 0) return undefined;
  const spent = rods.length - free.length;
  const chance = 1 - (spent / rods.length) ** 2;
  if (random() >= chance) return undefined;
  const rod = free[Math.floor(random() * free.length)]!;
  setState(rod, { ...stateOf(rod), hit: true });
  return rod;
}

/**
 * Roll the strikes for a stretch of game minutes on the farm. Only a storm
 * strikes. Returns how many strikes fell, how many a rod caught and which
 * rods, so the scene can flash them.
 */
export function rollStrikes(
  g: GameState,
  minutes: number,
  random: () => number,
): { strikes: number; caught: number; hits: { x: number; y: number }[] } {
  const out = { strikes: 0, caught: 0, hits: [] as { x: number; y: number }[] };
  if (g.weather !== "stormy") return out;
  for (let m = STRIKE_MINUTES; m <= minutes; m += STRIKE_MINUTES) {
    if (random() >= STRIKE_CHANCE) continue;
    out.strikes += 1;
    const rod = strikeRods(g, random);
    if (rod) {
      out.caught += 1;
      out.hits.push({ x: rod.x, y: rod.y });
    }
  }
  return out;
}

/**
 * The morning: every struck rod now holds one battery pack and resets. A pack
 * already waiting stays the one pack. Returns the rods that gained a pack.
 */
export function chargeRods(g: GameState): number {
  let made = 0;
  for (const rod of rodsOf(g)) {
    const s = stateOf(rod);
    if (!s.hit) continue;
    if (!s.pack) made += 1;
    setState(rod, { hit: false, pack: true });
  }
  return made;
}
