import { HEART, isCandidate } from "./friendship";

/**
 * Marriage state and stage transitions (note 12, slice 1, #934). Pure rules:
 * no UI and no scenes. State is per farm (ADR 0007), one spouse at a time.
 * Numbers are placeholders in `07_tuning_numbers.md`. Later slices call these
 * helpers: courtship and wedding (2), spouse life (3), divorce (4), children (5).
 */

export type Stage = "none" | "courting" | "engaged" | "married";

/** Hearts needed for the bouquet, which starts courting (note 12, 61). */
export const COURT_HEARTS = 8;
/** Hearts needed for the promise token, which proposes. */
export const PROPOSE_HEARTS = 10;
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

export interface MarriageSave {
  stage: Stage;
  /** The villager id of the person being courted, engaged to or married to. */
  spouse: string | null;
  /** The day the wedding is set for while engaged, or took place once married. */
  weddingDay: number;
  children: number;
}

const STAGES: readonly Stage[] = ["none", "courting", "engaged", "married"];

const isCount = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0;

export class Marriage {
  stage: Stage = "none";
  spouse: string | null = null;
  weddingDay = 0;
  children = 0;

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
    this.children = 0;
    return true;
  }

  /** A child, by the player's choice, once married and below the limit. */
  addChild(): boolean {
    if (this.stage !== "married" || this.children >= MAX_CHILDREN) return false;
    this.children += 1;
    return true;
  }

  save(): MarriageSave {
    return {
      stage: this.stage,
      spouse: this.spouse,
      weddingDay: this.weddingDay,
      children: this.children,
    };
  }

  /** Load from a save. Missing or malformed data loads as unmarried. */
  load(raw: unknown): void {
    this.stage = "none";
    this.spouse = null;
    this.weddingDay = 0;
    this.children = 0;
    if (typeof raw !== "object" || raw === null) return;
    const o = raw as Record<string, unknown>;
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
    this.children =
      this.stage === "married" && isCount(o.children)
        ? Math.min(o.children, MAX_CHILDREN)
        : 0;
  }
}
