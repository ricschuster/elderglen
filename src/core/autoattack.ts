/**
 * Auto-attack weapon pick (note 27, scheme 1). With a tool or nothing held and
 * a weapon in the pack, an enemy in range makes the farmer equip the last used
 * weapon, else the one in the highest slot. A slingshot or a non-tool item in
 * hand (bombs, food) is never swapped away and never auto-attacks. Free of
 * Phaser.
 */
import { weaponById } from "./combat";
import type { GameState } from "./save";
import { heldAt } from "./toolbar";

/** True when the held slot allows auto-attack to equip a weapon (a tool or nothing). */
export function mayAutoEquip(g: GameState, held: number): boolean {
  return heldAt(g, held).kind !== "item";
}

/** True when this weapon may swing by itself: not the slingshot (it needs aim). */
export const autoSwings = (id: string): boolean => {
  const w = weaponById(id);
  return !!w && w.family !== "sling";
};

/**
 * The pack slot to equip: the last used weapon if it is still carried, else the
 * highest-slot weapon. Slingshots are skipped. Undefined when none.
 */
export function autoWeaponSlot(
  g: GameState,
  lastUsed: string | undefined,
): number | undefined {
  let highest: number | undefined;
  let last: number | undefined;
  for (let i = 0; i < g.inventory.size; i++) {
    const s = g.inventory.slot(i);
    if (!s || !autoSwings(s.id)) continue;
    highest = i;
    if (s.id === lastUsed && last === undefined) last = i;
  }
  return last ?? highest;
}
