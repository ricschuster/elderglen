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
};

const SERVICES: Record<string, string> = {
  shop: "Shop",
  bin: "Shipping Bin",
  furnace: "Furnace",
  bed: "Bed",
  carpenter: "Carpenter",
  smith: "Smith",
  lift: "Lift",
  stairs: "Stairs",
  "cave-dehydrator": "Dehydrator",
  "mushroom-box": "Mushroom Box",
  "camp-chest": "Camp Chest",
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
  return kind === "hall" ? HALL[id] : SERVICES[kind];
}
