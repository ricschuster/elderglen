import data from "../content/shrine.json";
import { dateOf } from "./calendar";
import { COUNTERS } from "./completion";
import { DIAMOND } from "./gems";
import { HEARTHSILVER_ORE } from "./ore";
import { MAX_LEVEL, SKILLS } from "./skills";
import { festivalDayToday } from "./festivals";
import type { LetterDef } from "./mail";
import { FRIEND_IDS } from "./friendship";
import { villagerById } from "./villagers";
import type { GameState } from "./save";

/**
 * The ancestors' shrine and the evaluation (`docs/design/83_grandpa_shrine.md`).
 * The score counts our own milestones, candles light by it (1 to 4), the first
 * scene plays once at the start of year 3 and a Diamond placed at the shrine
 * redoes it in one line. At four candles the stone gives 2 to 8 Hearthsilver
 * ore a day. The evaluation only rewards: candles never go down. Pure rules.
 * Content is `src/content/shrine.json`; every line is placeholder text.
 */
export const SHRINE = data;
export const SHRINE_SERVICE = "shrine";
export const MAX_CANDLES = 4;

export interface ScoreRow {
  id: string;
  name: string;
  points: number;
  max: number;
}

export interface Score {
  total: number;
  max: number;
  rows: ScoreRow[];
}

const steps = (n: number, list: readonly number[]): number =>
  list.filter((t) => n >= t).length;

const complete = (counter: string, g: GameState): boolean => {
  const c = COUNTERS[counter]?.(g);
  return !!c && c.total > 0 && c.done >= c.total;
};

/** Friends who are not children and stand at the full 8 hearts (2000 points at 250 a heart is the test). */
export function friendsAtHearts(g: GameState): number {
  return FRIEND_IDS.filter(
    (id) =>
      villagerById(id)?.ageBand !== "child" &&
      // Rows about one player use the best player (note 53): the best friend counts for the farm.
      g.players
        .each()
        .some((p) => p.friendship.hearts(id) >= data.friendHearts),
  ).length;
}

/** The score, row by row. The note's points (placeholders). */
export function shrineScore(g: GameState): Score {
  const earned = g.cave.earnings;
  const levels = SKILLS.reduce(
    (n, s) => n + Math.min(g.skills.level(s), MAX_LEVEL),
    0,
  );
  const friends = friendsAtHearts(g);
  const rows: ScoreRow[] = [
    {
      id: "earnings",
      name: "Gold earned",
      points:
        steps(earned, data.earningsSteps) +
        (earned >= data.earningsTop ? 2 : 0),
      max: data.earningsSteps.length + 2,
    },
    {
      id: "skills",
      name: "Skills",
      points:
        (levels >= data.skillTotal ? 1 : 0) +
        (SKILLS.every((s) => g.skills.level(s) >= MAX_LEVEL) ? 1 : 0),
      max: 2,
    },
    {
      id: "fish",
      name: "Fish",
      points: complete("fish", g) ? 1 : 0,
      max: 1,
    },
    {
      id: "shipped",
      name: "Shipped",
      points: complete("shipped", g) ? 1 : 0,
      max: 1,
    },
    {
      id: "cooking",
      name: "Cooking",
      points: complete("cooking", g) ? 1 : 0,
      max: 1,
    },
    {
      id: "friends",
      name: "Friends",
      points: steps(friends, data.friendSteps),
      max: data.friendSteps.length,
    },
    {
      id: "hall",
      name: "Hall",
      points: (complete("bundles", g) ? 1 : 0) + (g.endSeen ? 2 : 0),
      max: 3,
    },
    {
      id: "deepmark",
      name: "Deepmark key",
      points: g.mines.campOpenedOn(120) ? 1 : 0,
      max: 1,
    },
    {
      id: "slayer",
      name: "Slayer",
      points: complete("slayer", g) ? 1 : 0,
      max: 1,
    },
    {
      id: "summit",
      name: "Summit",
      points: g.achievements.has("summit") ? 1 : 0,
      max: 1,
    },
    {
      id: "boost",
      name: "Rare boost items",
      points: complete("elderfruit", g) ? 1 : 0,
      max: 1,
    },
  ];
  return {
    total: rows.reduce((n, r) => n + r.points, 0),
    max: rows.reduce((n, r) => n + r.max, 0),
    rows,
  };
}

/** Candles for a score: 1 at 0 to 3, 2 at 4 to 7, 3 at 8 to 11, 4 at 12 or more. */
export function candlesFor(points: number): number {
  return Math.max(1, steps(points, data.candleCuts));
}

export interface ShrineSave {
  candles: number;
  pending: boolean;
  seen: boolean;
  statueDay: number;
}

const name = (): string => data.playerName;
const say = (s: string): string => s.replace(/\{name\}/g, name());

/** What the shrine remembers: the lit candles, the scene owed or played, the statue's day. */
export class Shrine {
  /** The candles lit, 0 before the first evaluation. Never lowered. */
  candles = 0;
  /** The year 3 scene is owed. */
  pending = false;
  /** The first scene has been played. */
  seen = false;
  /** The day the statue was last used, 0 if never. */
  statueDay = 0;

  get statueOpen(): boolean {
    return this.candles >= MAX_CANDLES;
  }

  /**
   * Called each morning. True on the morning the scene becomes owed: year 3 or
   * later, not played, and the day is free of a festival and a wedding.
   */
  callToday(g: GameState): boolean {
    if (this.seen || this.pending) return false;
    const day = g.day.clock.day;
    if (dateOf(day).year < data.firstYear) return false;
    if (festivalDayToday(day) !== undefined || g.marriage.weddingToday(day))
      return false;
    this.pending = true;
    return true;
  }

