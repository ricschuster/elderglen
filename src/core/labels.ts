/**
 * Placeholder names for doors and counters, drawn over them until the art pass
 * (#58). Plain data, so the scene stays thin and a test can check the table.
 */

const EXITS: Record<string, string> = {
  house: "House",
  hall: "Village Hall",
  sawmill: "Sawmill",
  mine: "Mine",
  cave: "Farm Cave",
  door: "Door",
  cellar: "Cellar stairs",
  stairs: "Stairs up",
  coop: "Coop",
  greenhouse: "Greenhouse",
  barn: "Barn",
  forest: "Forest",
  hearthwell: "Hearthwell",
  to_hearthwell: "Hearthwell",
  to_farm: "Farm",
  to_secret_woods: "Secret Woods",
  to_forest: "Forest",
  to_mountain: "Mountain",
  to_quarry: "Quarry",
  to_delta: "River delta",
  to_green: "Festival green",
  to_hedge: "Hedge maze",
  ferry: "Ferry to the Lake cove",
  delta: "River delta",
  fisher: "Fisher's hut",
  forge: "Forge",
  farmstead: "Farmstead",
  hermit: "Hermit's tower",
  elf: "Thalwen's cottage",
  room: "Maren's room",
  tent: "Marl's tent",
  "general-store": "General Store",
  healer: "Healer",
  inn: "Inn",
  library: "Library",
  smithy: "Smithy",
  hatter: "Hatter",
  outpost: "Outpost",
  rooms: "Steward's rooms",
  loft: "Fisher's loft",
  "burrow-gardener": "Gardener's burrow",
  "burrow-retired": "Retired couple's burrow",
  "burrow-young": "Young adults' burrow",
};

const SERVICES: Record<string, string> = {
  shop: "Shop",
  bin: "Shipping Bin",
  "ore-bin": "Ore Bin",
  furnace: "Furnace",
  mailbox: "Mailbox",
  bed: "Bed",
  cooking: "Stove",
  carpenter: "Carpenter",
  "coop-bench": "Feeding Bench",
  "barn-bench": "Feeding Bench",
  smith: "Smith",
  smithy: "Smithy",
  trainer: "Trainer",
  "wall-list": "Wall List",
  dummy: "Dummy",
  lift: "Lift",
  stairs: "Stairs",
  "cave-dehydrator": "Dehydrator",
  "mushroom-box": "Mushroom Box",
  "camp-chest": "Camp Chest",
  "danger-lever": "Lever",
  orders: "Orders Board",
  requests: "Request Board",
  "board-news": "Road News Board",
  trader: "Road Trader",
  "rain-seller": "Rain Peddler",
  festival: "Village Green",
  "festival-leave": "Way Home",
  "cake-table": "Cake Table",
  "market-stall": "Market Stall",
  "hedge-chest": "Chest",
  "hedge-cart": "Cart Home",
  cart: "Cart",
  "herb-stall": "Herb Stall",
  ledger: "The Ledger",
  "fisher-shop": "Fisher's Counter",
  "pin-stall": "Thalwen's Pin Stall",
  stonekeeper: "Stonekeeper",
  keeper: "Keeper's Counter",
  hermit: "Hermit",
  "spirit-statue": "Spirit's Stone",
  shrine: "Ancestors' Shrine",
  camp: "Camp Fire",
  "tide-bridge": "Broken Footbridge",
  "quarry-bridge": "Broken Bridge",
  "cove-treasure": "Glint on the Ledge",
  "counter-healer": "Healer's Counter",
  "counter-inn": "Inn Counter",
  "counter-library": "Library Desk",
  "counter-hatter": "Hatter's Counter",
  "sewing-machine": "Sewing Machine",
  "dye-pots": "Dye Pots",
  "counter-outpost": "Post Counter",
};

/** Festival map counters and villagers share kinds, so they are named by id. */
const FESTIVAL_BY_ID: Record<string, string> = {
  table: "Display Table",
  judge: "Judge",
  prizes: "Prize Counter",
  booth: "Booth",
  "hat-counter": "Hat Counter",
  "seed-stall": "Seed Stall",
  "costume-stall": "Costume Stall",
  "lantern-stall": "Lantern Stall",
  "festival-counter": "Festival Counter",
};

/** Hall counters share the kind "hall", so they are named by id. */
const HALL: Record<string, string> = {
  "foragers-shelf": "Foragers' Shelf",
  larder: "Larder",
  hearth: "Hearth",
  "last-seat": "Last Seat",
  "water-room": "Water room",
  "guests-board": "Guests' Board",
};

