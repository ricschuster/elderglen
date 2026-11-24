// The festival gate (note 111, decisions 1 to 3): a festival goes ahead only when every present player has
// entered it, and ends when every player inside has chosen to leave or a main event that ends it finishes.
// Host state for one festival day, never saved. Free of Phaser and the DOM.
import type { PlayerId } from "./players";

/** What every player is told about the day's festival gate (sent as part of the `festival` message). */
export interface GateView {
  /** The festival id, or empty when there is none today. */
  id: string;
  /** The game day the view is for. */
  day: number;
  /** Every present player has entered: the clock stands still on a festival map. */
  ahead: boolean;
  /** The festival is over: everyone goes back where they came in, the clock is at its end. */
  ended: boolean;
  /** Ids of the players who have entered. */
  entered: PlayerId[];
  /** Ids of the players who chose to leave. */
  leaving: PlayerId[];
  /** The line players inside read, or empty. */
  line: string;
}

/** "Ada", "Ada and Bram", "Ada, Bram and Cy". */
export function nameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The line a player who is in reads while others have yet to come (decision 1). */
export const waitingToEnterLine = (names: string[]): string =>
  `Waiting for ${nameList(names)}.`;

/** The line a player who chose to leave reads at the exit (decision 3). */
export const WAITING_TO_LEAVE = "Waiting for the others to leave.";

export class FestivalGate {
  readonly entered = new Set<PlayerId>();
  readonly leaving = new Set<PlayerId>();
  ahead = false;
  ended = false;

  constructor(
    readonly festivalId: string,
    readonly day: number,
  ) {}

  /** Players still to enter, while the festival has not gone ahead. */
  waitingToEnter(present: PlayerId[]): PlayerId[] {
    return this.ahead ? [] : present.filter((p) => !this.entered.has(p));
  }

  /** Players inside who have not chosen to leave, once the festival is on. */
  waitingToLeave(present: PlayerId[]): PlayerId[] {
    if (!this.ahead || this.ended) return [];
    return present.filter((p) => this.entered.has(p) && !this.leaving.has(p));
  }

  /** A player walks in. Refused once it is over. A later arrival walks straight in (the clock already stands still). */
  enter(id: PlayerId, present: PlayerId[]): string | undefined {
    if (this.ended) return "The festival is over for today.";
    this.entered.add(id);
    this.leaving.delete(id);
    this.refresh(present);
    return undefined;
  }

  /** A player chooses to leave. They must be inside, with the festival on. */
  leave(id: PlayerId, present: PlayerId[]): string | undefined {
    if (this.ended) return "The festival is over for today.";
    if (!this.entered.has(id)) return "You have not gone in.";
    if (!this.ahead) return "The others have not all come in yet.";
    this.leaving.add(id);
    this.refresh(present);
    return undefined;
  }

  /** A player stepped back out before it began (a map change), so they count as not entered. */
  withdraw(id: PlayerId, present: PlayerId[]): void {
    if (this.ahead || this.ended) return;
    this.entered.delete(id);
    this.refresh(present);
  }

  /** A main event that ends the festival finished (the hunt, the contest): everyone goes home. */
  finish(): void {
    this.ended = true;
  }

  /**
   * Re-judge the gate for the players who are present now (a guest dropped or joined, someone entered or left).
   * A dropped guest does not count as present (note 53).
   */
  refresh(present: PlayerId[]): void {
    if (this.ended) return;
    if (!this.ahead) {
      this.ahead =
        present.length > 0 && present.every((p) => this.entered.has(p));
      return;
    }
    const inside = present.filter((p) => this.entered.has(p));
    if (inside.every((p) => this.leaving.has(p))) this.ended = true;
  }

  view(present: PlayerId[], name: (id: PlayerId) => string): GateView {
    const wait = this.waitingToEnter(present);
    const out = this.waitingToLeave(present);
    return {
      id: this.festivalId,
      day: this.day,
      ahead: this.ahead,
      ended: this.ended,
      entered: [...this.entered],
      leaving: [...this.leaving],
      line:
        wait.length > 0
          ? waitingToEnterLine(wait.map(name))
          : out.length > 0 && this.leaving.size > 0
            ? WAITING_TO_LEAVE
            : "",
    };
  }
}
