// Cabins for multiplayer (note 53, note 55 "Cabins for multiplayer", SC-120).
// Pure rules, free of Phaser and the DOM, with their own small types so they do not
// depend on GameState. The caller keeps a CabinBook in the host's world save.

export const CABIN_PRICE = 100; // gold, built instantly (note 53, Stardew checked)
export const MAX_CABINS = 7; // beside the host's house, so 8 players at most
// Placeholder footprint in tiles (labelled in note 53); the real size comes with note 85 art.
const CABIN_WIDTH = 4;
const CABIN_HEIGHT = 3;

/** The tile a guest stands on at their cabin: just below the footprint's left side. */
export function cabinSpawnTile(site: CabinSite): { x: number; y: number } {
  return { x: site.x + 1, y: site.y + CABIN_HEIGHT };
}

export type CabinOrigin = "multiplayer-start" | "converted";

/** The three outside looks of a cabin (note 110 rule 2). Names are placeholders until the art pass (M3d). */
export const CABIN_STYLES = ["log", "stone", "plank"] as const;
export type CabinStyle = (typeof CABIN_STYLES)[number];
export const CABIN_STYLE_NAMES: Record<CabinStyle, string> = {
  log: "Log",
  stone: "Stone",
  plank: "Plank",
};
export const isCabinStyle = (v: unknown): v is CabinStyle =>
  typeof v === "string" && (CABIN_STYLES as readonly string[]).includes(v);

/** An upgrade being built in a cabin: the tier it will reach and working nights left (as `HouseBuild`). */
export interface CabinBuild {
  tier: number;
  daysLeft: number;
}

/** A cabin's door tile (on the farm, the bottom row of the footprint) and the tile its mailbox stands on. */
export function cabinDoorTile(site: CabinSite): { x: number; y: number } {
  return { x: site.x + 1, y: site.y + CABIN_HEIGHT - 1 };
}
export function cabinMailboxTile(site: CabinSite): { x: number; y: number } {
  return { x: site.x + 3, y: site.y + CABIN_HEIGHT };
}
/** The footprint of a cabin in tiles. */
export function cabinRect(site: CabinSite): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return { x: site.x, y: site.y, w: CABIN_WIDTH, h: CABIN_HEIGHT };
}

export interface CabinSite {
  x: number;
  y: number;
}

export interface Cabin extends CabinSite {
  id: number;
  /** Device key of the occupant, or null while the cabin is free. */
  ownerKey: string | null;
  /** True for a cabin that cost nothing (built at a multiplayer start). */
  free: boolean;
  /** The outside look, picked at placement and changed at the carpenter (note 110). */
  style: CabinStyle;
  /** House tier of this cabin's interior, upgraded by its occupant alone (note 85, note 108 rule 8). */
  tier: number;
  /** Renovations built, by id (`house-renos.json`). */
  renos: string[];
  /** An upgrade under way. */
  build?: CabinBuild;
}

export interface CabinBook {
  origin: CabinOrigin;
  cabins: Cabin[];
  nextId: number;
  /** Where each owner's bed stands in their home, when moved from the default (note 110 rule 1). Keyed by player id. */
  beds?: Record<string, { x: number; y: number }>;
}

/** Tells the rules whether a tile cannot hold a building (water, cliff, house, other buildings). */
export type BlockedFn = (x: number, y: number) => boolean;

type PlaceFailure = "cap" | "overlap" | "blocked" | "unaffordable";

type BuyResult =
  | { ok: true; book: CabinBook; gold: number; cabin: Cabin }
  | { ok: false; reason: PlaceFailure };

export type JoinResult =
  | { kind: "returning"; book: CabinBook; cabin: Cabin }
  | { kind: "assigned"; book: CabinBook; cabin: Cabin }
  | { kind: "refused"; reason: "no-free-cabin" | "full" };

export function newCabinBook(origin: CabinOrigin): CabinBook {
  return { origin, cabins: [], nextId: 1 };
}

export function cabinOf(book: CabinBook, key: string): Cabin | undefined {
  return book.cabins.find((c) => c.ownerKey === key);
}

export function freeCabins(book: CabinBook): Cabin[] {
  return book.cabins.filter((c) => c.ownerKey === null);
}