  save(): ShrineSave {
    return {
      candles: this.candles,
      pending: this.pending,
      seen: this.seen,
      statueDay: this.statueDay,
    };
  }

  load(raw: unknown): void {
    const r = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<
      Record<keyof ShrineSave, unknown>
    >;
    const n = (v: unknown): number =>
      typeof v === "number" && Number.isFinite(v)
        ? Math.max(0, Math.floor(v))
        : 0;
    this.candles = Math.min(n(r.candles), MAX_CANDLES);
    this.seen = r.seen === true;
    this.pending = r.pending === true && !this.seen;
    this.statueDay = n(r.statueDay);
  }
}

/** Score the farm and light the candles. They only go up. Returns the count now lit. */
export function evaluate(g: GameState): number {
  const lit = candlesFor(shrineScore(g).total);
  g.shrine.candles = Math.max(g.shrine.candles, lit);
  return g.shrine.candles;
}

export interface ShrineBeat {
  speaker: string;
  role: string;
  text: string;
  /** Candles lit when this line has been said. */
  lit: number;
}

/** The long first scene for a number of candles: the three ancestors, then the closing line. */
export function firstSceneBeats(candles: number): ShrineBeat[] {
  const person = (id: string) =>
    (data.ancestors as Record<string, { name: string; role: string }>)[id]!;
  const make = (
    l: { speaker: string; text: string },
    lit: number,
  ): ShrineBeat => ({
    speaker: person(l.speaker).name,
    role: person(l.speaker).role,
    text: say(l.text),
    lit,
  });
  const beats = data.firstScene.map((l, i) =>
    make(l, Math.min(i + 1, candles, MAX_CANDLES - 1)),
  );
  beats.push(
    candles >= MAX_CANDLES
      ? make(data.lastFull, MAX_CANDLES)
      : make(data.lastShort, Math.min(candles, MAX_CANDLES - 1)),
  );
  return beats;
}

/** The one line of a redo. */
export function redoLine(candles: number): string {
  return say(candles >= MAX_CANDLES ? data.redoFull : data.redoShort);
}

/** Oriel's letter, due the morning after the first scene. */
export function orielLetter(): LetterDef {
  const l = data.letter;
  return {
    id: l.id,
    sender: l.sender,
    title: l.title,
    body: say(l.body),
    trigger: { kind: "first-achievement" },
  };
}

/**
 * The first scene has been played: the evaluation is done, the scene is
 * cleared, and Oriel's letter is queued for tomorrow. Returns the candles.
 */
export function finishFirstScene(g: GameState): number {
  const lit = evaluate(g);
  g.shrine.pending = false;
  g.shrine.seen = true;
  g.mail.queue(data.letter.id, g.day.clock.day + 1, orielLetter());
  return lit;
}

/** True when the pack holds a Diamond. */
export const hasDiamond = (g: GameState): boolean =>
  g.inventory.count(DIAMOND.id) > 0;

export type Placement =
  { ok: false; reason: string } | { ok: true; candles: number; line: string };

/** Set a Diamond in the shrine: it is used up, the candles are scored again, one line comes. */
export function placeDiamond(g: GameState): Placement {
  if (!hasDiamond(g)) return { ok: false, reason: "You have no Diamond." };
  g.inventory.remove(DIAMOND.id, 1);
  const candles = evaluate(g);
  return { ok: true, candles, line: redoLine(candles) };
}

/** The note and the state of the stone when nothing is set in it. */
export function shrineNote(g: GameState): string {
  if (g.shrine.seen) return data.notes.after;
  return dateOf(g.day.clock.day).year < data.firstYear
    ? data.notes.before
    : data.notes.waiting;
}

/**
 * Use the statue by hand: 2 to 8 Hearthsilver ore, once a day, at four candles.
 * `random` is a unit draw. The words come back either way.
 */
export function useStatue(g: GameState, random: () => number): string {
  if (!g.shrine.statueOpen) return shrineNote(g);
  const day = g.day.clock.day;
  if (g.shrine.statueDay === day) return data.statueUsed;
  const { min, max } = data.statue;
  const n = min + Math.min(Math.floor(random() * (max - min + 1)), max - min);
  if (!g.inventory.add(HEARTHSILVER_ORE, n)) return "Your pack is full.";
  g.shrine.statueDay = day;
  return `${data.statueLine} (${n} Hearthsilver ore)`;
}

/** What an Action at the shrine would do with this held item (note 83): set the Diamond, use the open statue, or read the note. Changes nothing. */
export type ShrineStep = "diamond" | "statue" | "note";

export function shrineStep(g: GameState, held: string | undefined): ShrineStep {
  if (held === DIAMOND.id && hasDiamond(g)) return "diamond";
  return g.shrine.statueOpen && g.shrine.statueDay !== g.day.clock.day
    ? "statue"
    : "note";
}

/**
 * The shrine's two changes as one action for a player (note 108 group 5): `diamond` sets a Diamond from their pack,
 * otherwise the open statue gives its ore to their pack. The ore count is drawn from the day, not from chance, so
 * the host's copy and every guest's copy agree. Returns the refusal, or undefined when it worked.
 */
export function shrineAct(g: GameState, diamond: boolean): string | undefined {
  if (diamond) {
    const r = placeDiamond(g);
    return r.ok ? undefined : r.reason;
  }
  if (!g.shrine.statueOpen) return shrineNote(g);
  const day = g.day.clock.day;
  if (g.shrine.statueDay === day) return useStatue(g, () => 0);
  const text = useStatue(g, () => ((day * 7919) % 100) / 100);
  return g.shrine.statueDay === day ? undefined : text;
}
