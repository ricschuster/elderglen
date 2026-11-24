// Who ordered a farm building, and who may move or take it down (note 108 rules 7 to 9), plus the
// loader for the per-guest fields of group 5. Free of Phaser and the DOM.
import { isObject } from "./guards";
import { LOCAL_PLAYER, type PlayerId } from "./players";
import type { GameState } from "./save";
import {
  MAX_TIER,
  UPGRADABLE,
  type ToolOrder,
  type Upgradable,
} from "./upgrades";

/** The host's setting on the players list: nobody but the host, each guest's own buildings, or any building. */
export type BuildRule = "off" | "own" | "all";

export const BUILD_RULES: readonly BuildRule[] = ["off", "own", "all"];

/** Own only is the default (Stardew's default is not on the saved page, note 108 rule 9). */
export const DEFAULT_BUILD_RULE: BuildRule = "own";

export const buildRuleOf = (g: GameState): BuildRule =>
  g.buildRule ?? DEFAULT_BUILD_RULE;

/** The next setting when the host taps the players list button. */
export function nextBuildRule(r: BuildRule): BuildRule {
  return BUILD_RULES[(BUILD_RULES.indexOf(r) + 1) % BUILD_RULES.length]!;
}

/** The words on the players list button. */
export function buildRuleLabel(r: BuildRule): string {
  return r === "off"
    ? "Guests moving buildings: off"
    : r === "own"
      ? "Guests moving buildings: own only"
      : "Guests moving buildings: all";
}

/** The key a pond's owner is kept under. */
export const pondKey = (x: number, y: number): string => `pond:${x},${y}`;

/** Who ordered a building: the host for one made before owners were recorded. */
export function ownerOf(g: GameState, key: string): PlayerId {
  return g.buildOwners?.[key] ?? LOCAL_PLAYER;
}

export function setOwner(g: GameState, key: string, by: PlayerId): void {
  if (by === LOCAL_PLAYER) {
    if (g.buildOwners) delete g.buildOwners[key];
    return;
  }
  g.buildOwners = { ...g.buildOwners, [key]: by };
}

export function clearOwner(g: GameState, key: string): void {
  if (g.buildOwners) delete g.buildOwners[key];
}

/**
 * Why this player may not move or take down this building, or undefined if they may. The host always may; a guest
 * by the host's setting (rule 9).
 */
export function mayChange(
  g: GameState,
  by: PlayerId,
  key: string,
): string | undefined {
  if (by === LOCAL_PLAYER) return undefined;
  const rule = buildRuleOf(g);
  if (rule === "off")
    return "The host has turned moving and removing buildings off.";
  if (rule === "own" && ownerOf(g, key) !== by)
    return "You can only change a building you ordered.";
  return undefined;
}

/** Read the group 5 fields of a save into the state. Bad entries are dropped. */
export function loadGuestFields(
  g: GameState,
  raw: {
    galleryClaimedBy?: unknown;
    toolOrdersBy?: unknown;
    buildOwners?: unknown;
    buildRule?: unknown;
  },
): void {
  if (BUILD_RULES.includes(raw.buildRule as BuildRule))
    g.buildRule = raw.buildRule as BuildRule;
  if (isObject(raw.buildOwners)) {
    const owners: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw.buildOwners))
      if (typeof v === "string" && v !== "") owners[k] = v;
    if (Object.keys(owners).length > 0) g.buildOwners = owners;
  }
  if (isObject(raw.galleryClaimedBy)) {
    const by: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(raw.galleryClaimedBy))
      if (Array.isArray(v))
        by[k] = [
          ...new Set(
            v.filter((x): x is string => typeof x === "string" && x !== ""),
          ),
        ];
    if (Object.keys(by).length > 0) g.galleryClaimedBy = by;
  }
  if (isObject(raw.toolOrdersBy)) {
    const orders: Record<string, ToolOrder> = {};
    for (const [k, o] of Object.entries(raw.toolOrdersBy)) {
      if (
        isObject(o) &&
        (UPGRADABLE as readonly unknown[]).includes(o.tool) &&
        typeof o.tier === "number" &&
        Number.isInteger(o.tier) &&
        o.tier >= 1 &&
        o.tier <= MAX_TIER &&
        typeof o.readyDay === "number" &&
        Number.isInteger(o.readyDay) &&
        o.readyDay >= 0
      )
        orders[k] = {
          tool: o.tool as Upgradable,
          tier: o.tier,
          readyDay: o.readyDay,
        };
    }
    if (Object.keys(orders).length > 0) g.toolOrdersBy = orders;
  }
}
