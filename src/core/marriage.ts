import childData from "../content/children.json";
import { HEART, isCandidate } from "./friendship";

/**
 * Marriage state and stage transitions (note 12, slice 1, #934). Pure rules:
 * no UI and no scenes. State is per player (note 12 "As built, one spouse per
 * villager"; the host's is the old farm marriage), one spouse at a time.
 * Numbers are placeholders in `07_tuning_numbers.md`. Later slices call these
 * helpers: courtship and wedding (2), spouse life (3), divorce (4), children (5).
 */

export type Stage = "none" | "courting" | "engaged" | "married";

/** Hearts needed for the bouquet, which starts courting (note 12, 61). */
export const COURT_HEARTS = 8;
/** Hearts needed for the promise token, which proposes. */
export const PROPOSE_HEARTS = 10;
/** The house tier the promise token needs: the spouse's bed and kitchen only exist from tier 1 (notes 41 and 85; owner, 2026-11-21). */
export const MARRIAGE_HOUSE_TIER = 1;
/** The wedding is this many days after the proposal. */
export const WEDDING_DELAY_DAYS = 3;
/** The promise token, bought from the rainy day seller. */
export const TOKEN_PRICE = 5000;
/** The player-only divorce fee. */
export const DIVORCE_FEE = 50000;
/** The spouse's one-off gift comes at this many hearts (a half heart step). */
export const SPOUSE_PERK_HEARTS = 12.5;
/** Most children a farm can have. */
export const MAX_CHILDREN = 2;

/** The world flag a divorce raises for a former spouse (note 84). */
export const exFlag = (id: string): string => `ex-${id}`;

/** The candidates the player has been divorced from, read from the `ex-<id>` flags. */
export function exSpouses(g: { flags?: string[] }): string[] {
  return (g.flags ?? [])
    .filter((f) => f.startsWith("ex-"))
    .map((f) => f.slice(3))
    .filter(isCandidate);
}

/** A child of the farm (note 12, slice 5). Lives with the player whatever happens to the marriage. */
export interface Child {
  /** `child-<slot>`, the slot being 1 or 2 (the nursery's two beds). */
  id: string;
  name: string;
  /** The day the child arrived: age and stage come from it. */
  born: number;
  /** Friendship points, own counter (the child is not a villager row). */
  points: number;
  /** The last day the child was talked to, 0 for never. */
  talkDay: number;
}

export const childId = (slot: number): string => `child-${slot}`;
export const isChildId = (id: string): boolean => /^child-[1-9]$/.test(id);

export interface MarriageSave {
  stage: Stage;
  /** The villager id of the person being courted, engaged to or married to. */
  spouse: string | null;
  /** The day the wedding is set for while engaged, or took place once married. */
  weddingDay: number;
  /** Child count, kept for old readers. `kids` is the truth when present. */
  children: number;
  /** The children, by slot. Absent in saves from before slice 5: `children` is then read as a count. */
  kids?: Child[];
  /** The day a child arrives, after a yes. Absent for none. */
  childDue?: number;
  /** The last day the child ask was put, answered either way. Absent for never. */
  askDay?: number;
  /** The last day the spouse was kissed, for the daily energy (note 12). */
  kissDay?: number;
  /** A divorce is filed and takes effect next morning unless cancelled (note 12). */
  divorcing?: boolean;
  /** The day the wedding was last put off, and why ("festival" or "rain"). Absent for never. */
  putOffDay?: number;
  putOffWhy?: string;
  /** Former spouses, in the order divorced (per player; an old save's `ex-<id>` flags become the host's). */
  exes?: string[];
}

const STAGES: readonly Stage[] = ["none", "courting", "engaged", "married"];

const isCount = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0;

const isCandidateId = (v: unknown): boolean =>
  typeof v === "string" && isCandidate(v);

/**
 * Read the children. A list is validated one by one (known slot, once each);
 * an old save with only a count gets that many placeholder children, born
 * on day 1, so a count is never lost. Anything else loads as none.
 */
