import type { ParsedAddress } from "./address";

/** One game on the network, as announced by a host (discovery, note 53). */
export interface GameEntry {
  id: string;
  name: string;
  host: string;
  port: number;
  players: number;
  maxPlayers: number;
  /** Protocol version; a mismatch is refused with a plain message. */
  version: number;
  /** Time of the last announcement, ms. */
  seen: number;
}

/** A game that has not announced for this long drops off the list. */
export const GAME_STALE_MS = 6000;

/** Add or refresh a game by id. Returns a new list. */
export function mergeAnnouncement(
  list: GameEntry[],
  g: GameEntry,
): GameEntry[] {
  return [...list.filter((e) => e.id !== g.id), g];
}

/** Drop stale games and sort by name, then id. */
export function visibleGames(list: GameEntry[], now: number): GameEntry[] {
  return list
    .filter((e) => now - e.seen <= GAME_STALE_MS)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export type GameStatus = "open" | "full" | "wrong-version";

export function gameStatus(g: GameEntry, ourVersion: number): GameStatus {
  if (g.version !== ourVersion) return "wrong-version";
  return g.players >= g.maxPlayers ? "full" : "open";
}

export function gameLabel(g: GameEntry, ourVersion: number): string {
  const s = gameStatus(g, ourVersion);
  const tail =
    s === "wrong-version"
      ? "different version"
      : s === "full"
        ? "full"
        : `${g.players} of ${g.maxPlayers} players`;
  return `${g.name} (${tail})`;
}

export type FailKind =
  "unreachable" | "timeout" | "wrong-version" | "full" | "refused" | "isolated";

/** Plain wording for a failed join. Placeholder text. */
export function failMessage(kind: FailKind): string {
  switch (kind) {
    case "unreachable":
      return "Could not reach the host. Check the address, and that the host's game is open on the same network.";
    case "timeout":
      return "The host did not answer in time. It may be asleep or too far away.";
    case "isolated":
      return "Your network may keep devices apart (client isolation). Ask the host to try the same network, or turn that setting off on the router.";
    case "wrong-version":
      return "The host runs a different version of the game. Update both to the same version.";
    case "full":
      return "That game is full.";
    case "refused":
      return "The host did not let you in.";
  }
}

export type JoinState =
  | { phase: "idle" }
  | { phase: "connecting"; target: string }
  | { phase: "joined"; target: string }
  | { phase: "failed"; kind: FailKind; message: string };

export type JoinEvent =
  | { type: "start"; address: ParsedAddress }
  | { type: "connected" }
  | { type: "fail"; kind: FailKind }
  | { type: "cancel" };

/** The join state machine. Events that do not fit the phase are ignored. */
export function joinStep(s: JoinState, e: JoinEvent): JoinState {
  switch (e.type) {
    case "start":
      if (s.phase === "connecting" || s.phase === "joined") return s;
      if (!e.address.ok)
        return {
          phase: "failed",
          kind: "unreachable",
          message: e.address.reason,
        };
      return { phase: "connecting", target: e.address.url };
    case "connected":
      return s.phase === "connecting"
        ? { phase: "joined", target: s.target }
        : s;
    case "fail":
      return s.phase === "connecting"
        ? { phase: "failed", kind: e.kind, message: failMessage(e.kind) }
        : s;
    case "cancel":
      return s.phase === "connecting" ? { phase: "idle" } : s;
  }
}