export function exitLabel(id: string): string | undefined {
  return EXITS[id];
}

export function serviceLabel(kind: string, id: string): string | undefined {
  if (kind === "hall") return HALL[id];
  if (kind === "showing" || kind === "festival-counter")
    return FESTIVAL_BY_ID[id];
  if (kind === "sight")
    return id.startsWith("scare")
      ? "Decoration"
      : id.startsWith("sign")
        ? "Signpost"
        : "Villager";
  return SERVICES[kind];
}

/**
 * What the Hearthwell counters without a system yet say (note 77, interiors
 * built as shells by #646). Nobody stands behind them until villagers (#599).
 */
export const COUNTER_LINES: Record<string, string> = {
  "counter-healer": "The healer's counter. Nobody is here yet.",
  "counter-inn": "The inn's counter. Nobody is here yet.",
  "counter-library": "The library desk. Nobody is here yet.",
  "counter-hatter": "The hatter's counter. Nobody is here yet.",
  "counter-outpost": "The post counter. Nobody is here yet.",
};

/** The line a stand-in counter or board says, if the kind has one. */
export const standInLine = (kind: string): string | undefined =>
  COUNTER_LINES[kind];

/** A name tag to place: its anchor (bottom centre, in pixels) and its text. */
export interface LabelTag {
  x: number;
  y: number;
  text: string;
}

/** Rough size of an 8px tag: pixels per character plus padding, and the height. */
const CHAR_W = 5;
const TAG_PAD = 4;
export const TAG_H = 11;

const widthOf = (text: string): number => text.length * CHAR_W + TAG_PAD;

/**
 * One tag per object: two tags with the same text whose anchors are within
 * `near` pixels (the two tiles of a market stall or a desk) become one, placed
 * midway. Order is kept.
 */
export function mergeTags(tags: LabelTag[], near: number): LabelTag[] {
  const out: LabelTag[] = [];
  const count: number[] = [];
  for (const t of tags) {
    const i = out.findIndex(
      (o) =>
        o.text === t.text &&
        Math.abs(o.x - t.x) <= near &&
        Math.abs(o.y - t.y) <= near,
    );
    if (i < 0) {
      out.push({ ...t });
      count.push(1);
    } else {
      const n = count[i]!;
      out[i]!.x = (out[i]!.x * n + t.x) / (n + 1);
      out[i]!.y = (out[i]!.y * n + t.y) / (n + 1);
      count[i] = n + 1;
    }
  }
  return out;
}

/**
 * Stack overlapping tags so each stays readable: in order, a tag that would
 * overlap one already placed moves up by a tag height until it is clear.
 * Returns the y offsets to add (zero or negative), in the input order.
 */
export function stackOffsets(tags: LabelTag[]): number[] {
  const placed: { x: number; y: number; w: number }[] = [];
  return tags.map((t) => {
    const w = widthOf(t.text);
    let y = t.y;
    for (let guard = 0; guard < 20; guard++) {
      const hit = placed.find(
        (p) => Math.abs(p.x - t.x) < (p.w + w) / 2 && Math.abs(p.y - y) < TAG_H,
      );
      if (!hit) break;
      y = hit.y - TAG_H;
    }
    placed.push({ x: t.x, y, w });
    return y - t.y;
  });
}

/** A person for the name tag rule: id and tile. */
export interface TagPerson {
  id: string;
  x: number;
  y: number;
}

/** Crowds above this many people show only the nearest few name tags. */
export const CROWD = 8;
/** How many tags a crowd shows, besides the people always named. */
export const CROWD_TAGS = 4;

/**
 * Which people get a name tag. A small group (up to CROWD) is all named. In a
 * crowd, such as the Midwinter Feast rows, only the CROWD_TAGS people nearest
 * the player (ties by id, so it is deterministic) and anyone in `always` (the
 * gift recipient, the person last talked to) are named; walking closer names
 * the rest. Names of people who stand a tile apart would otherwise overlap.
 */
export function taggedIds(
  people: TagPerson[],
  player: { x: number; y: number },
  always: ReadonlySet<string> = new Set(),
): Set<string> {
  if (people.length <= CROWD) return new Set(people.map((p) => p.id));
  const d = (p: TagPerson): number =>
    (p.x - player.x) ** 2 + (p.y - player.y) ** 2;
  const near = [...people]
    .sort((a, b) => d(a) - d(b) || a.id.localeCompare(b.id))
    .slice(0, CROWD_TAGS)
    .map((p) => p.id);
  return new Set([
    ...near,
    ...people.filter((p) => always.has(p.id)).map((p) => p.id),
  ]);
}
