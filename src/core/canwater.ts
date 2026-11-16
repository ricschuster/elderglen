import type { GameState } from "./save";

/** What the watering can holds at each tier, basic to the top grade (note 103, SC-189 placeholders). */
export const CAN_CAPACITY = [40, 55, 70, 85, 100] as const;

/** The can's capacity at its current tier. */
export function canCapacity(g: GameState): number {
  const tier = Math.min(g.toolTiers.can, CAN_CAPACITY.length - 1);
  return CAN_CAPACITY[tier] ?? CAN_CAPACITY[0];
}

/** How full the can is, 0 to 1, for the meter under its icon. */
export function canFraction(g: GameState): number {
  const cap = canCapacity(g);
  return Math.max(0, Math.min(1, g.canWater / cap));
}

/** Fill the can to the top. */
export function fillCan(g: GameState): void {
  g.canWater = canCapacity(g);
}

/** Use one tile's worth of water. False, and nothing taken, when the can is empty. */
export function spendCanWater(g: GameState): boolean {
  if (g.canWater < 1) return false;
  g.canWater -= 1;
  return true;
}

/** The can tooltip line: "Water: 12/40". */
export function canWaterLine(g: GameState): string {
  return `Water: ${Math.floor(g.canWater)}/${canCapacity(g)}`;
}
