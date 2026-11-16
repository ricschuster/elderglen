import { SPECIES, FRIENDSHIP_PER_HEART, MAX_FRIENDSHIP } from "./animals";
import { HOMEWARD_PIN, DEEPMARK_KEY, itemById } from "./items";
import { hasHorse } from "./horse";
import { MAX_HOUSE_TIER } from "./house";
import { ELDERFRUIT_TOTAL } from "./elderfruit";
import { HEART, POINTS, type Taste } from "./friendship";
import { VILLAGERS } from "./villagers";
import type { GameState } from "./save";

/**
 * What the in-game menu's Social, Animals, Special Items and Skills pages show
 * (note 49). Pure reads of the game state, free of Phaser, so they are tested
 * and the scenes only draw.
 */

// ---- Social --------------------------------------------------------------

export type Relationship = "friend" | "dating" | "engaged" | "spouse";

export interface SocialRow {
  id: string;
  /** "???" until met. */
  name: string;
  met: boolean;
  relationship: Relationship;
  /** 0 until met. */
  hearts: number;
  /** The heart cap now; 0 until met. */
  maxHearts: number;
  talkedToday: boolean;
  /** Counted gifts this week, out of `weekGiftLimit`. */
  weekGifts: number;
  weekGiftLimit: number;
  giftedToday: boolean;
  /** A spouse takes gifts daily, so the row shows no gift boxes. */
  spouse: boolean;
}

/** A child of the farm: hearts only. */
export interface ChildRow {
  id: string;
  name: string;
  hearts: number;
}

/** Hearts in a child's row, out of ten. */
export const CHILD_MAX_HEARTS = 10;

/** Everyone in the roster, in roster order; people not yet met are "???" rows. */
export function socialRows(g: GameState): SocialRow[] {
  const day = g.day.clock.day;
  const m = g.marriage;
  return VILLAGERS.map((v) => {
    const met = g.friendship.met(v.id);
    const spouse = m.married && m.spouse === v.id;
    const relationship: Relationship = spouse
      ? "spouse"
      : m.isPartner(v.id)
        ? m.stage === "engaged"
          ? "engaged"
          : "dating"
        : "friend";
    return {
      id: v.id,
      name: met ? v.name : "???",
      met,
      relationship,
      hearts: met ? g.friendship.hearts(v.id) : 0,
      maxHearts: met ? g.friendship.capHearts(v.id) : 0,
      talkedToday: met && g.friendship.talkedOn(v.id, day),
      weekGifts: met ? g.friendship.weekGifts(v.id, day) : 0,
      weekGiftLimit: POINTS.weeklyGifts,
      giftedToday: met && g.friendship.giftedOn(v.id, day),
      spouse,
    };
  });
}

/** The farm's children, for the short section after the roster. */
export function childRows(g: GameState): ChildRow[] {
  return g.marriage.kids.map((k) => ({
    id: k.id,
    name: k.name,
    hearts: Math.min(CHILD_MAX_HEARTS, Math.floor(k.points / HEART)),
  }));
}

/** A person's birthday in words, such as "Spring 4". */
export function birthdayText(id: string): string {
  const v = VILLAGERS.find((x) => x.id === id);
  if (!v) return "";
  const s = v.birthday.season;
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} ${v.birthday.day}`;
}

/** How many of the roster the player has yet to meet. */
export const unmetCount = (g: GameState): number =>
  VILLAGERS.filter((v) => !g.friendship.met(v.id)).length;

export interface GiftLogRow {
  item: string;
  taste: Taste;
}

/** The gift tastes learned for one person, by item name. */
export function giftLogRows(g: GameState, id: string): GiftLogRow[] {
  return Object.entries(g.friendship.giftLog(id))
    .map(([item, taste]) => ({ item: itemById(item)?.name ?? item, taste }))
    .sort((a, b) => a.item.localeCompare(b.item));
}

// ---- Animals -------------------------------------------------------------

export interface AnimalRow {
  name: string;
  kind: string;
  /** Whole hearts out of 5, or undefined for the horse, which has no friendship. */
  hearts?: number;
  maxHearts?: number;
  /** Petted today, or undefined where petting does not apply. */
  petted?: boolean;
}

/** The horse (once the stable stands) and every farm animal. */
export function animalRows(g: GameState): AnimalRow[] {
  const rows: AnimalRow[] = [];
  if (hasHorse(g))
    rows.push({ name: g.animals.horse.name || "Not named yet", kind: "Horse" });
  for (const a of g.animals.animals)
    rows.push({
      name: a.name,
      kind: SPECIES[a.species].name,
      hearts: Math.floor(a.friendship / FRIENDSHIP_PER_HEART),
      maxHearts: MAX_FRIENDSHIP / FRIENDSHIP_PER_HEART,
      petted: a.petted,
    });
  return rows;
}

// ---- Special items -------------------------------------------------------

export interface SpecialItem {
  id: string;
  name: string;
  text: string;
}

/**
 * The keepsakes and keys the game already has (note 49): held in the pack or
 * owned outright (a chest is not searched). The text says what each does today, which for most is
 * nothing yet.
 */
export function specialItems(g: GameState): SpecialItem[] {
  const out: SpecialItem[] = [];
  const held = (id: string): boolean => g.inventory.count(id) > 0;
  if (held(HOMEWARD_PIN))
    out.push({
      id: HOMEWARD_PIN,
      name: "Homeward pin",
      text: "Kept for the warp rings. It does nothing yet.",
    });
  if (held(DEEPMARK_KEY))
    out.push({
      id: DEEPMARK_KEY,
      name: "Deepmark key",
      text: "The key to the deep dig of ring 2. It does nothing yet.",
    });
  if (g.catalogue)
    out.push({
      id: "catalogue",
      name: "Furniture Catalogue",
      text: "Lets you order furniture from the carpenter.",
    });
  return out;
}

// ---- Tabs ----------------------------------------------------------------

/** Tab keys the menu hides until they have something to show (note 49). */
export function hiddenTabs(g: GameState): string[] {
  const hidden: string[] = [];
  if (animalRows(g).length === 0) hidden.push("animals");
  if (specialItems(g).length === 0) hidden.push("special");
  return hidden;
}

// ---- Skills extras -------------------------------------------------------

/** The lines under the skill bars: farmhouse, deepest mine floor, elderfruit. */
export function skillExtras(g: GameState): string[] {
  const lines = [`Farmhouse upgrade: ${g.houseTier} of ${MAX_HOUSE_TIER}`];
  if (g.mines.deepest > 0) lines.push(`Deepest mine floor: ${g.mines.deepest}`);
  if (g.elderfruit > 0)
    lines.push(`Elderfruit eaten: ${g.elderfruit} of ${ELDERFRUIT_TOTAL}`);
  return lines;
}
