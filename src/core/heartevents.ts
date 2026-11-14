import villagerData from "../content/villagers.json";
import { BUNDLES } from "./bundles";
import { WEEKDAYS, dateOf, type Season } from "./calendar";
import { dishById } from "./dishes";
import { festivalDayToday } from "./festivals";
import { furnitureById } from "./furniture";
import { hatById } from "./hats";
import { itemById } from "./items";
import { letterById, type LetterDef } from "./mail";
import type { GameState } from "./save";
import {
  dayContext,
  parseTime,
  planDay,
  splitPlace,
  villagerById,
} from "./villagers";
import type { Weather } from "./weather";

/**
 * Heart events (`docs/design/62_heart_events.md`, #600 slice 1). Pure rules:
 * which events are due, the once-only seen record, the scene command list and
 * its validator. The scene RUNNER (camera, sprites) is not here and is a later
 * slice, so a scene is data only. Event data is one file per person in `src/content/heart-events/`.
 *
 * Open points, all placeholders: stage marks, paths, poses and music ids are not checked (no per-map stage
 * data exists yet); `rise` is recorded and not yet read by friendship.
 */

// ---- Scene commands (note 62 table) ----------------------------------------

export type Cmd =
  | { cmd: "place"; who: string; mark: string }
  | { cmd: "walk"; who: string; path: string }
  | { cmd: "face"; who: string; toward: string }
  | { cmd: "pose"; who: string; pose: string }
  | { cmd: "hide"; who: string }
  | { cmd: "show"; who: string }
  | { cmd: "pan"; to: string }
  | { cmd: "hold"; ms: number }
  | { cmd: "zoom"; scale: number }
  | { cmd: "snap" }
  | { cmd: "say"; who: string; line: string; portrait?: string }
  | { cmd: "emote"; who: string; emote: string }
  | { cmd: "choose"; answers: { line: string; goto: string }[] }
  | { cmd: "wait"; ms: number }
  | { cmd: "label"; name: string }
  | { cmd: "jump"; to: string }
  | {
      cmd: "if";
      flag?: string;
      hearts?: { who: string; atLeast: number };
      goto: string;
    }
  | { cmd: "end" }
  | { cmd: "music"; action: "play" | "change" | "stop"; id?: string }
  | { cmd: "sfx"; id: string }
  | { cmd: "fade"; to: "black" | "clear" }
  | { cmd: "shake"; ms: number }
  | { cmd: "tint"; color: string }
  | { cmd: "weather"; kind: string }
  | { cmd: "setFlag"; flag: string }
  | {
      cmd: "give";
      item?: string;
      count?: number;
      recipe?: string;
      furniture?: string;
      hat?: string;
    }
  | { cmd: "rise"; who: string; speed: number }
  | { cmd: "unlockMail"; letter: string };

export type CmdName = Cmd["cmd"];

/** The Result group: switched off on replay (note 62). */
export const RESULT_CMDS: readonly CmdName[] = [
  "give",
  "setFlag",
  "rise",
  "unlockMail",
];

/** The person ids a scene may name besides villagers. */
export const PLAYER = "player";

export interface EventConditions {
  season?: Season;
  weather?: Weather[];
  /** Event ids that must have been seen first (a story that needs an order). */
  after?: string[];
  /** Story flags that must be set. */
  flags?: string[];
  /** A hall bundle that must be complete (a hall milestone). */
  bundle?: string;
}

export interface HeartEvent {
  id: string;
  villager: string;
  /** A place id from `villagers.json` (`hw:store`): the event starts when the player steps there. */
  place: string;
  /** Whole hearts needed. */
  hearts: number;
  conditions?: EventConditions;
  /**
   * When the person stands at the place, "H:MM" game clock (note 84, decision 1).
   * The event starts only inside [from, until). A test checks it overlaps their route.
   */
  window?: { from: string; until: string };
  scene: Cmd[];
}

interface PersonFile {
  lines: Record<string, string>;
  events: HeartEvent[];
}

// One file per person (#873) plus `_shared.json` for flags and emotes.
const files = import.meta.glob<PersonFile>("../content/heart-events/*.json", {
  eager: true,
  import: "default",
});
const shared = files["../content/heart-events/_shared.json"] as unknown as {
  flags: string[];
  emotes: string[];
};
const people = Object.entries(files)
  .filter(([path]) => !path.endsWith("/_shared.json"))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, f]) => f);