function overlaps(a: CabinSite, b: CabinSite): boolean {
  return (
    a.x < b.x + CABIN_WIDTH &&
    b.x < a.x + CABIN_WIDTH &&
    a.y < b.y + CABIN_HEIGHT &&
    b.y < a.y + CABIN_HEIGHT
  );
}

/** Why a cabin cannot stand at the site, or null if it can. Placement is free (SC-120). */
export function placementFailure(
  book: CabinBook,
  site: CabinSite,
  blocked: BlockedFn,
): PlaceFailure | null {
  if (book.cabins.length >= MAX_CABINS) return "cap";
  if (book.cabins.some((c) => overlaps(c, site))) return "overlap";
  for (let dy = 0; dy < CABIN_HEIGHT; dy++) {
    for (let dx = 0; dx < CABIN_WIDTH; dx++) {
      if (blocked(site.x + dx, site.y + dy)) return "blocked";
    }
  }
  return null;
}

function withCabin(
  book: CabinBook,
  site: CabinSite,
  ownerKey: string | null,
  free: boolean,
  style: CabinStyle,
) {
  const cabin: Cabin = {
    id: book.nextId,
    x: site.x,
    y: site.y,
    ownerKey,
    free,
    style,
    tier: 0,
    renos: [],
  };
  return {
    cabin,
    book: { ...book, cabins: [...book.cabins, cabin], nextId: book.nextId + 1 },
  };
}

/** The host buys a cabin from the carpenter: 100 gold, built at once, left free for a guest. */
export function buyCabin(
  book: CabinBook,
  gold: number,
  site: CabinSite,
  blocked: BlockedFn,
  style: CabinStyle = "log",
): BuyResult {
  const fail = placementFailure(book, site, blocked);
  if (fail) return { ok: false, reason: fail };
  if (gold < CABIN_PRICE) return { ok: false, reason: "unaffordable" };
  const made = withCabin(book, site, null, false, style);
  return {
    ok: true,
    book: made.book,
    gold: gold - CABIN_PRICE,
    cabin: made.cabin,
  };
}

/** First site in row-major order inside the open area that fits a cabin, or null. */
export function defaultCabinSite(
  book: CabinBook,
  area: { x: number; y: number; w: number; h: number },
  blocked: BlockedFn,
): CabinSite | null {
  for (let y = area.y; y + CABIN_HEIGHT <= area.y + area.h; y++) {
    for (let x = area.x; x + CABIN_WIDTH <= area.x + area.w; x++) {
      if (placementFailure(book, { x, y }, blocked) === null) return { x, y };
    }
  }
  return null;
}

/**
 * A guest joins and needs a home (note 53 "Homes").
 * - Same key as before: the same cabin (also while banned characters stay in the save).
 * - Game started as multiplayer: a free cabin is built at the default spot, up to the cap.
 * - Converted single player: the guest takes a cabin the host already bought, else is refused
 *   with "no-free-cabin" so the screen can tell the guest and offer the host the purchase.
 */
export function joinNeedsCabin(
  book: CabinBook,
  key: string,
  area: { x: number; y: number; w: number; h: number },
  blocked: BlockedFn,
  style: CabinStyle = "log",
): JoinResult {
  const own = cabinOf(book, key);
  if (own) return { kind: "returning", book, cabin: own };
  const empty = freeCabins(book)[0];
  if (empty) {
    const cabin = { ...empty, ownerKey: key };
    const cabins = book.cabins.map((c) => (c.id === cabin.id ? cabin : c));
    return { kind: "assigned", book: { ...book, cabins }, cabin };
  }
  if (book.cabins.length >= MAX_CABINS)
    return { kind: "refused", reason: "full" };
  if (book.origin === "multiplayer-start") {
    const site = defaultCabinSite(book, area, blocked);
    if (!site) return { kind: "refused", reason: "no-free-cabin" };
    const made = withCabin(book, site, key, true, style);
    return { kind: "assigned", book: made.book, cabin: made.cabin };
  }
  return { kind: "refused", reason: "no-free-cabin" };
}

/** The host demolishes a cabin. Its occupant (if any) is returned so the caller can move their
 *  things to the lost and found box (Stardew). The occupant loses the cabin, its tier and renovations, and
 *  their moved bed, and must be given another to rejoin. */