function loadKids(o: Record<string, unknown>, married: boolean): Child[] {
  const out: Child[] = [];
  if (Array.isArray(o.kids)) {
    for (const r of o.kids as unknown[]) {
      if (typeof r !== "object" || r === null) continue;
      const k = r as Record<string, unknown>;
      const slot = Number(String(k.id).slice(6));
      if (
        typeof k.id !== "string" ||
        !isChildId(k.id) ||
        slot > MAX_CHILDREN ||
        out.some((c) => c.id === k.id)
      )
        continue;
      out.push({
        id: k.id,
        name:
          typeof k.name === "string" && k.name !== ""
            ? k.name.slice(0, 24)
            : (childData.names[slot - 1] ?? `Child ${slot}`),
        born: isCount(k.born) ? k.born : 1,
        points: isCount(k.points) ? k.points : 0,
        talkDay: isCount(k.talkDay) ? k.talkDay : 0,
      });
    }
  } else if (married && isCount(o.children)) {
    for (let n = 1; n <= Math.min(o.children, MAX_CHILDREN); n++)
      out.push({
        id: childId(n),
        name: childData.names[n - 1] ?? `Child ${n}`,
        born: 1,
        points: 0,
        talkDay: 0,
      });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export class Marriage {
  stage: Stage = "none";
  spouse: string | null = null;
  weddingDay = 0;
  /** The day the wedding was last put off, 0 for never, and the reason. */
  putOffDay = 0;
  putOffWhy = "";
  kids: Child[] = [];
  /** The day a child arrives after a yes, 0 for none. */
  childDue = 0;
  /** The last day the ask was put, 0 for never. */
  askDay = 0;
  /** The last day the spouse was kissed, 0 for never. */
  kissDay = 0;
  /** A divorce is filed at the hall ledger: it takes effect next morning unless cancelled. */
  divorcing = false;
  /** Former spouses, in the order divorced. */
  exes: string[] = [];

  /** Whether `id` is a former spouse. */
  isEx(id: string): boolean {
    return this.exes.includes(id);
  }

  /** Mark `id` a former spouse (last in order), or lift the mark. */
  setEx(id: string, ex: boolean): void {
    this.exes = this.exes.filter((e) => e !== id);
    if (ex) this.exes.push(id);
  }

  /** Whether this player is engaged or married to `id`: the villager is off limits to the others. */
  holds(id: string): boolean {
    return (
      (this.stage === "engaged" || this.stage === "married") &&
      this.spouse === id
    );
  }

  /** How many children the farm has. */
  get children(): number {
    return this.kids.length;
  }

  /** Whether `id` is the person being courted, engaged to or married to. */
  isPartner(id: string): boolean {
    return this.stage !== "none" && this.spouse === id;
  }

  /** Whether the player is married (not just engaged). */
  get married(): boolean {
    return this.stage === "married";
  }

  /** The bouquet: a candidate at 8 hearts or more, when nobody else is courted. */
  court(id: string, points: number): boolean {
    if (this.stage !== "none" || !isCandidate(id)) return false;
    if (points < COURT_HEARTS * HEART) return false;
    this.stage = "courting";
    this.spouse = id;
    return true;
  }

  /** The token: the courted person at 10 hearts or more. Sets the wedding day. */
  engage(id: string, points: number, today: number): boolean {
    if (this.stage !== "courting" || this.spouse !== id) return false;
    if (points < PROPOSE_HEARTS * HEART) return false;
    this.stage = "engaged";
    this.weddingDay = today + WEDDING_DELAY_DAYS;
    return true;
  }

  /** The wedding takes place on or after its day. The spouse then moves in. */
  marry(today: number): boolean {
    if (this.stage !== "engaged" || today < this.weddingDay) return false;
    this.stage = "married";
    this.weddingDay = today;
    return true;
  }

  /** The wedding is put off a day (a festival or a rain day), and the report says why. */
  postpone(today = 0, why = ""): boolean {
    if (this.stage !== "engaged") return false;
    this.weddingDay += 1;
    this.putOffDay = today;
    this.putOffWhy = why;
    return true;
  }

  /** Whether a wedding is set for `today`. */
  weddingToday(today: number): boolean {
    return this.stage === "engaged" && this.weddingDay === today;
  }

  /** Divorce, or an end to courtship: all state cleared. Friendship is left as is. */
  end(): boolean {
    if (this.stage === "none") return false;
    this.stage = "none";
    this.spouse = null;
    this.weddingDay = 0;
    this.putOffDay = 0;
    this.putOffWhy = "";
    this.kissDay = 0;
    this.divorcing = false;
    // The children stay with the player (note 12, slice 5). A child still on the way does not come, and the ask restarts.
    this.childDue = 0;
    this.askDay = 0;
    return true;
  }

  /** The first free slot, 1 or 2, or 0 when the nursery is full. */
  private freeSlot(): number {
    for (let n = 1; n <= MAX_CHILDREN; n++)
      if (!this.kids.some((k) => k.id === childId(n))) return n;
    return 0;
  }

  /** A child, by the player's choice, once married and below the limit. `name` is the placeholder pool's by default. */
  addChild(born = 0, name?: string): Child | undefined {
    const slot = this.freeSlot();
    if (this.stage !== "married" || slot === 0) return undefined;
    const kid: Child = {
      id: childId(slot),
      name: name ?? childData.names[slot - 1] ?? `Child ${slot}`,
      born,
      points: 0,
      talkDay: 0,
    };
    this.kids.push(kid);
    this.kids.sort((a, b) => a.id.localeCompare(b.id));
    return kid;
  }

  save(): MarriageSave {
    return {
      stage: this.stage,
      spouse: this.spouse,
      weddingDay: this.weddingDay,
      children: this.children,
      ...(this.kids.length > 0
        ? { kids: this.kids.map((k) => ({ ...k })) }
        : {}),
      ...(this.childDue > 0 ? { childDue: this.childDue } : {}),
      ...(this.askDay > 0 ? { askDay: this.askDay } : {}),
      kissDay: this.kissDay,
      ...(this.divorcing ? { divorcing: true } : {}),
      ...(this.putOffDay > 0
        ? { putOffDay: this.putOffDay, putOffWhy: this.putOffWhy }
        : {}),
      ...(this.exes.length > 0 ? { exes: [...this.exes] } : {}),
    };
  }

  /** Load from a save. Missing or malformed data loads as unmarried. */
  load(raw: unknown): void {
    this.stage = "none";
    this.spouse = null;
    this.weddingDay = 0;
    this.putOffDay = 0;
    this.putOffWhy = "";
    this.kids = [];
    this.childDue = 0;
    this.askDay = 0;
    this.kissDay = 0;
    this.divorcing = false;
    this.exes = [];
    if (typeof raw !== "object" || raw === null) return;
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.exes))
      for (const e of o.exes)
        if (isCandidateId(e) && !this.exes.includes(e as string))
          this.exes.push(e as string);
    const married = o.stage === "married" && isCandidateId(o.spouse);
    // The children outlive the marriage, so they load whatever the stage is.
    if (married || o.stage === "none" || o.kids !== undefined)
      this.kids = loadKids(o, married);
    if (
      !STAGES.includes(o.stage as Stage) ||
      o.stage === "none" ||
      typeof o.spouse !== "string" ||
      !isCandidate(o.spouse)
    )
      return;
    this.stage = o.stage as Stage;
    this.spouse = o.spouse;
    this.weddingDay = isCount(o.weddingDay) ? o.weddingDay : 0;
    if (this.stage === "engaged" && isCount(o.putOffDay)) {
      this.putOffDay = o.putOffDay;
      this.putOffWhy = typeof o.putOffWhy === "string" ? o.putOffWhy : "";
    }
    if (this.stage === "married") {
      this.childDue = isCount(o.childDue) ? o.childDue : 0;
      this.askDay = isCount(o.askDay) ? o.askDay : 0;
    }
    this.kissDay = this.married && isCount(o.kissDay) ? o.kissDay : 0;
    this.divorcing = this.married && o.divorcing === true;
  }
}
