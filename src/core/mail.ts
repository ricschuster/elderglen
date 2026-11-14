import letterData from "../content/letters.json";
import { dishById } from "./dishes";
import { furnitureById } from "./furniture";
import { ORDINARY_FISH } from "./fishing";
import { hatById } from "./hats";
import { absorbElderfruit } from "./elderfruit";
import { ELDERFRUIT, itemById } from "./items";
import type { GameState } from "./save";

/**
 * Mail and letters (`docs/design/51_mail_and_letters.md`). A trigger on day N
 * queues a letter that arrives on the morning of day N+1. Opening a letter
 * gives its attachment at once. Items that do not fit the pack leave the letter
 * open-pending: the text is read, the item is not taken, and the flag stays up.
 * A letter is sent once, whatever fires twice. Content is
 * `src/content/letters.json`. Pure rules, free of Phaser.
 */
export interface Attachment {
  gold?: number;
  items?: { id: string; count: number }[];
  /** A hat id to add to the wardrobe. */
  hat?: string;
  /** A furniture id; the piece goes to the pack with the items. */
  furniture?: string;
  /**
   * A dish or crafting recipe id the letter teaches. Nothing is stored: a recipe with a
   * `letter` source is known once the letter is taken (see `known` in crafting).
   */
  recipe?: string;
}

export type LetterTrigger =
  | { kind: "first-achievement" }
  | { kind: "achievement"; id: string }
  /** Every ordinary fish landed. The legends and the pond fish are outside it (note 88). */
  | { kind: "fish-roster" }
  /** Friendship mail (note 61 rule 8): a villager reaches this many hearts. */
  | { kind: "hearts"; villager: string; hearts: number }
  /** A heart event has been seen; the letter comes the next morning (note 97, SC-171). */
  | { kind: "event"; event: string }
  /** A village hall room is restored (note 97, the garden pot); the letter comes the next morning. */
  | { kind: "room"; room: string };

export interface LetterDef {
  id: string;
  sender: string;
  title: string;
  body: string;
  trigger: LetterTrigger;
  attachment?: Attachment;
}

export const LETTERS = letterData as LetterDef[];

/** A letter kept in a save, if it is shaped right. */
function validLetter(raw: unknown): LetterDef | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const l = raw as Partial<LetterDef>;
  if (
    typeof l.id !== "string" ||
    typeof l.sender !== "string" ||
    typeof l.title !== "string" ||
    typeof l.body !== "string"
  )
    return undefined;
  return l as LetterDef;
}

export function letterById(
  id: string,
  defs: LetterDef[] = LETTERS,
): LetterDef | undefined {
  return defs.find((l) => l.id === id);
}

/** The letter an entry stands for: one written at the time, or one from the data. */
export function letterOf(
  e: MailEntry,
  defs: LetterDef[] = LETTERS,
): LetterDef | undefined {
  return e.letter ?? letterById(e.id, defs);
}

/** queued: not due yet. waiting: delivered, unread. opened: read, gift still to take. taken: done. */
export type LetterState = "queued" | "waiting" | "opened" | "taken";

export interface MailEntry {
  id: string;
  /** The morning it arrives. */
  due: number;
  /** A letter written at the time, such as the trainer's post of a lost stack. Absent for letters from `letters.json`. */
  letter?: LetterDef;
  /** The day it arrived, once delivered. */
  received?: number;
  state: LetterState;
}

const STATES: LetterState[] = ["queued", "waiting", "opened", "taken"];

/** Every letter the player has been sent, and where each stands. */
export class Mailbox {
  private entries: MailEntry[] = [];

  entry(id: string): MailEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  has(id: string): boolean {
    return this.entry(id) !== undefined;
  }

  /** Queue a letter for a morning. False if it was ever queued before. */
  queue(id: string, due: number, letter?: LetterDef): boolean {
    if (this.has(id)) return false;
    this.entries.push({
      id,
      due,
      state: "queued",
      ...(letter ? { letter } : {}),
    });
    return true;
  }

  /** Deliver every queued letter that is due. Returns how many arrived. */
  deliver(day: number): number {
    let n = 0;
    for (const e of this.entries)
      if (e.state === "queued" && e.due <= day) {
        e.state = "waiting";
        e.received = day;
        n++;
      }
    return n;
  }

  /** Letters that keep the flag up, oldest first: unread, or read with a gift left. */
  pending(): MailEntry[] {
    return this.entries.filter(
      (e) => e.state === "waiting" || e.state === "opened",
    );
  }

  get flagUp(): boolean {
    return this.pending().length > 0;
  }

  /** Delivered letters, newest first, for the reader's list. */
  kept(): MailEntry[] {
    return this.entries.filter((e) => e.received !== undefined).reverse();
  }

