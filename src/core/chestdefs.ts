/** Chest data, apart from the rules so `items.ts` can read it without a cycle (`chests.ts`). */
export interface ChestDef {
  id: string;
  name: string;
  slots: number;
}

export const CHESTS: readonly ChestDef[] = [
  { id: "chest", name: "Chest", slots: 36 },
  { id: "stone-chest", name: "Stone chest", slots: 36 },
  { id: "big-chest", name: "Big chest", slots: 70 },
  { id: "big-stone-chest", name: "Big stone chest", slots: 70 },
];

export function chestById(id: string | undefined): ChestDef | undefined {
  return CHESTS.find((c) => c.id === id);
}

/**
 * The colour bar (Stardew: 20 colours plus the original, free to change any
 * time). Placeholder tints, multiplied over the chest sprite; the original is
 * no colour at all. SC-193.
 */
export const CHEST_COLOURS: readonly number[] = [
  0xe05a5a, 0xe8864a, 0xf0b44a, 0xf2e05a, 0xb4dc5a, 0x6cc860, 0x48b890,
  0x4cc8d8, 0x58a0e8, 0x5a6ee0, 0x8a5ae0, 0xb85ad8, 0xe05ab0, 0xf09ab4,
  0xffffff, 0xc8c8c8, 0x909090, 0x585858, 0x303038, 0xa07850,
];
