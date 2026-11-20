// Player-to-player marriage and divorce (note 12 "Two-player wedding and divorce steps", note 53).
// Pure rules over a small book kept on the host, free of Phaser and the DOM. A bond is
// proposed, engaged, then married; the partner is a second player key, not a villager id.
import { cabinOf, type CabinBook, type Cabin } from "./cabins";
import { DIVORCE_FEE, WEDDING_DELAY_DAYS } from "./marriage";
import type { PlayerId } from "./players";

export type BondStage = "proposed" | "engaged" | "married";

export interface Bond {
  /** The player who offered the token. Their cabin is home (owner, 2026-11-18). */
  proposer: PlayerId;
  /** The player who was asked. */
  other: PlayerId;
  stage: BondStage;
  /** Wedding day while engaged, the day it took place once married, 0 while proposed. */
  weddingDay: number;
  /** Who filed a divorce that takes effect next morning, if one is filed. */
  filedBy?: PlayerId;
}

export interface PlayerMarriageBook {
  bonds: Bond[];
  /** Players who have not yet seen their own wedding scene (an absent partner sees it on joining). */
  unseenWedding: PlayerId[];
}

export const newPlayerMarriageBook = (): PlayerMarriageBook => ({
  bonds: [],
  unseenWedding: [],
});

export const bondOf = (
  b: PlayerMarriageBook,
  key: PlayerId,
): Bond | undefined =>
  b.bonds.find((x) => x.proposer === key || x.other === key);

/** The partner of a player in any bond, or undefined. */
export function partnerOf(
  b: PlayerMarriageBook,
  key: PlayerId,
): PlayerId | undefined {
  const x = bondOf(b, key);
  return x && (x.proposer === key ? x.other : x.proposer);
}

export const isMarried = (b: PlayerMarriageBook, key: PlayerId): boolean =>
  bondOf(b, key)?.stage === "married";

type Result = { ok: true } | { ok: false; reason: string };
const no = (reason: string): Result => ({ ok: false, reason });
const yes: Result = { ok: true };

/** One player offers the token to another. Both must be free of any bond. */
export function propose(
  b: PlayerMarriageBook,
  from: PlayerId,
  to: PlayerId,
): Result {
  if (from === to) return no("You cannot propose to yourself.");
  if (bondOf(b, from)) return no("You are already promised or wed.");
  if (bondOf(b, to)) return no("They are already promised or wed.");
  b.bonds.push({
    proposer: from,
    other: to,
    stage: "proposed",
    weddingDay: 0,
  });
  return yes;
}

/** The asked player says yes (engaged, wedding three days on) or no (nothing is lost). */
export function respond(
  b: PlayerMarriageBook,
  by: PlayerId,
  accept: boolean,
  today: number,
): Result {
  const x = bondOf(b, by);
  if (!x || x.stage !== "proposed" || x.other !== by)
    return no("There is no proposal for you.");
  if (!accept) {
    b.bonds = b.bonds.filter((y) => y !== x);
    return yes;
  }
  x.stage = "engaged";
  x.weddingDay = today + WEDDING_DELAY_DAYS;
  return yes;
}

/** The open proposal waiting on `key`'s answer, if any (the card on their client). */
export function proposalFor(
  b: PlayerMarriageBook,
  key: PlayerId,
): Bond | undefined {
  const x = bondOf(b, key);
  return x?.stage === "proposed" && x.other === key ? x : undefined;
}

/**
 * The end of the day: every unanswered proposal expires (owner, 2026-11-19). Returns the
 * proposers, whose token the caller hands back.
 */
export function expireProposals(b: PlayerMarriageBook): PlayerId[] {
  const gone = b.bonds.filter((x) => x.stage === "proposed");
  b.bonds = b.bonds.filter((x) => x.stage !== "proposed");
  return gone.map((x) => x.proposer);
}

/**
 * Either engaged player calls it off at the hall ledger, free (owner, 2026-11-19). The token
 * is not refunded. The 50,000g fee is for married couples only.
 */