  save(): MailEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  load(raw: unknown): void {
    this.entries = [];
    if (!Array.isArray(raw)) return;
    for (const e of raw) {
      if (
        typeof e !== "object" ||
        e === null ||
        typeof e.id !== "string" ||
        !STATES.includes(e.state) ||
        !Number.isInteger(e.due) ||
        this.has(e.id)
      )
        continue;
      const received = Number.isInteger(e.received) ? e.received : undefined;
      if (e.state !== "queued" && received === undefined) continue;
      const letter = validLetter(e.letter);
      this.entries.push({
        id: e.id,
        due: e.due,
        received,
        state: e.state,
        ...(letter ? { letter } : {}),
      });
    }
  }
}

function triggered(g: GameState, t: LetterTrigger): boolean {
  if (t.kind === "hearts") return g.friendship.hearts(t.villager) >= t.hearts;
  if (t.kind === "event") return g.heartEvents.seen(t.event);
  if (t.kind === "room") return g.hall.roomComplete(t.room);
  if (t.kind === "fish-roster")
    return ORDINARY_FISH.every((f) => g.fishing.has(f.id));
  return t.kind === "first-achievement"
    ? g.achievements.list().length > 0
    : g.achievements.has(t.id);
}

/**
 * Queue every letter whose trigger has fired and that was never sent. Safe to
 * repeat. `due` is the morning it arrives. Returns the ids queued now.
 */
export function queueMail(
  g: GameState,
  due: number,
  defs: LetterDef[] = LETTERS,
): string[] {
  const queued: string[] = [];
  for (const l of defs)
    if (!g.mail.has(l.id) && triggered(g, l.trigger) && g.mail.queue(l.id, due))
      queued.push(l.id);
  return queued;
}

export type OpenResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      letter: LetterDef;
      /** Words for what came with it, one per line. */
      gift: string[];
      /** True when a gift is still to take because the pack is full. */
      pending: boolean;
    };

/** Whether the pack holds every item of an attachment, counting stacks that share an id. */
function itemsFit(
  g: GameState,
  items: { id: string; count: number }[],
): boolean {
  const probe = g.inventory;
  const need = new Map<string, number>();
  for (const i of items) need.set(i.id, (need.get(i.id) ?? 0) + i.count);
  // Each id is checked alone; the pack is shared, so add then undo for a true answer.
  const done: { id: string; count: number }[] = [];
  let fits = true;
  for (const [id, count] of need) {
    if (probe.add(id, count)) done.push({ id, count });
    else {
      fits = false;
      break;
    }
  }
  for (const d of done) probe.remove(d.id, d.count);
  return fits;
}

/**
 * Open a delivered letter. Gold and a hat apply at once; items and furniture go to the pack
 * all together, or not at all and the letter stays `opened`. A taken letter
 * never gives its gift again. Reading a kept letter is allowed any time.
 */
export function openLetter(
  g: GameState,
  id: string,
  defs: LetterDef[] = LETTERS,
): OpenResult {
  const e = g.mail.entry(id);
  const letter = e ? letterOf(e, defs) : undefined;
  if (!e || !letter || e.state === "queued")
    return { ok: false, reason: "There is no such letter." };
  const a = letter.attachment;
  if (e.state === "taken" || !a) {
    e.state = "taken";
    return { ok: true, letter, gift: [], pending: false };
  }
  const packed = [
    ...(a.items ?? []),
    ...(a.furniture ? [{ id: a.furniture, count: 1 }] : []),
  ];
  if (packed.length > 0 && !itemsFit(g, packed)) {
    e.state = "opened";
    return {
      ok: true,
      letter,
      gift: ["Your pack is full. The gift stays in the mailbox."],
      pending: true,
    };
  }
  const gift: string[] = [];
  if (a.gold) {
    g.money += a.gold;
    gift.push(`${a.gold}g`);
  }
  for (const i of a.items ?? []) {
    g.inventory.add(i.id, i.count);
    if (i.id === ELDERFRUIT) absorbElderfruit(g);
    gift.push(`${i.count} x ${itemById(i.id)?.name ?? i.id}`);
  }
  if (a.furniture) {
    g.inventory.add(a.furniture, 1);
    gift.push(furnitureById(a.furniture)?.name ?? a.furniture);
  }
  if (a.recipe)
    gift.push(
      `A recipe: ${dishById(a.recipe)?.name ?? itemById(a.recipe)?.name ?? a.recipe}`,
    );
  if (a.hat && g.wardrobe.add(a.hat))
    gift.push(`A hat: ${hatById(a.hat)?.name ?? a.hat}`);
  e.state = "taken";
  return { ok: true, letter, gift, pending: false };
}

/** Queue what has fired and deliver what is due. Returns how many arrived. */
export function deliverAll(
  g: GameState,
  today: number,
  defs: LetterDef[] = LETTERS,
): number {
  queueMail(g, today, defs);
  return g.mail.deliver(today);
}

/** The oldest letter the mailbox would open next, if any. */
export function nextLetter(g: GameState): string | undefined {
  return g.mail.pending()[0]?.id;
}
