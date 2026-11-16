import galleryData from "../content/gallery.json";
import geodeData from "../content/geodes.json";
import { ARTIFACTS } from "./artifacts";
import type { Count } from "./completion";
import { absorbElderfruit, SOURCE_FLAGS } from "./elderfruit";
import { GEM_ITEMS } from "./gems";
import { ELDERFRUIT, itemById } from "./items";
import { splitQuality } from "./quality";
import type { GameState } from "./save";
import { hasFlag, setFlag } from "./worldflags";

/**
 * The library gallery (`docs/design/104_gallery.md`). The list is derived from
 * data, never typed: the geode minerals and foraged crystals, the gems and the
 * Glimmerstone, and the artifacts. One copy of each is donated to Dunmar, the
 * librarian. Reward thresholds and sets are data (`gallery.json`, all
 * placeholders). Donated ids and placed spots are shared by the farm; claims
 * are per player (the claim list is keyed by reward id, so a later
 * multiplayer save can hold one list per player). Free of Phaser and the DOM.
 */
export type GalleryGroup = "mineral" | "artifact";

export interface GalleryEntry {
  id: string;
  group: GalleryGroup;
}

const POOLS = geodeData.pools as {
  minerals: string[];
  foraged: { item: string };
}[];

/** Every item the gallery takes: minerals (geode pools in band order, crystals, gems, the Glimmerstone), then artifacts. */
export const GALLERY_LIST: GalleryEntry[] = (() => {
  const ids = [
    ...POOLS.flatMap((p) => p.minerals),
    ...POOLS.map((p) => p.foraged.item),
    ...GEM_ITEMS.map((g) => g.id),
  ];
  return [
    ...[...new Set(ids)].map((id): GalleryEntry => ({ id, group: "mineral" })),
    ...ARTIFACTS.map((a): GalleryEntry => ({ id: a.id, group: "artifact" })),
  ];
})();

export const GALLERY_IDS = GALLERY_LIST.map((e) => e.id);
export const GALLERY_TOTAL = GALLERY_LIST.length;
export const GALLERY_MINERALS = GALLERY_LIST.filter(
  (e) => e.group === "mineral",
).length;
export const GALLERY_ARTIFACTS = GALLERY_TOTAL - GALLERY_MINERALS;
/** The librarian's shop id, for hours (`shops.json`). */
export const LIBRARY_SHOP = "library";
/** The achievements that fire from the donated count (note 38). */
export const DONATE_40 = 40;

export const galleryEntry = (id: string): GalleryEntry | undefined =>
  GALLERY_LIST.find((e) => e.id === id);

export const inGallery = (id: string): boolean =>
  galleryEntry(id) !== undefined;

/** Donated ids, in the order given. */
export const donatedIds = (g: GameState): string[] => g.gallery ?? [];

export const isDonated = (g: GameState, id: string): boolean =>
  donatedIds(g).includes(id);

/** Donated count, in all or in one group. */
export function donatedCount(g: GameState, group?: GalleryGroup): number {
  const done = new Set(donatedIds(g));
  return GALLERY_LIST.filter(
    (e) => done.has(e.id) && (!group || e.group === group),
  ).length;
}

/** The completion counter (note 39): donated over the list length. */
export function galleryCount(g: GameState): Count {
  const done = new Set(donatedIds(g));
  const missing = GALLERY_LIST.filter((e) => !done.has(e.id));
  return {
    done: GALLERY_TOTAL - missing.length,
    total: GALLERY_TOTAL,
    missing: missing.map((e) => itemById(e.id)?.name ?? e.id),
  };
}

/** True when the item is on the list and not yet donated, so the librarian takes it. */
export function canDonate(g: GameState, id: string): boolean {
  const base = splitQuality(id).base;
  return inGallery(base) && !isDonated(g, base);
}

export type DonateResult =
  { ok: true; id: string; fruit: boolean } | { ok: false; reason: string };

/** The pack id of a copy of an item, whatever its quality. */
function heldCopy(g: GameState, base: string): string | undefined {
  for (let i = 0; i < g.inventory.size; i++) {
    const s = g.inventory.slot(i);
    if (s && splitQuality(s.id).base === base) return s.id;
  }
  return undefined;
}

/**
 * Donate one copy from the pack. Takes one, once per item. When the list is
 * complete the seventh elderfruit is paid (source 7), once.
 */
export function donate(g: GameState, id: string): DonateResult {
  const base = splitQuality(id).base;
  if (!inGallery(base))
    return { ok: false, reason: "The librarian does not take that." };
  if (isDonated(g, base))
    return { ok: false, reason: "The gallery has one of those already." };
  const held = heldCopy(g, base);
  if (!held) return { ok: false, reason: "You do not have one." };
  g.inventory.remove(held);
  g.gallery = [...donatedIds(g), base];
  return { ok: true, id: base, fruit: payGalleryElderfruit(g) };
}

/** Elderfruit source 7: paid when every listed item is donated, once. True when paid now. */
export function payGalleryElderfruit(g: GameState): boolean {
  if (donatedCount(g) < GALLERY_TOTAL || hasFlag(g, SOURCE_FLAGS.gallery))
    return false;
  // Eaten at once, as the other sources are. Without room the flag stays down, and the next donation visit retries.
  if (!g.inventory.add(ELDERFRUIT)) return false;
  setFlag(g, SOURCE_FLAGS.gallery);
  absorbElderfruit(g);
  return true;
}

