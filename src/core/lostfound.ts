// The lost and found box at the village hall (note 110, owner 2026-11-25): when the host demolishes a cabin,
// its occupant's things except tools wait here, under their player id, until they collect them. Free of
// Phaser and the DOM.
import { isObject } from "./guards";
import { itemById } from "./items";
import type { PlayerId } from "./players";
import type { GameState } from "./save";
import { isToolId } from "./toolitems";

/** Items waiting for each player, item id to count. */
export type LostFound = Record<PlayerId, Record<string, number>>;

/** What a player has waiting, in the order it was put in. */
export function lostItemsFor(
  g: GameState,
  by: PlayerId,
): { id: string; count: number }[] {
  return Object.entries(g.lostFound?.[by] ?? {}).map(([id, count]) => ({
    id,
    count,
  }));
}

export function addLost(
  g: GameState,
  by: PlayerId,
  id: string,
  count: number,
): void {
  if (count <= 0) return;
  const mine = { ...g.lostFound?.[by] };
  mine[id] = (mine[id] ?? 0) + count;
  g.lostFound = { ...g.lostFound, [by]: mine };
}

/** What the box says to a player with nothing in it. */
export const NOTHING_LOST = "Nothing of yours is in the lost and found.";

/**
 * Move what fits of a player's waiting items into their pack. What does not fit stays in the box. Returns a line
 * in words, or undefined when everything came out.
 */
export function collectLost(g: GameState, by: PlayerId): string | undefined {
  const mine = g.lostFound?.[by];
  if (!mine || Object.keys(mine).length === 0) return NOTHING_LOST;
  const inv = g.players.get(by).inventory;
  const left: Record<string, number> = {};
  let took = 0;
  for (const [id, count] of Object.entries(mine)) {
    const fit = Math.min(count, inv.room(id));
    if (fit > 0 && inv.add(id, fit)) took += fit;
    const rest = count - (fit > 0 ? fit : 0);
    if (rest > 0) left[id] = rest;
  }
  const rest = { ...g.lostFound };
  if (Object.keys(left).length) rest[by] = left;
  else delete rest[by];
  g.lostFound = Object.keys(rest).length ? rest : undefined;
  if (took === 0) return "Make room in your pack first.";
  return Object.keys(left).length
    ? "Your pack is full. The rest stays here."
    : undefined;
}

/** The words for a waiting stack. */
export const lostName = (id: string): string => itemById(id)?.name ?? id;

/**
 * Move a cabin occupant's things to the box: their pack except tools (tools stay with them), the contents of the
 * chests standing in their home, and the furniture placed there. Chests and furniture leave the home instance.
 */
export function evictToLostFound(
  g: GameState,
  key: PlayerId,
  homeMap: string,
): void {
  if (g.players.has(key)) {
    const inv = g.players.get(key).inventory;
    const ids = new Set<string>();
    for (let i = 0; i < inv.size; i++) {
      const st = inv.slot(i);
      if (st && !isToolId(st.id)) ids.add(st.id);
    }
    for (const id of ids) {
      const n = inv.count(id);
      inv.remove(id, n);
      addLost(g, key, id, n);
    }
  }
  const chests = [...g.chests.each(homeMap)].filter((c) => c.map === homeMap);
  for (const c of chests) {
    for (let i = 0; i < c.items.size; i++) {
      const st = c.items.slot(i);
      if (st) addLost(g, key, st.id, st.count);
    }
    addLost(g, key, c.id, 1);
    g.chests.remove(c.map, c.x, c.y);
  }
  for (const p of g.furniture.save().placed)
    if (p.map === homeMap) {
      g.furniture.remove(p.map, p.x, p.y);
      addLost(g, key, p.id, 1);
    }
}

/** The saved box, or undefined when empty. */
export function saveLostFound(g: GameState): LostFound | undefined {
  const out: LostFound = {};
  for (const [k, items] of Object.entries(g.lostFound ?? {}))
    if (Object.keys(items).length) out[k] = { ...items };
  return Object.keys(out).length ? out : undefined;
}

/** A box read with bad entries dropped. Undefined if there is none. */
export function loadLostFound(raw: unknown): LostFound | undefined {
  if (!isObject(raw)) return undefined;
  const out: LostFound = {};
  for (const [k, items] of Object.entries(raw)) {
    if (k === "" || !isObject(items)) continue;
    const mine: Record<string, number> = {};
    for (const [id, n] of Object.entries(items))
      if (id !== "" && typeof n === "number" && Number.isInteger(n) && n > 0)
        mine[id] = n;
    if (Object.keys(mine).length) out[k] = mine;
  }
  return Object.keys(out).length ? out : undefined;
}
