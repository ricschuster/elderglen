// Game list discovery by UDP broadcast (note 53, ADR 0015). A host sends one small JSON
// datagram every ANNOUNCE_MS; a listener turns each into a GameEntry, taking the host's
// address from the datagram's source. Pure: no sockets here, so it is unit tested.
import { PROTOCOL_VERSION } from "../core/protocol";
import type { GameEntry } from "./lobby";

/** Not 24642: that is Stardew's game port, and a Stardew host on the same network must not clash. */
export const DISCOVERY_PORT = 24650;
export const ANNOUNCE_MS = 2000;
const APP = "elderglen";
const MAX_DATAGRAM = 512;

export interface Announcement {
  /** Random per hosting session, so a restarted host is a new entry. */
  id: string;
  name: string;
  /** The WebSocket port guests connect to. */
  port: number;
  players: number;
  maxPlayers: number;
}

export function encodeAnnounce(a: Announcement): string {
  return JSON.stringify({ app: APP, v: PROTOCOL_VERSION, ...a });
}

/** A datagram from `from` (an IPv4 address) as a game, or undefined when it is not ours or is malformed. */
export function parseAnnounce(
  text: string,
  from: string,
  now: number,
): GameEntry | undefined {
  if (text.length > MAX_DATAGRAM) return undefined;
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  if (typeof m !== "object" || m === null || m.app !== APP) return undefined;
  const { id, name, port, players, maxPlayers, v } = m;
  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof v !== "number" ||
    !isCount(port, 65535) ||
    !isCount(players, 99) ||
    !isCount(maxPlayers, 99) ||
    port < 1 ||
    id.length === 0 ||
    id.length > 40
  )
    return undefined;
  return {
    id,
    name: name.slice(0, 40),
    host: from,
    port,
    players,
    maxPlayers,
    version: v,
    seen: now,
  };
}

function isCount(x: unknown, max: number): x is number {
  return Number.isInteger(x) && (x as number) >= 0 && (x as number) <= max;
}