/** Placement on the shelf (free arrangement): item id to slot index. */
export const placedSlots = (g: GameState): Record<string, number> =>
  g.galleryPlaced ?? {};

/** The slot an item stands in: where the player put it, else its own list position. */
export const slotOf = (g: GameState, id: string): number =>
  placedSlots(g)[id] ?? GALLERY_IDS.indexOf(id);

export interface ShelfSlot {
  slot: number;
  /** The donated item standing here. */
  id?: string;
  /** An undonated item whose home this is, shown as a silhouette. */
  ghost?: string;
}

/** All shelf slots for the screen. Undonated pieces have no spot, only a silhouette at home. */
export function shelf(g: GameState): ShelfSlot[] {
  const slots: ShelfSlot[] = GALLERY_IDS.map((_, slot) => ({ slot }));
  for (const id of donatedIds(g)) {
    const s = slotOf(g, id);
    if (slots[s]) slots[s]!.id = id;
  }
  for (const [i, id] of GALLERY_IDS.entries())
    if (!slots[i]!.id && !isDonated(g, id)) slots[i]!.ghost = id;
  return slots;
}

/** Move a donated item to any slot, swapping with what stands there. */
export function placeOnShelf(
  g: GameState,
  id: string,
  to: number,
): { ok: boolean } {
  if (
    !isDonated(g, id) ||
    !Number.isInteger(to) ||
    to < 0 ||
    to >= GALLERY_TOTAL
  )
    return { ok: false };
  const from = slotOf(g, id);
  const other = shelf(g)[to]!.id;
  const placed = { ...placedSlots(g) };
  placed[id] = to;
  if (other && other !== id) placed[other] = from;
  g.galleryPlaced = placed;
  return { ok: true };
}

export interface RewardDef {
  label: string;
  item?: string;
  count?: number;
}

export interface GalleryReward extends RewardDef {
  /** Stable key kept in the claimed list. */
  key: string;
  /** What the claim waits on, for the list. */
  need: string;
  /** Every reward is a placeholder until the reward design is settled. */
  placeholder: true;
  /** The group a threshold counts, absent for the total and for sets. */
  group?: GalleryGroup;
  at?: number;
}

const tiers = (
  kind: string,
  defs: (RewardDef & { at: number })[],
  group?: GalleryGroup,
): GalleryReward[] =>
  defs.map((d) => ({
    ...d,
    key: `${kind}:${d.at}`,
    need: `${d.at} ${group ?? "item"}s donated`,
    placeholder: true,
    ...(group ? { group } : {}),
  }));

/** Reward tiers: by total, by minerals, by artifacts. */
export const TOTAL_REWARDS = tiers("all", galleryData.totalRewards);
export const MINERAL_REWARDS = tiers(
  "mineral",
  galleryData.mineralRewards,
  "mineral",
);
export const ARTIFACT_REWARDS = tiers(
  "artifact",
  galleryData.artifactRewards,
  "artifact",
);

interface SetDef {
  id: string;
  name: string;
  items: string[];
  reward: RewardDef;
}
export const GALLERY_SETS = galleryData.sets as SetDef[];

export type RewardRow = GalleryReward & { earned: boolean; claimed: boolean };

/** Every reward as one list with whether it is earned and whether it is claimed. */
export function rewardList(g: GameState): RewardRow[] {
  const claimed = new Set(g.galleryClaimed ?? []);
  const out: RewardRow[] = [];
  for (const t of [...TOTAL_REWARDS, ...MINERAL_REWARDS, ...ARTIFACT_REWARDS])
    out.push({
      ...t,
      earned: donatedCount(g, t.group) >= (t.at ?? 0),
      claimed: claimed.has(t.key),
    });
  for (const s of GALLERY_SETS)
    out.push({
      ...s.reward,
      key: `set:${s.id}`,
      need: `${s.name}: all ${s.items.length} pieces`,
      placeholder: true,
      earned: s.items.every((i) => isDonated(g, i)),
      claimed: claimed.has(`set:${s.id}`),
    });
  return out;
}

/** Rewards earned and not yet collected. */
export const claimable = (g: GameState): RewardRow[] =>
  rewardList(g).filter((r) => r.earned && !r.claimed);

/**
 * Collect every earned reward from the librarian. A reward that gives an item
 * waits (stays claimable) while the pack has no room; each is paid once.
 * Returns the labels paid and the labels held for pickup.
 */
export function claimRewards(g: GameState): { paid: string[]; held: string[] } {
  const paid: string[] = [];
  const held: string[] = [];
  for (const r of claimable(g)) {
    if (r.item && g.inventory.room(r.item) < (r.count ?? 1)) {
      held.push(r.label);
      continue;
    }
    if (r.item) g.inventory.add(r.item, r.count ?? 1);
    g.galleryClaimed = [...(g.galleryClaimed ?? []), r.key];
    paid.push(r.label);
  }
  return { paid, held };
}

/** Dunmar's line when a piece is first donated (a placeholder until the voice sheets, M3d). */
export const donateLine = (id: string): string =>
  `Dunmar takes the ${(itemById(id)?.name ?? id).toLowerCase()} and finds it a place on the shelf.`;