export const FLAGS: readonly string[] = shared.flags;
export const EMOTES: readonly string[] = shared.emotes;
export const LINES: Record<string, string> = Object.assign(
  {},
  ...people.map((f) => f.lines),
);
export const HEART_EVENTS: HeartEvent[] = people.flatMap((f) => f.events);

export const eventById = (
  id: string,
  defs: HeartEvent[] = HEART_EVENTS,
): HeartEvent | undefined => defs.find((e) => e.id === id);

// ---- State -----------------------------------------------------------------

export interface HeartEventsSave {
  /** Event id to the day it was first seen. */
  seen: Record<string, number>;
  flags: string[];
  /** The last day an event ran, for the one a day rule. */
  lastDay: number;
  /** Heart speed set by choices, per person (not read yet). */
  speed: Record<string, number>;
}

export class HeartEvents {
  private seenOn = new Map<string, number>();
  private flagSet = new Set<string>();
  private last = 0;
  private speeds = new Map<string, number>();

  seen(id: string): boolean {
    return this.seenOn.has(id);
  }
  seenCount(): number {
    return this.seenOn.size;
  }
  /** Seen events, for the journal's replay list. */
  seenIds(): string[] {
    return [...this.seenOn.keys()];
  }
  hasFlag(f: string): boolean {
    return this.flagSet.has(f);
  }
  setFlag(f: string): void {
    this.flagSet.add(f);
  }
  get lastDay(): number {
    return this.last;
  }
  speedOf(who: string): number {
    return this.speeds.get(who) ?? 1;
  }
  setSpeed(who: string, speed: number): void {
    this.speeds.set(who, speed);
  }
  /** Mark seen. The first sighting keeps its day. */
  mark(id: string, day: number): void {
    if (!this.seenOn.has(id)) this.seenOn.set(id, day);
    this.last = day;
  }

  save(): HeartEventsSave {
    return {
      seen: Object.fromEntries(this.seenOn),
      flags: [...this.flagSet],
      lastDay: this.last,
      speed: Object.fromEntries(this.speeds),
    };
  }

  load(raw: unknown): void {
    this.seenOn.clear();
    this.flagSet.clear();
    this.speeds.clear();
    this.last = 0;
    if (typeof raw !== "object" || raw === null) return;
    const r = raw as Partial<HeartEventsSave>;
    if (typeof r.seen === "object" && r.seen !== null)
      for (const [id, d] of Object.entries(r.seen))
        if (Number.isInteger(d)) this.seenOn.set(id, d);
    if (Array.isArray(r.flags))
      for (const f of r.flags) if (typeof f === "string") this.flagSet.add(f);
    if (Number.isInteger(r.lastDay)) this.last = r.lastDay as number;
    if (typeof r.speed === "object" && r.speed !== null)
      for (const [id, s] of Object.entries(r.speed))
        if (typeof s === "number" && Number.isFinite(s)) this.speeds.set(id, s);
  }
}

// ---- Triggers --------------------------------------------------------------

export interface TriggerContext {
  day: number;
  weather: Weather;
  /** The place id the player has just stepped into, such as `hw:store`. */
  place: string;
  /** Game clock minutes. When given, an event with a `window` starts only inside it. */
  minute?: number;
}

/** Whether a minute of the day is inside an event's window (always true with no window or no minute). */
export function inWindow(e: HeartEvent, minute: number | undefined): boolean {
  if (!e.window || minute === undefined) return true;
  return (
    minute >= parseTime(e.window.from) && minute < parseTime(e.window.until)
  );
}

/** Whether one event's heart level and conditions hold today, ignoring place and the day limits. */
export function conditionsMet(
  g: GameState,
  e: HeartEvent,
  ctx: Pick<TriggerContext, "day" | "weather">,
): boolean {
  if (g.friendship.hearts(e.villager) < e.hearts) return false;
  const c = e.conditions;
  if (!c) return true;
  if (c.season && dateOf(ctx.day).season !== c.season) return false;
  if (c.weather && !c.weather.includes(ctx.weather)) return false;
  if (c.after?.some((id) => !g.heartEvents.seen(id))) return false;
  if (c.flags?.some((f) => !g.heartEvents.hasFlag(f))) return false;
  if (c.bundle && !g.hall.complete(c.bundle)) return false;
  return true;
}

/**
 * The events that start now: the player is in the event's place, it is not
 * seen, its hearts and conditions hold, it is not a festival day, and no event
 * has run today (one a day, note 62). Stable order: data order.
 */
