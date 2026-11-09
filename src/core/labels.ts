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
  to_farm: "Farm",
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
  trainer: "Trainer",
  dummy: "Dummy",
  lift: "Lift",
  stairs: "Stairs",
  "cave-dehydrator": "Dehydrator",
  "mushroom-box": "Mushroom Box",
  "camp-chest": "Camp Chest",
  orders: "Orders Board",
  requests: "Request Board",
  festival: "Village Green",
  "festival-leave": "Way Home",
  "hedge-chest": "Chest",
  "hedge-cart": "Cart Home",
};

/** Festival map counters and villagers share kinds, so they are named by id. */
const FESTIVAL_BY_ID: Record<string, string> = {
  table: "Display Table",
  judge: "Judge",
  prizes: "Prize Counter",
  booth: "Booth",
};

/** Hall counters share the kind "hall", so they are named by id. */
const HALL: Record<string, string> = {
  "foragers-shelf": "Forager's Shelf",
  larder: "Larder",
  hearth: "Hearth",
  "last-seat": "Last Seat",
  "water-room": "Water Room",
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