export function callOff(b: PlayerMarriageBook, by: PlayerId): Result {
  const x = bondOf(b, by);
  if (x?.stage !== "engaged") return no("You are not engaged.");
  b.bonds = b.bonds.filter((y) => y !== x);
  return yes;
}

/** The engaged partner and wedding day if `key` is engaged, for the day end report. */
export function engagedWith(
  b: PlayerMarriageBook,
  key: PlayerId,
): { partner: PlayerId; weddingDay: number } | undefined {
  const x = bondOf(b, key);
  return x?.stage === "engaged"
    ? { partner: partnerOf(b, key)!, weddingDay: x.weddingDay }
    : undefined;
}

/**
 * Morning report lines for one player, `today` being the day just begun: "Wedding tomorrow
 * with X" when it plays on the next morning, "Engaged to X" otherwise, plus a told divorce.
 */
export function marriageReportLines(
  b: PlayerMarriageBook,
  key: PlayerId,
  today: number,
  nameOf: (id: PlayerId) => string,
  divorces: readonly DivorceNews[] = [],
  weddings: readonly WeddingNews[] = [],
): string[] {
  const out: string[] = [];
  for (const w of weddings)
    if (w.proposer === key || w.other === key)
      out.push(
        `You married ${nameOf(w.proposer === key ? w.other : w.proposer)} this morning.`,
      );
  const e = engagedWith(b, key);
  if (e) {
    const name = nameOf(e.partner);
    const left = e.weddingDay - today;
    out.push(
      left <= 1
        ? `Wedding tomorrow with ${name}.`
        : `Engaged to ${name}. The wedding is in ${left} days.`,
    );
  }
  for (const d of divorces)
    if (d.told === key) out.push(`${nameOf(d.filer)} filed for divorce.`);
    else if (d.filer === key)
      out.push(`Your divorce from ${nameOf(d.told)} is final.`);
  return out;
}

/** The proposer takes the offer back before it is answered. */
export function withdraw(b: PlayerMarriageBook, by: PlayerId): Result {
  const x = bondOf(b, by);
  if (!x || x.stage !== "proposed" || x.proposer !== by)
    return no("You have no open proposal.");
  b.bonds = b.bonds.filter((y) => y !== x);
  return yes;
}

export interface WeddingNews {
  proposer: PlayerId;
  other: PlayerId;
}

/**
 * The morning check, on the day the clock turned. Engaged pairs whose day has come are wed,
 * with no wait for the partner (owner, 2026-11-18): both go on the unseen list, and a
 * connected player clears theirs with `takeWeddingScene`. A festival or rain day (`block`
 * non-empty) puts every due wedding off a day.
 */
export function weddingMorning(
  b: PlayerMarriageBook,
  today: number,
  block: string,
): WeddingNews[] {
  const out: WeddingNews[] = [];
  for (const x of b.bonds) {
    if (x.stage !== "engaged" || x.weddingDay > today) continue;
    if (block) {
      x.weddingDay = today + 1;
      continue;
    }
    x.stage = "married";
    x.weddingDay = today;
    for (const k of [x.proposer, x.other])
      if (!b.unseenWedding.includes(k)) b.unseenWedding.push(k);
    out.push({ proposer: x.proposer, other: x.other });
  }
  return out;
}

/** The player sees the wedding scene (now, or on joining). True if there was one waiting. */
export function takeWeddingScene(
  b: PlayerMarriageBook,
  key: PlayerId,
): boolean {
  const i = b.unseenWedding.indexOf(key);
  if (i < 0) return false;
  b.unseenWedding.splice(i, 1);
  return true;
}

/**
 * The home cabin of a player. A married pair live in the proposer's cabin; the other's
 * cabin stays, still theirs, so a divorce has a place to return to.
 */
export function homeCabin(
  b: PlayerMarriageBook,
  cabins: CabinBook,
  key: PlayerId,
): Cabin | undefined {
  const x = bondOf(b, key);
  return cabinOf(cabins, x?.stage === "married" ? x.proposer : key);
}

