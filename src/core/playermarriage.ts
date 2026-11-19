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