export function demolishCabin(
  book: CabinBook,
  id: number,
): { book: CabinBook; evictedKey: string | null } | null {
  const cabin = book.cabins.find((c) => c.id === id);
  if (!cabin) return null;
  const next: CabinBook = {
    ...book,
    cabins: book.cabins.filter((c) => c.id !== id),
  };
  if (cabin.ownerKey !== null && book.beds?.[cabin.ownerKey]) {
    const beds = { ...book.beds };
    delete beds[cabin.ownerKey];
    if (Object.keys(beds).length) next.beds = beds;
    else delete next.beds;
  }
  return { book: next, evictedKey: cabin.ownerKey };
}

/**
 * Stand a cabin on a new site (free, at once). Only the footprint may not overlap another cabin; the
 * ground is the caller's check. The cabin keeps its owner, style, tier and renovations: its home instance is
 * kept by the owner's key, not by where the cabin stands.
 */
export function moveCabin(
  book: CabinBook,
  id: number,
  site: CabinSite,
): { ok: true; book: CabinBook } | { ok: false; reason: string } {
  const cabin = book.cabins.find((c) => c.id === id);
  if (!cabin) return { ok: false, reason: "There is no such cabin." };
  if (cabin.x === site.x && cabin.y === site.y)
    return { ok: false, reason: "It already stands there." };
  if (book.cabins.some((c) => c.id !== id && overlaps(c, site)))
    return { ok: false, reason: "Another cabin is in the way." };
  return {
    ok: true,
    book: {
      ...book,
      cabins: book.cabins.map((c) =>
        c.id === id ? { ...c, x: site.x, y: site.y } : c,
      ),
    },
  };
}

/**
 * Change a cabin's outside look. Only the one who lives there may (note 110 rule 2, ours). Returns the new
 * book, or a reason in words.
 */
export function restyleCabin(
  book: CabinBook,
  by: string,
  style: unknown,
): { ok: true; book: CabinBook } | { ok: false; reason: string } {
  if (!isCabinStyle(style)) return { ok: false, reason: "bad style" };
  const own = cabinOf(book, by);
  if (!own) return { ok: false, reason: "You have no cabin." };
  if (own.style === style)
    return { ok: false, reason: "It already looks like that." };
  return {
    ok: true,
    book: {
      ...book,
      cabins: book.cabins.map((c) => (c.id === own.id ? { ...c, style } : c)),
    },
  };
}

/** A saved cabin book, read with defaults for every field an older save lacks. Undefined if there is none. */
export function loadCabinBook(raw: unknown): CabinBook | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.cabins)) return undefined;
  const int = (v: unknown, min = 0) =>
    typeof v === "number" && Number.isInteger(v) && v >= min ? v : undefined;
  const cabins: Cabin[] = [];
  for (const c of o.cabins) {
    if (typeof c !== "object" || c === null) continue;
    const r = c as Record<string, unknown>;
    const id = int(r.id, 1);
    const x = int(r.x);
    const y = int(r.y);
    if (id === undefined || x === undefined || y === undefined) continue;
    if (cabins.some((k) => k.id === id)) continue;
    const owner = typeof r.ownerKey === "string" ? r.ownerKey : null;
    const cabin: Cabin = {
      id,
      x,
      y,
      ownerKey: owner,
      free: r.free === true,
      style: isCabinStyle(r.style) ? r.style : "log",
      tier: Math.min(int(r.tier) ?? 0, 3),
      renos: Array.isArray(r.renos)
        ? r.renos.filter((v): v is string => typeof v === "string")
        : [],
    };
    const b = r.build as Record<string, unknown> | undefined;
    if (b && int(b.tier, 1) !== undefined && int(b.daysLeft, 1) !== undefined)
      cabin.build = { tier: b.tier as number, daysLeft: b.daysLeft as number };
    cabins.push(cabin);
  }
  const beds: Record<string, { x: number; y: number }> = {};
  if (typeof o.beds === "object" && o.beds !== null)
    for (const [k, v] of Object.entries(o.beds)) {
      const bed = v as Record<string, unknown>;
      const x = int(bed?.x);
      const y = int(bed?.y);
      if (x !== undefined && y !== undefined) beds[k] = { x, y };
    }
  const nextId = Math.max(
    int(o.nextId, 1) ?? 1,
    ...cabins.map((c) => c.id + 1),
  );
  return {
    origin: o.origin === "converted" ? "converted" : "multiplayer-start",
    cabins,
    nextId,
    ...(Object.keys(beds).length ? { beds } : {}),
  };
}
