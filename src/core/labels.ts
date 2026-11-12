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
  ferry: "Ferry to the Lake cove",
  delta: "River delta",
  fisher: "Fisher's hut",
  forge: "Forge",
  farmstead: "Farmstead",
  hermit: "Hermit's tower",
  elf: "Thalwen's cottage",
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
  dummy: "Dummy",
  lift: "Lift",
  stairs: "Stairs",
  "cave-dehydrator": "Dehydrator",
  "mushroom-box": "Mushroom Box",
  "camp-chest": "Camp Chest",
  orders: "Orders Board",
  requests: "Request Board",
  "board-news": "Road News Board",
  trader: "Road Trader",
  festival: "Village Green",
  "festival-leave": "Way Home",
  "cake-table": "Cake Table",
  "hedge-chest": "Chest",
  "hedge-cart": "Cart Home",
  cart: "Cart",
  "herb-stall": "Herb Stall",
  "fisher-shop": "Fisher's Counter",
  "pin-stall": "Thalwen's Pin Stall",
  stonekeeper: "Stonekeeper",
  keeper: "Keeper's Counter",
  hermit: "Hermit",
  "spirit-statue": "Spirit's Stone",
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
    return id.startsWith("scare") ? "Decoration" : "Villager";
  return SERVICES[kind];
}

/**
 * What the Outpost's road news board says until its system exists (note 57,
 * built as a stand-in by Hearthwell part 1). Keyed by service kind. The
 * Special Orders board beside it is the working `orders` service.
 */
export const BOARD_LINES: Record<string, string> = {
  "board-news": "The road news board. Nothing is posted yet.",
};

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
  BOARD_LINES[kind] ?? COUNTER_LINES[kind];