/** Why a divorce cannot be filed now by `by` with `gold`, or "". */
export function divorceProblem(
  b: PlayerMarriageBook,
  by: PlayerId,
  gold: number,
): string {
  const x = bondOf(b, by);
  if (x?.stage !== "married")
    return "There is nothing to file. You are not wed.";
  if (x.filedBy) return "The divorce is already filed.";
  if (gold < DIVORCE_FEE)
    return `The fee is ${DIVORCE_FEE}g. You need ${DIVORCE_FEE - gold}g more.`;
  return "";
}

/** Mark a divorce filed. The caller takes `DIVORCE_FEE` from the filer's purse. */
export function fileDivorce(
  b: PlayerMarriageBook,
  by: PlayerId,
  gold: number,
): Result {
  const why = divorceProblem(b, by, gold);
  if (why) return no(why);
  bondOf(b, by)!.filedBy = by;
  return yes;
}

/** Only the filer may cancel, before the day ends. The caller refunds the fee. */
export function cancelDivorce(b: PlayerMarriageBook, by: PlayerId): Result {
  const x = bondOf(b, by);
  if (!x?.filedBy || x.filedBy !== by) return no("You have no divorce filed.");
  delete x.filedBy;
  return yes;
}

export interface DivorceNews {
  /** The player who filed (and paid). */
  filer: PlayerId;
  /** The partner, told in the next morning's report. */
  told: PlayerId;
}

/** The morning a filed divorce takes effect. Cabins are untouched: each goes back to their own. */
export function divorceMorning(b: PlayerMarriageBook): DivorceNews[] {
  const out: DivorceNews[] = [];
  for (const x of [...b.bonds]) {
    if (x.stage !== "married" || !x.filedBy) continue;
    out.push({
      filer: x.filedBy,
      told: x.filedBy === x.proposer ? x.other : x.proposer,
    });
    b.bonds = b.bonds.filter((y) => y !== x);
    b.unseenWedding = b.unseenWedding.filter(
      (k) => k !== x.proposer && k !== x.other,
    );
  }
  return out;
}

/** The book as saved: bonds and the wedding scenes not yet seen. */
export interface PlayerMarriageSave {
  bonds: Bond[];
  unseenWedding: PlayerId[];
}

export const savePlayerMarriage = (
  b: PlayerMarriageBook,
): PlayerMarriageSave => ({
  bonds: b.bonds.map((x) => ({ ...x })),
  unseenWedding: [...b.unseenWedding],
});

const STAGES: readonly string[] = ["proposed", "engaged", "married"];

/**
 * Read a saved book. Anything malformed is dropped, so an old or damaged save loads as no
 * bonds. A player can be in one bond only: later bonds that repeat a player are skipped.
 */
export function loadPlayerMarriage(
  raw: unknown,
  known: (id: PlayerId) => boolean = () => true,
): PlayerMarriageBook {
  const b = newPlayerMarriageBook();
  if (typeof raw !== "object" || raw === null) return b;
  const r = raw as Record<string, unknown>;
  const isId = (v: unknown): v is string =>
    typeof v === "string" && v !== "" && known(v);
  if (Array.isArray(r.bonds))
    for (const x of r.bonds as Record<string, unknown>[]) {
      if (typeof x !== "object" || x === null) continue;
      if (!isId(x.proposer) || !isId(x.other) || x.proposer === x.other)
        continue;
      if (typeof x.stage !== "string" || !STAGES.includes(x.stage)) continue;
      if (bondOf(b, x.proposer) || bondOf(b, x.other)) continue;
      const day =
        typeof x.weddingDay === "number" && Number.isInteger(x.weddingDay)
          ? Math.max(0, x.weddingDay)
          : 0;
      b.bonds.push({
        proposer: x.proposer,
        other: x.other,
        stage: x.stage as BondStage,
        weddingDay: day,
        ...(isId(x.filedBy) &&
        x.stage === "married" &&
        (x.filedBy === x.proposer || x.filedBy === x.other)
          ? { filedBy: x.filedBy }
          : {}),
      });
    }
  if (Array.isArray(r.unseenWedding))
    for (const k of r.unseenWedding)
      if (isId(k) && !b.unseenWedding.includes(k)) b.unseenWedding.push(k);
  return b;
}
