import { SPECIES, FRIENDSHIP_PER_HEART, MAX_FRIENDSHIP } from "./animals";
import { HOMEWARD_PIN, DEEPMARK_KEY, itemById } from "./items";
import { hasHorse } from "./horse";
import { MAX_HOUSE_TIER } from "./house";
import { ELDERFRUIT_TOTAL } from "./elderfruit";
import { HEART, POINTS, type Taste } from "./friendship";
import type { ItemTip } from "./itemtip";
import { VILLAGERS } from "./villagers";
import type { GameState } from "./save";
import { bondOf, partnerOf, type PlayerMarriageBook } from "./playermarriage";

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

/** Everyone in the roster, the spouse first and then roster order; people not yet met are "???" rows. */
export function socialRows(g: GameState): SocialRow[] {
  const day = g.day.clock.day;
  const m = g.marriage;
  const rows = VILLAGERS.map((v) => {
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
  // Stardew lists the spouse first (owner, 2026-11-20, SC-186); the rest keep roster order.
  return [...rows.filter((r) => r.spouse), ...rows.filter((r) => !r.spouse)];
}

/** Another player in the session, for the top of the Social tab (note 53, 2026-11-20). */
export interface PlayerRow {
  id: string;
  name: string;
  /** Slot number from the id ("p2" is 2): picks the figure's tint, as on the farm. */
  slot: number;
  /** "Married to X" or "Engaged to X", or undefined when free (owner, 2026-11-24). */
  tag?: string;
}

/** What the player rows need to know about marriage; both parts optional (single player). */
export interface PlayerRowContext {
  /** The bond book (note 12), to find a player partner. */
  book?: PlayerMarriageBook;
  /** A villager the player is engaged or married to, as `{ stage, name }`; none is tracked per player yet. */
  villagerOf?: (
    id: string,
  ) => { stage: "engaged" | "married"; name: string } | undefined;
}

/**
 * The other players, in the order given, listed above the spouse and the roster
 * (owner, 2026-11-20, checked in Stardew). Empty in single player. The local
 * player is not listed. Each row carries the name, a figure slot and a marriage tag.
 */
export function playerRows(
  remotes: readonly { id: string; name: string }[],
  localId: string,
  ctx: PlayerRowContext = {},
): PlayerRow[] {
  const nameOf = (id: string): string =>
    id === localId ? "you" : (remotes.find((r) => r.id === id)?.name ?? id);
  return remotes
    .filter((r) => r.id !== localId)
    .map((r) => {
      const row: PlayerRow = {
        id: r.id,
        name: r.name,
        slot: Number(r.id.slice(1)) || 0,
      };
      const bond = ctx.book && bondOf(ctx.book, r.id);
      if (bond && (bond.stage === "engaged" || bond.stage === "married")) {
        const who = nameOf(partnerOf(ctx.book!, r.id)!);
        row.tag = `${bond.stage === "married" ? "Married" : "Engaged"} to ${who}`;
      } else {
        const v = ctx.villagerOf?.(r.id);
        if (v)
          row.tag = `${v.stage === "married" ? "Married" : "Engaged"} to ${v.name}`;
      }
      return row;
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

const RELATION_KIND: Record<Relationship, string> = {
  friend: "Friend",
  dating: "Dating",
  engaged: "Engaged",
  spouse: "Spouse",
};

/** How many known loves and likes a Social tip lists before "and more". */
const TIP_LIKES = 4;

/**
 * The hover tip for a Social row (note 102), from existing data only: hearts,
 * gifts this week, whether you talked today, the birthday and the loves and
 * likes learned so far. An unmet person only says so.
 */
export function socialTip(g: GameState, r: SocialRow): ItemTip {
  if (!r.met)
    return {
      name: "???",
      kind: "Item",
      text: "You have not met this person yet.",
    };
  const lines = [
    `Hearts: ${r.hearts} of ${r.maxHearts}.`,
    r.spouse
      ? "Gifts: daily."
      : `Gifts this week: ${r.weekGifts} of ${r.weekGiftLimit}${r.giftedToday ? " (one today)" : ""}.`,
    `Talked today: ${r.talkedToday ? "yes" : "no"}.`,
    `Birthday: ${birthdayText(r.id)}.`,
  ];
  const known = giftLogRows(g, r.id);
  const loved = known.filter((e) => e.taste === "love").map((e) => e.item);
  const liked = known.filter((e) => e.taste === "like").map((e) => e.item);
  const likes = [...loved, ...liked];
  if (likes.length === 0) lines.push("No loves or likes learned yet.");
  else {
    const shown = likes.slice(0, TIP_LIKES).join(", ");
    const more = likes.length - TIP_LIKES;
    lines.push(`Likes known: ${shown}${more > 0 ? `, and ${more} more` : ""}.`);
  }
  return {
    name: r.name,
    kind: RELATION_KIND[r.relationship],
    text: lines.join("\n"),
  };
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
/** Menu tabs that change the player's or the world's state, hidden for a guest. */
export const GUEST_HIDDEN_TABS = ["pack", "animals", "special"];

/** Screens a guest may open over the farm: read-only views only (note 53). */
export const GUEST_SCREENS = [
  "menu",
  "journal",
  "catalogue",
  // The two-player marriage screens send intents and change nothing locally.
  "ledger",
  "proposal",
  "wedding",
  // The night's report (guest copy from the host's `night` message) changes nothing.
  "report",
  // The shop and the shipping bin send buy, sell, ship and take-back intents (note 53); each is opened with an `open` action (note 108).
  "shop",
  "bin",
  // Night Market stalls and chests (note 108 group 1): the host takes the lock and judges each action.
  "market",
  "chest",
  // Crafting, the stove and the furnace send craft, cook, smelt and take intents (note 108 group 2); the workbench and the furnace are opened with an `open` action.
  "crafting",
  "cooking",
  "furnace",
  // The keeper's counter, the coop and barn benches and the fish pond send animal and pond intents (note 108 group 3); the pond takes a lock.
  "keeper",
  "coop-bench",
  "barn-bench",
  "pond",
  // The hall's scrolls and the two boards send bundle, order and request intents (note 108 group 4).
  "hall",
  "orders",
  "requests",
  // The carpenter, the tailor, the two smiths, the gallery counter and the shrine send intents (note 108 group 5).
  "carpenter",
  "tailor",
  "smith",
  "smithy",
  "gallery",
  "shrine",
  // The bed prompt sends a `sleep` intent and changes nothing locally.
  "bed",
  // A guest's own mailbox beside their cabin door: letters are read through the host (note 110 rule 3).
  "mailbox",
];

/** True when a guest may open this screen kind. */
export function guestMayOpen(kind: string): boolean {
  return GUEST_SCREENS.includes(kind);
}

export function hiddenTabs(g: GameState, guest = false): string[] {
  const hidden: string[] = [];
  // A guest's menu is read-only until intents exist (note 53): no tab that moves or crafts.
  if (guest) hidden.push(...GUEST_HIDDEN_TABS);
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
