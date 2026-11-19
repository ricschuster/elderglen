// Shared day end for 2 to 8 players (note 53, "Shared day end", step 5). Pure rules and a small
// tracker the host's RoomWorld adapter calls. Free of Phaser and the DOM. The pass-out cost itself
// is the single player cost in sleep.ts; this file only says who passes out and when the day ends.
import { LOCAL_PLAYER, type PlayerId } from "./players";

/** Placeholder numbers (note 53). */
export const DAY_END = {
  /** Real ms the day waits after the last awake player gets in bed, so the others see the "all asleep" notice. */
  settleMs: 1500,
  /** Real ms a lone awake player is told "everyone else is in bed" before nothing changes. Display only. */
  nagAfterMs: 30_000,
} as const;

export type Presence = "awake" | "asleep" | "dropped";

export interface DayEndPlayer {
  id: PlayerId;
  presence: Presence;
}

export type DayEndReason = "all-asleep" | "limit";

export interface DayEndDecision {
  end: boolean;
  reason?: DayEndReason;
  /** Connected players still up (the "who is left" list shown to everyone). */
  waiting: PlayerId[];
  /** Players in bed. */
  asleep: PlayerId[];
  /** Awake at the limit: they pass out with the single player cost. Empty unless reason is "limit". */
  passOut: PlayerId[];
  /** Dropped guests: counted as in bed, character put in their cabin. Never block the day. */
  dropped: PlayerId[];
}

/**
 * Decide whether the day ends now. The day ends when every connected player is in bed, or when
 * the day limit is reached (whoever is awake passes out). A dropped guest is ignored for the
 * test, so a day with only the host connected ends when the host sleeps. The host is always
 * counted: with nobody connected (cannot happen in a Room) the day does not end by bed.
 */
export function evaluateDayEnd(
  players: readonly DayEndPlayer[],
  limitReached: boolean,
): DayEndDecision {
  const waiting = players
    .filter((p) => p.presence === "awake")
    .map((p) => p.id);
  const asleep = players
    .filter((p) => p.presence === "asleep")
    .map((p) => p.id);
  const dropped = players
    .filter((p) => p.presence === "dropped")
    .map((p) => p.id);
  const connected = waiting.length + asleep.length;
  if (limitReached)
    return {
      end: true,
      reason: "limit",
      waiting,
      asleep,
      passOut: waiting,
      dropped,
    };
  if (connected > 0 && waiting.length === 0)
    return {
      end: true,
      reason: "all-asleep",
      waiting,
      asleep,
      passOut: [],
      dropped,
    };
  return { end: false, waiting, asleep, passOut: [], dropped };
}

/** True when a rejoining guest needs the whole farm: the day changed while they were away. */
export function needsFullSnapshot(
  seenDay: number,
  currentDay: number,
): boolean {
  return seenDay !== currentDay;
}

/**
 * Tracks who is in bed during one day. The host calls `setAsleep`, `wake`, `drop` and `rejoin`
 * as events arrive and `check` every tick. When `check` reports an end it also resets for the
 * next day (everyone awake, dropped guests stay dropped and count as in bed).
 */
export class DayEndTracker {
  private readonly state = new Map<PlayerId, Presence>();
  private settle = 0;
  private lone = 0;

  constructor(
    ids: readonly PlayerId[] = [LOCAL_PLAYER],
    /** Called once when the day ends, with the decision. The adapter runs sleep() for the world. */
    private readonly onEnd?: (d: DayEndDecision) => void,
  ) {
    for (const id of ids) this.state.set(id, "awake");
  }

  /** A player record exists (host at start, guest on first join). They start awake. */
  add(id: PlayerId): void {
    if (!this.state.has(id)) this.state.set(id, "awake");
  }

  presence(id: PlayerId): Presence | undefined {
    return this.state.get(id);
  }

  setAsleep(id: PlayerId): void {
    if (this.state.get(id) === "awake") this.state.set(id, "asleep");
  }

  /** Got out of bed before the day ended (a guest may cancel; the host's bed prompt is their call). */
  wake(id: PlayerId): void {
    if (this.state.get(id) === "asleep") {
      this.state.set(id, "awake");
      this.settle = 0;
    }
  }

  /** The guest disconnected. Counts as in bed, so they never block the day. The host cannot drop. */
  drop(id: PlayerId): void {
    if (id === LOCAL_PLAYER || !this.state.has(id)) return;
    this.state.set(id, "dropped");
  }

  /** The guest rejoined: awake in their cabin, record restored by id. Returns false if unknown. */
  rejoin(id: PlayerId): boolean {
    if (this.state.get(id) !== "dropped") return this.state.has(id);
    this.state.set(id, "awake");
    this.settle = 0;
    return true;
  }

  list(): DayEndPlayer[] {
    return [...this.state].map(([id, presence]) => ({ id, presence }));
  }

  /** Seconds-free view for the "who is left" notice. */
  decision(limitReached = false): DayEndDecision {
    return evaluateDayEnd(this.list(), limitReached);
  }

  /**
   * Step by real ms. Returns the decision when the day ends this call, else undefined.
   * An all-asleep end waits `settleMs` of steady all-asleep first; the limit ends at once.
   */
  check(dtMs: number, limitReached: boolean): DayEndDecision | undefined {
    const d = this.decision(limitReached);
    if (!d.end) {
      this.settle = 0;
      this.lone =
        d.waiting.length === 1 && d.asleep.length > 0 ? this.lone + dtMs : 0;
      return undefined;
    }
    if (d.reason === "all-asleep") {
      this.settle += dtMs;
      if (this.settle < DAY_END.settleMs) return undefined;
    }
    this.reset();
    this.onEnd?.(d);
    return d;
  }

  /** True once a lone awake player has held up everyone else for `nagAfterMs` (a display hint). */
  get loneHoldout(): boolean {
    return this.lone >= DAY_END.nagAfterMs;
  }

  private reset(): void {
    this.settle = 0;
    this.lone = 0;
    for (const [id, p] of this.state)
      if (p !== "dropped") this.state.set(id, "awake");
  }
}
