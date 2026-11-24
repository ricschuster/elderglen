// The farm map with guests' cabins on it (note 110): a blocked footprint, a door to the owner's home instance and
// a mailbox beside it. Free of Phaser and the DOM.
import { cabinDoorTile, cabinMailboxTile, cabinRect } from "./cabins";
import { homeMapId } from "./homes";
import type { FarmMap } from "./map";
import type { GameState } from "./save";

/** The id of a cabin's door exit and of its mailbox service, from the owner's player id. */
export const cabinExitId = (owner: string): string => `cabin-${owner}`;
export const cabinMailboxId = (owner: string): string => `mailbox-${owner}`;

/** The player id in a cabin exit or cabin mailbox id, or undefined for any other id. */
export function cabinOwnerOfId(id: string): string | undefined {
  if (id.startsWith("cabin-")) return id.slice(6);
  if (id.startsWith("mailbox-")) return id.slice(8);
  return undefined;
}

/** The farm map with every occupied cabin standing on it. Free cabins are built but have no door yet. */
export function mapWithCabins(g: GameState, map: FarmMap): FarmMap {
  const cabins = (g.cabins?.cabins ?? []).filter((c) => c.ownerKey !== null);
  return map.withCabins(
    cabins.map((c) => {
      const door = cabinDoorTile(c);
      const owner = c.ownerKey!;
      return {
        rect: cabinRect(c),
        door,
        exit: {
          id: cabinExitId(owner),
          x: door.x,
          y: door.y,
          w: 1,
          h: 1,
          map: homeMapId(owner),
          entry: "door",
        },
        mailbox: {
          id: cabinMailboxId(owner),
          kind: "mailbox",
          ...cabinMailboxTile(c),
        },
      };
    }),
  );
}