export function dueEvents(
  g: GameState,
  ctx: TriggerContext,
  defs: HeartEvent[] = HEART_EVENTS,
): HeartEvent[] {
  if (g.heartEvents.lastDay === ctx.day) return [];
  if (festivalDayToday(ctx.day)) return [];
  return defs.filter(
    (e) =>
      e.place === ctx.place &&
      inWindow(e, ctx.minute) &&
      !g.heartEvents.seen(e.id) &&
      conditionsMet(g, e, ctx),
  );
}

/** The one event that would start, if any. "Not now" simply does not complete it. */
export function nextEvent(
  g: GameState,
  ctx: TriggerContext,
  defs: HeartEvent[] = HEART_EVENTS,
): HeartEvent | undefined {
  return dueEvents(g, ctx, defs)[0];
}

/** Events waiting to be seen at their heart level and conditions, for the journal. */
export function waitingEvents(
  g: GameState,
  ctx: Pick<TriggerContext, "day" | "weather">,
  defs: HeartEvent[] = HEART_EVENTS,
): HeartEvent[] {
  return defs.filter(
    (e) => !g.heartEvents.seen(e.id) && conditionsMet(g, e, ctx),
  );
}

// ---- Results ---------------------------------------------------------------

/** The scene as played: on replay the Result group is switched off. */
export function playable(e: HeartEvent, replay: boolean): Cmd[] {
  return replay ? e.scene.filter((c) => !RESULT_CMDS.includes(c.cmd)) : e.scene;
}

/**
 * Finish a first run: mark the event seen and apply the Result group. An item
 * that does not fit the pack is posted instead, as a letter written at the time,
 * so nothing is lost. A `give` of a recipe or keepsake needs nothing stored: a
 * recipe is known through an `event` source. Returns words for the gifts.
 */
export function completeEvent(
  g: GameState,
  e: HeartEvent,
  day: number,
): string[] {
  if (g.heartEvents.seen(e.id)) {
    g.heartEvents.mark(e.id, day);
    return [];
  }
  g.heartEvents.mark(e.id, day);
  const words: string[] = [];
  for (const c of e.scene) {
    if (c.cmd === "setFlag") g.heartEvents.setFlag(c.flag);
    else if (c.cmd === "rise") g.heartEvents.setSpeed(c.who, c.speed);
    else if (c.cmd === "unlockMail") {
      const l = letterById(c.letter);
      if (l) g.mail.queue(l.id, day + 1);
    } else if (c.cmd === "give") {
      if (c.hat) {
        if (g.wardrobe.add(c.hat)) words.push(`A hat: ${hatById(c.hat)?.name}`);
        continue;
      }
      const id = c.item ?? c.furniture;
      if (id) {
        const n = c.item ? (c.count ?? 1) : 1;
        if (g.inventory.add(id, n)) words.push(`${n} x ${nameOf(id)}`);
        else postGift(g, e, id, n, day);
      } else if (c.recipe) words.push(`A recipe: ${nameOf(c.recipe)}`);
    }
  }
  return words;
}

const nameOf = (id: string): string =>
  itemById(id)?.name ?? dishById(id)?.name ?? furnitureById(id)?.name ?? id;

function postGift(
  g: GameState,
  e: HeartEvent,
  id: string,
  count: number,
  day: number,
): void {
  const letter: LetterDef = {
    id: `${e.id}-gift`,
    sender: villagerById(e.villager)?.name ?? e.villager,
    title: "Left behind",
    // PLACEHOLDER TEXT, no voice sheet yet.
    body: "PLACEHOLDER TEXT. Your pack was full, so this comes by post.",
    trigger: { kind: "first-achievement" },
    attachment: { items: [{ id, count }] },
  };
  g.mail.queue(letter.id, day + 1, letter);
}

// ---- Validator -------------------------------------------------------------

const BLOCKING: readonly CmdName[] = ["wait", "say", "choose", "hold"];

const BANNED_DASH = String.fromCharCode(0x2014);

/** Where control goes after command `i`: the indexes it can reach next. */
function edges(scene: Cmd[], i: number, labels: Map<string, number>): number[] {
  const c = scene[i]!;
  const next = i + 1 < scene.length ? [i + 1] : [];
  const to = (name: string): number[] => {
    const t = labels.get(name);
    return t === undefined ? [] : [t];
  };
  switch (c.cmd) {
    case "end":
      return [];
    case "jump":
      return to(c.to);
    case "choose":
      return c.answers.flatMap((a) => to(a.goto));
    case "if":
      return [...to(c.goto), ...next];
    default:
      return next;
  }
}

