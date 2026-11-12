import type { Outcome } from "./actions";
import tapperData from "../content/tapper.json";
import type { GameState } from "./save";
import { MATURE_STAGE, type Tree } from "./trees";

/**
 * The tapper (`docs/design/92_tapper_crusher_worm_bin_pale_ale.md`). It is
 * placed on a mature tree, one to a tree, and the tree gives its own good on
 * its own cycle: oak resin, maple syrup, pine tar, or sap each day from
 * mahogany. Time is counted in whole game days from `tap.since`, so it runs
 * while the player is away and through winter. The good waits in the tapper
 * with no loss; taking it restarts the cycle at once. The tap state lives on
 * the tree, so it saves with the trees. Prices are placeholders. Pure rules.
 */
export const TAPPER = tapperData.tapper.id;
export const TAPPER_DEF = tapperData.tapper;
/** The Heavy Tapper (note 92, Stardew's cycles: 3, 4 and 2 days, mahogany daily). Recipe and price are placeholders. */
export const HEAVY_TAPPER = tapperData.heavy.id;
export const HEAVY_TAPPER_DEF = {
  id: tapperData.heavy.id,
  name: tapperData.heavy.name,
  sellPrice: tapperData.heavy.sellPrice,
};

/** True for either tapper item. */
export const isTapperItem = (id: string): boolean =>
  id === TAPPER || id === HEAVY_TAPPER;

/** Days one cycle takes on this tree, shorter with a Heavy Tapper. */
export function cycleDays(t: Pick<Tree, "kind" | "tap">): number {
  const good = goodOfTree(t);
  const heavy = t.tap?.heavy
    ? (tapperData.heavy.days as Record<string, number>)[good.kind]
    : undefined;
  return heavy ?? good.days;
}

export interface TapGood {
  kind: string;
  item: string;
  name: string;
  sellPrice: number;
  days: number;
}

export const TAP_GOODS = tapperData.goods as TapGood[];

/** The good a tree gives. A tree of no named kind is an oak (note 71). */
export const goodOfTree = (t: Pick<Tree, "kind">): TapGood =>
  TAP_GOODS.find((g) => g.kind === (t.kind ?? "oak")) ?? TAP_GOODS[0]!;

const fail = (reason: string): Outcome => ({ ok: false, reason });

/** A tree a tapper may go on: mature and standing, not yet tapped. A stump or large stump is not. */
export function mayTap(t: Tree | undefined): boolean {
  return (
    !!t &&
    !t.stump &&
    !t.large &&
    t.stage === MATURE_STAGE &&
    t.tap === undefined
  );
}

/** Days until the tapped tree's good is ready, or undefined if it holds no tapper. 0 when ready. */
export function tapDaysLeft(g: GameState, t: Tree): number | undefined {
  if (!t.tap) return undefined;
  return Math.max(cycleDays(t) - (g.day.clock.day - t.tap.since), 0);
}

/** True when the tree holds a tapper whose cycle is full. */
export const tapReady = (g: GameState, t: Tree | undefined): boolean =>
  !!t && tapDaysLeft(g, t) === 0;

/** What a tapped tree says when used with nothing ready. */
export function tapStatus(g: GameState, x: number, y: number): string {
  const t = g.trees.at(x, y);
  const left = t ? tapDaysLeft(g, t) : undefined;
  if (!t || left === undefined) return "";
  const good = goodOfTree(t).name.toLowerCase();
  if (left === 0) return `The ${good} is ready.`;
  return `${goodOfTree(t).name}: ${left} more day${left === 1 ? "" : "s"}.`;
}

/** Put a tapper from the backpack on the mature tree at a tile. */
export function placeTapper(
  g: GameState,
  x: number,
  y: number,
  id: string = TAPPER,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const t = g.trees.at(x, y);
  if (!t) return fail("no tree here");
  if (t.tap) return fail("already tapped");
  if (!mayTap(t)) return fail("cannot tap this");
  if (g.inventory.count(id) < 1) return fail("no tapper");
  g.inventory.remove(id, 1);
  t.tap = { since: g.day.clock.day };
  if (id === HEAVY_TAPPER) t.tap.heavy = true;
  return { ok: true };
}

/** Take the good from a tapped tree once its cycle is full. The next cycle starts at once. */
export function collectTap(g: GameState, x: number, y: number): Outcome {
  if (g.day.over) return fail("exhausted");
  const t = g.trees.at(x, y);
  if (!t?.tap) return fail("not tapped");
  if (!tapReady(g, t)) return fail("tap busy");
  const good = goodOfTree(t).item;
  if (!g.inventory.add(good, 1)) return fail("backpack full");
  t.tap.since = g.day.clock.day;
  return { ok: true, item: good };
}

/**
 * Lift the tapper off a tree. A good that is ready comes with it, so none is
 * lost. If the backpack cannot hold both, nothing changes.
 */
export function liftTapper(g: GameState, x: number, y: number): Outcome {
  if (g.day.over) return fail("exhausted");
  const t = g.trees.at(x, y);
  if (!t?.tap) return fail("not tapped");
  const good = tapReady(g, t) ? goodOfTree(t).item : undefined;
  const heavy = t.tap.heavy;
  const before = g.inventory.save();
  if (
    !g.inventory.add(t.tap.heavy ? HEAVY_TAPPER : TAPPER, 1) ||
    (good !== undefined && !g.inventory.add(good, 1))
  ) {
    g.inventory.load(before);
    return fail("backpack full");
  }
  delete t.tap;
  return { ok: true, item: heavy ? HEAVY_TAPPER : TAPPER };
}
