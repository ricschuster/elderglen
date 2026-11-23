import bandData from "../content/mine-bands.json";

/**
 * Dangerous mode (`docs/design/22_mines.md`, "Dangerous mode"): a lever on the
 * last hall of floor 120 turns the mine into a harder one, and back, at any
 * time. The multipliers are the owner's numbers of 2026-11-23 (steep as
 * Stardew's); all are placeholders (note 07). Pure rules, free of Phaser.
 */
export const DANGER_HEALTH = 3;
export const DANGER_HITS = 2.5;
export const DANGER_CREATURES = 1.5;
export const DANGER_ORE_BONUS = 1;
export const DANGER_DROPS = 1.5;

/** The floor that holds the lever: the last hall. */
export const LEVER_FLOOR = bandData.topFloor;
/** The service kind of the lever on the map. */
export const LEVER_KIND = "danger-lever";

/**
 * The gate. The warden head's errand (#177) is not written yet, so until it
 * is, the lever works once floor 120 has been reached.
 */
export const leverWorks = (deepest: number): boolean => deepest >= LEVER_FLOOR;

/** Health a creature has: three times the base on a dangerous floor. */
export const dangerHealth = (hp: number, dangerous: boolean): number =>
  dangerous ? hp * DANGER_HEALTH : hp;

/** Health a creature's hit takes: two and a half times, rounded, on a dangerous floor. Assist halves it after this. */
export const dangerHit = (hit: number, dangerous: boolean): number =>
  dangerous ? Math.round(hit * DANGER_HITS) : hit;

/** Creatures on a floor: one and a half times, rounded. The per floor cap scales with it. */
export const dangerCount = (n: number, dangerous: boolean): number =>
  dangerous ? Math.round(n * DANGER_CREATURES) : n;

/** A drop's chance: one and a half times, never above 1. */
export const dangerDropChance = (chance: number, dangerous: boolean): number =>
  dangerous ? Math.min(1, chance * DANGER_DROPS) : chance;

/** Ore a node gives: one more on a dangerous floor. */
export const dangerOre = (n: number, dangerous: boolean): number =>
  dangerous ? n + DANGER_ORE_BONUS : n;