/** Problems in one scene (rules 1 to 6 and 8 of note 62). Empty means valid. */
export function validateScene(
  scene: Cmd[],
  who: string,
  readFlag: (f: string) => boolean = (f) => FLAGS.includes(f),
): string[] {
  const out: string[] = [];
  if (scene.length === 0) return ["the scene is empty"];
  const labels = new Map<string, number>();
  scene.forEach((c, i) => {
    if (c.cmd !== "label") return;
    if (labels.has(c.name)) out.push(`label "${c.name}" is defined twice`);
    labels.set(c.name, i);
  });
  const used = new Set<string>();
  const person = (p: string, at: number): void => {
    if (p !== PLAYER && !villagerById(p))
      out.push(`#${at}: unknown person "${p}"`);
  };
  const line = (id: string, at: number): void => {
    const text = LINES[id];
    if (text === undefined) out.push(`#${at}: unknown line "${id}"`);
    else if (text.includes(BANNED_DASH))
      out.push(`#${at}: line "${id}" has an em dash`);
  };
  const target = (name: string, at: number): void => {
    used.add(name);
    if (!labels.has(name)) out.push(`#${at}: no label "${name}"`);
  };
  scene.forEach((c, i) => {
    switch (c.cmd) {
      case "place":
      case "walk":
      case "pose":
      case "hide":
      case "show":
        person(c.who, i);
        break;
      case "face":
        person(c.who, i);
        person(c.toward, i);
        break;
      case "say":
        person(c.who, i);
        line(c.line, i);
        break;
      case "emote":
        person(c.who, i);
        if (!EMOTES.includes(c.emote))
          out.push(`#${i}: unknown emote "${c.emote}"`);
        break;
      case "choose":
        if (c.answers.length < 2)
          out.push(`#${i}: a choice needs at least two answers`);
        for (const a of c.answers) {
          line(a.line, i);
          target(a.goto, i);
        }
        break;
      case "jump":
        target(c.to, i);
        break;
      case "if":
        target(c.goto, i);
        if (c.flag !== undefined && !readFlag(c.flag))
          out.push(`#${i}: unknown flag "${c.flag}"`);
        if (c.hearts) person(c.hearts.who, i);
        if (c.flag === undefined && !c.hearts)
          out.push(`#${i}: "if" needs a flag or a heart test`);
        break;
      case "setFlag":
        if (!FLAGS.includes(c.flag))
          out.push(`#${i}: unknown flag "${c.flag}"`);
        break;
      case "give": {
        const n = [c.item, c.recipe, c.furniture, c.hat].filter(Boolean).length;
        if (n !== 1)
          out.push(
            `#${i}: give names exactly one of item, recipe, furniture, hat`,
          );
        if (c.hat && !hatById(c.hat)) out.push(`#${i}: unknown hat "${c.hat}"`);
        if (c.item && !itemById(c.item))
          out.push(`#${i}: unknown item "${c.item}"`);
        if (c.recipe && !dishById(c.recipe))
          out.push(`#${i}: unknown recipe "${c.recipe}"`);
        if (c.furniture && !furnitureById(c.furniture))
          out.push(`#${i}: unknown keepsake "${c.furniture}"`);
        break;
      }
      case "rise":
        person(c.who, i);
        if (!(c.speed > 0)) out.push(`#${i}: rise speed must be above 0`);
        break;
      case "unlockMail":
        if (!letterById(c.letter))
          out.push(`#${i}: unknown letter "${c.letter}"`);
        break;
      case "music":
        if (c.action !== "stop" && !c.id) out.push(`#${i}: music needs an id`);
        break;
      default:
        break;
    }
  });
  for (const name of labels.keys())
    if (!used.has(name)) out.push(`label "${name}" is never used`);

  // Reachability, unreachable commands, every path ends, no loop without a pause.
  const reach = new Set<number>();
  const stack = [0];
  while (stack.length > 0) {
    const i = stack.pop()!;
    if (reach.has(i)) continue;
    reach.add(i);
    stack.push(...edges(scene, i, labels));
  }
  scene.forEach((c, i) => {
    if (!reach.has(i)) out.push(`#${i}: unreachable command "${c.cmd}"`);
  });
  const ends = new Set<number>();
  scene.forEach((c, i) => {
    if (c.cmd === "end" && reach.has(i)) ends.add(i);
  });
  if (ends.size === 0) out.push("no path reaches an end");
  // Every reachable command must reach an end: grow the set backwards.
  const good = new Set(ends);
  for (let changed = true; changed;) {
    changed = false;
    for (const i of reach)
      if (!good.has(i) && edges(scene, i, labels).some((n) => good.has(n))) {
        good.add(i);
        changed = true;
      }
  }
  for (const i of reach)
    if (!good.has(i)) out.push(`#${i}: this path never reaches an end`);
  // A cycle made only of commands that do not wait or speak spins forever.
  const state = new Map<number, 1 | 2>();
  const spins = (i: number): boolean => {
    if (BLOCKING.includes(scene[i]!.cmd)) return false;
    if (state.get(i) === 1) return true;
    if (state.get(i) === 2) return false;
    state.set(i, 1);
    const r = edges(scene, i, labels).some(spins);
    state.set(i, 2);
    return r;
  };
  for (const i of reach)
    if (spins(i)) {
      out.push(`#${i}: a loop with no wait or line`);
      break;
    }
  void who;
  return out;
}

