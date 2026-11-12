import data from "../content/gates.json";
import { villagerById } from "./villagers";

/**
 * Gated interior doors (notes 61 decision 6 and 86). A `gate` object on a map
 * carries `friendship:<slug>:<hearts>`; the tiles it covers are shut until
 * the player has that many hearts with the person (or one of the couple) the
 * slug names on that map (`content/gates.json`). Pure: no Phaser, no DOM.
 */

export interface GateRule {
  slug: string;
  hearts: number;
}

/** Parse `friendship:<slug>:<hearts>`; undefined for anything else. */
export function parseGate(text: string | undefined): GateRule | undefined {
  if (!text) return undefined;
  const m = /^friendship:([a-z0-9-]+):(\d+)$/.exec(text);
  if (!m) return undefined;
  return { slug: m[1]!, hearts: Number(m[2]) };
}

const owners = data as unknown as Record<string, Record<string, string[]>>;

/** The people whose hearts open the gate on this map, in the data's order. */
export function gateOwners(mapId: string, slug: string): string[] {
  return owners[mapId]?.[slug] ?? [];
}

/** True when any owner has the hearts. A gate with no owner listed stays shut. */
export function gateOpen(
  mapId: string,
  rule: GateRule,
  heartsOf: (villagerId: string) => number,
): boolean {
  return gateOwners(mapId, rule.slug).some((id) => heartsOf(id) >= rule.hearts);
}

/** The line shown at a shut gate: names the person, or the first of a couple. */
export function gateShutLine(mapId: string, rule: GateRule): string {
  const names = gateOwners(mapId, rule.slug)
    .map((id) => villagerById(id)?.name)
    .filter((n): n is string => n !== undefined);
  const who =
    names.length === 0
      ? "someone"
      : names.length === 1
        ? names[0]!
        : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
  const h = rule.hearts === 1 ? "heart" : "hearts";
  return `This is a private room. Get to know ${who} better first (${rule.hearts} ${h}).`;
}
