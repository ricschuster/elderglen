import { BACKPACK_SIZES, type Inventory } from "./inventory";
import { itemById } from "./items";
import type { GameState } from "./save";
import type { Wallet } from "./shop";

/** The tools that can be upgraded, and what each tier is called. */
export const UPGRADABLE = ["hoe", "can", "pickaxe", "axe"] as const;
export type Upgradable = (typeof UPGRADABLE)[number];
export const TIER_NAMES = [
  "Basic",
  "Copper",
  "Steel",
  "Gold",
  "Hearthsilver",
] as const;
export const MAX_TIER = TIER_NAMES.length - 1;

/** Gold to upgrade a tool to tier 1 to 4. From memory (note 44). The Hearthsilver step is bars only (note 22). */
export const UPGRADE_COST = [2000, 5000, 10000, 0];
/** The bars a step needs, five of the metal for that grade (note 44). */
export const UPGRADE_BAR = [
  "copper-bar",
  "iron-bar",
  "gold-bar",
  "hearthsilver-bar",
];
export const UPGRADE_BARS = 5;
/** Days the smith keeps the tool, as Stardew's blacksmith does (note 44). */
export const UPGRADE_DAYS = 2;

/** Energy saved per swing for each tier above basic. Ours. */
export const TIER_SAVING = 0.25;
/** Energy saved per swing for each farming level. From memory. */
export const LEVEL_SAVING = 0.1;
/** A swing never costs less than this. */
export const MIN_SWING = 0.5;

export type ToolTiers = Record<Upgradable, number>;

/** Energy for one swing of the hoe or can, given the tool tier and farming level. */
export function swingCost(base: number, tier: number, farmingLevel: number) {
  return Math.max(
    base - TIER_SAVING * tier - LEVEL_SAVING * farmingLevel,
    MIN_SWING,
  );
}

/** The next tier's price, or undefined if the tool is fully upgraded. */
export function upgradeCost(tier: number): number | undefined {
  return UPGRADE_COST[tier];
}

/** A tool the smith is working on. It comes back on `readyDay`. */
export interface ToolOrder {
  tool: Upgradable;
  /** The grade it will have when it comes back. */
  tier: number;
  readyDay: number;
}

/** The bar a tool's next step takes, or undefined if it is fully upgraded. */
export function upgradeBar(tier: number): string | undefined {
  return UPGRADE_BAR[tier];
}

/** True while a tool is at the smith, so it cannot be used. */
export function toolAway(g: GameState, tool: string): boolean {
  return g.toolOrder?.tool === tool;
}

/** Why a tool cannot be handed over now, or undefined if it can. */
export function orderProblem(
  g: GameState,
  tool: Upgradable,
): string | undefined {
  const tier = g.toolTiers[tool];
  const gold = upgradeCost(tier);
  const bar = upgradeBar(tier);
  if (gold === undefined || bar === undefined) return "Already the best.";
  // One tool at a time is a placeholder: the Stardew pages do not say (note 44).
  if (g.toolOrder) return "She is still working on another tool.";
  if (g.money < gold) return "Not enough money.";
  if (g.inventory.count(bar) < UPGRADE_BARS)
    return `You need ${UPGRADE_BARS} ${itemById(bar)?.name.toLowerCase() ?? bar}s.`;
  return undefined;
}

/**
 * Hand a tool to the smith for its next grade: she takes the gold and five
 * bars and keeps it for two days. Returns the reason it was refused, if so.
 */
export function orderUpgrade(
  g: GameState,
  tool: Upgradable,
): string | undefined {
  const problem = orderProblem(g, tool);
  if (problem) return problem;
  const tier = g.toolTiers[tool];
  g.money -= upgradeCost(tier) as number;
  g.inventory.remove(upgradeBar(tier) as string, UPGRADE_BARS);
  g.toolOrder = {
    tool,
    tier: tier + 1,
    readyDay: g.day.clock.day + UPGRADE_DAYS,
  };
  return undefined;
}

/** True when the tool at the smith is done. */
export function orderReady(g: GameState): boolean {
  return !!g.toolOrder && g.day.clock.day >= g.toolOrder.readyDay;
}

/** Take the finished tool back. Returns it, or undefined if none is ready. */
export function collectUpgrade(g: GameState): Upgradable | undefined {
  const order = g.toolOrder;
  if (!order || !orderReady(g)) return undefined;
  g.toolTiers[order.tool] = order.tier;
  g.toolOrder = undefined;
  return order.tool;
}

/** Price to grow the backpack to 24 and then 36 slots. From memory. */
export const BACKPACK_COST = [2000, 10000];

/** The next size and its price, or undefined at the biggest backpack. */
export function nextBackpack(
  inv: Inventory,
): { size: number; cost: number } | undefined {
  const step = BACKPACK_SIZES.findIndex((n) => n > inv.size);
  const cost = BACKPACK_COST[step - 1];
  const size = BACKPACK_SIZES[step];
  return step < 1 || size === undefined || cost === undefined
    ? undefined
    : { size, cost };
}

/** Buy the next backpack size. Returns false if maxed or too dear. */
export function upgradeBackpack(inv: Inventory, wallet: Wallet): boolean {
  const next = nextBackpack(inv);
  if (!next || wallet.money < next.cost) return false;
  wallet.money -= next.cost;
  return inv.grow(next.size);
}