const SEASONS: Season[] = ["spring", "summer", "fall", "winter"];
const DRY: Weather[] = ["sunny", "snowy"];
const WET: Weather[] = ["rainy", "stormy"];

/**
 * Whether the event's person is at its place during its window on at least one
 * weekday, in a season and weather the event allows (note 84, decision 1: the
 * person is never moved, so an absent person just means the event waits).
 */
export function presenceOverlaps(e: HeartEvent): boolean {
  const v = villagerById(e.villager);
  if (!v || !e.window) return false;
  const from = parseTime(e.window.from);
  const until = parseTime(e.window.until);
  const seasons = e.conditions?.season ? [e.conditions.season] : SEASONS;
  const allowed = e.conditions?.weather;
  const weathers: Weather[] = [
    ...(!allowed || allowed.some((w) => DRY.includes(w)) ? [DRY[0]!] : []),
    ...(!allowed || allowed.some((w) => WET.includes(w)) ? [WET[0]!] : []),
  ];
  const base = splitPlace(e.place).base;
  for (const season of seasons)
    for (let wd = 0; wd < WEEKDAYS.length; wd++)
      for (const weather of weathers) {
        const day = SEASONS.indexOf(season) * 28 + 1 + wd;
        const plan = planDay(v, dayContext(day, weather));
        for (let i = 0; i < plan.stops.length; i++) {
          const s = plan.stops[i]!;
          const end = plan.stops[i + 1]?.time ?? plan.bed;
          if (splitPlace(s.place).base === base && s.time < until && end > from)
            return true;
        }
      }
  return false;
}

/** Problems across the whole event list (rules 3, 4, 7 and the record shape). */
export function validateEvents(defs: HeartEvent[] = HEART_EVENTS): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const places = Object.keys(villagerData.places);
  const setSomewhere = new Set(
    defs.flatMap((e) =>
      e.scene.flatMap((c) => (c.cmd === "setFlag" ? [c.flag] : [])),
    ),
  );
  for (const f of FLAGS)
    if (!setSomewhere.has(f)) out.push(`flag "${f}" is never set`);
  for (const e of defs) {
    const at = (m: string): void => void out.push(`${e.id}: ${m}`);
    if (ids.has(e.id)) at("duplicate id");
    ids.add(e.id);
    if (!villagerById(e.villager)) at(`unknown villager "${e.villager}"`);
    if (!places.includes(e.place)) at(`unknown place "${e.place}"`);
    if (!Number.isInteger(e.hearts) || e.hearts < 1 || e.hearts > 10)
      at("hearts must be a whole number from 1 to 10");
    const c = e.conditions;
    for (const f of c?.flags ?? [])
      if (!FLAGS.includes(f)) at(`unknown condition flag "${f}"`);
    for (const a of c?.after ?? [])
      if (!defs.some((d) => d.id === a)) at(`unknown "after" event "${a}"`);
    if (c?.bundle && !BUNDLES.some((b) => b.id === c.bundle))
      at(`unknown bundle "${c.bundle}"`);
    if (!e.window) at("needs a presence window (note 84)");
    else if (!presenceOverlaps(e))
      at("the person is never at the place in the window (note 84)");
    for (const m of validateScene(e.scene, e.villager)) at(m);
  }
  return out;
}
