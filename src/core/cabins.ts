// Cabins for multiplayer (note 53 step 6, note 55 "Cabins for multiplayer", SC-120).
// Pure rules, free of Phaser and the DOM, with their own small types so they do not
// depend on GameState. The caller keeps a CabinBook in the host's world save.

export const CABIN_PRICE = 100; // gold, built instantly (note 53, Stardew checked)
export const MAX_CABINS = 7; // beside the host's house, so 8 players at most
// Placeholder footprint in tiles (labelled in note 53); the real size comes with note 85 art.
export const CABIN_WIDTH = 4;
export const CABIN_HEIGHT = 3;

export type CabinOrigin = "multiplayer-start" | "converted";

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
}

export interface CabinBook {
  origin: CabinOrigin;
  cabins: Cabin[];
  nextId: number;
}

/** Tells the rules whether a tile cannot hold a building (water, cliff, house, other buildings). */
export type BlockedFn = (x: number, y: number) => boolean;

export type PlaceFailure = "cap" | "overlap" | "blocked" | "unaffordable";

export type BuyResult =
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
) {
  const cabin: Cabin = {
    id: book.nextId,
    x: site.x,
    y: site.y,
    ownerKey,
    free,
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
): BuyResult {
  const fail = placementFailure(book, site, blocked);
  if (fail) return { ok: false, reason: fail };
  if (gold < CABIN_PRICE) return { ok: false, reason: "unaffordable" };
  const made = withCabin(book, site, null, false);
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
    const made = withCabin(book, site, key, true);
    return { kind: "assigned", book: made.book, cabin: made.cabin };
  }
  return { kind: "refused", reason: "no-free-cabin" };
}

/** The host demolishes a cabin. Its occupant (if any) is returned so the caller can move their
 *  things to a chest (Stardew). The occupant loses the cabin and must be given another to rejoin. */
export function demolishCabin(
  book: CabinBook,
  id: number,
): { book: CabinBook; evictedKey: string | null } | null {
  const cabin = book.cabins.find((c) => c.id === id);
  if (!cabin) return null;
  return {
    book: { ...book, cabins: book.cabins.filter((c) => c.id !== id) },
    evictedKey: cabin.ownerKey,
  };
}
