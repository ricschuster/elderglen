import courtshipData from "../content/courtship.json";
import { dateOf } from "./calendar";
import { clockText } from "./clock";
import { festivalDayToday } from "./festivals";
import {
  COURT_HEARTS,
  PROPOSE_HEARTS,
  TOKEN_PRICE,
  exFlag,
  exSpouses,
} from "./marriage";
import { HEART, isCandidate } from "./friendship";
import type { Cmd, HeartEvent } from "./heartevents";
import type { GameState } from "./save";
import { parseTime, villagerById } from "./villagers";
import { isRaining } from "./weather";
import { hasFlag, setFlag } from "./worldflags";

/**
 * Courtship, the proposal and the wedding (note 12, slice 2, #935). Pure rules
 * on top of `Marriage` (slice 1) and `Friendship`. Everything per person is
 * data (the candidate flag and heart cap in `villagers.json`), so all 14
 * candidates work the same. Text is placeholder until the voice sheets (M3d).
 */

export const BOUQUET = courtshipData.bouquet.id;
export const TOKEN = courtshipData.token.id;
export const SELLER_NAME = courtshipData.seller.name;
export const SELLER_OPEN = parseTime(courtshipData.seller.opens);
export const SELLER_CLOSE = parseTime(courtshipData.seller.closes);

// ---- The rain peddler ------------------------------------------------------

/** The peddler comes out on rain and storm days only. */
export const sellerHere = (g: Pick<GameState, "weather">): boolean =>
  isRaining(g.weather);

/** What he sells: the promise token. */
export const sellerStock = (): string[] => [TOKEN];

/** Why the stall cannot be used now, or "" when it can. */
export function sellerProblem(
  g: Pick<GameState, "weather" | "day">,
  minutes = g.day.clock.minutes,
): string {
  if (!sellerHere(g))
    return "A hooded peddler is said to put up a stall when it rains. Nobody is here today.";
  if (minutes < SELLER_OPEN)
    return `The ${SELLER_NAME.toLowerCase()} is still putting up the awning. Back at ${clockText(SELLER_OPEN)}.`;
  if (minutes >= SELLER_CLOSE)
    return `The ${SELLER_NAME.toLowerCase()} has packed up for the night.`;
  return "";
}

/** The token's price (5,000g). */
export const tokenPrice = (): number => TOKEN_PRICE;

/** Buy the token. One at a time: false when closed, too dear, already held or the pack is full. */
export function buyToken(g: GameState): boolean {
  if (sellerProblem(g) || g.inventory.count(TOKEN) > 0) return false;
  if (g.money < TOKEN_PRICE || !g.inventory.add(TOKEN, 1)) return false;
  g.money -= TOKEN_PRICE;
  return true;
}

// ---- The gifts -------------------------------------------------------------

export interface CourtResult {
  message: string;
  /** True when the item left the pack. */
  consumed: boolean;
}

const nameOf = (id: string): string => villagerById(id)?.name ?? id;

/**
 * Give the bouquet or the token to a villager. Returns undefined when `held` is
 * neither, so the caller goes on with an ordinary gift. A refusal keeps the
 * item and says why in a gentle placeholder line.
 */
export function courtGift(
  g: GameState,
  id: string,
  held: string | undefined,
): CourtResult | undefined {
  if (held !== BOUQUET && held !== TOKEN) return undefined;
  const name = nameOf(id);
  const m = g.marriage;
  const no = (message: string): CourtResult => ({ message, consumed: false });
  if (g.inventory.count(held) < 1) return undefined;
  if (!isCandidate(id))
    return no(`${name} smiles kindly. This is not a gift for a friend.`);
  const points = g.friendship.points(id);
  if (held === BOUQUET) {
    if (m.isPartner(id))
      return no(`${name} already has your bouquet. Thank you again.`);
    if (m.stage !== "none")
      return no(`${name} smiles, but your heart is spoken for.`);
    if (points < COURT_HEARTS * HEART)
      return no(
        `${name} is touched, but you do not know each other well enough yet.`,
      );
    if (
      !m.court(id, points) ||
      !(g.friendship.hasBouquet(id) || g.friendship.giveBouquet(id))
    )
      return no(`${name} cannot take it.`);
    g.inventory.remove(held, 1);
    setFlag(g, `bouquet-${id}`);
    // An ex can be courted again (owner, 2026-11-16): hearts are as the divorce left them, the ex mark is lifted.
    if (hasFlag(g, exFlag(id))) {
      g.flags = (g.flags ?? []).filter((f) => f !== exFlag(id));
      g.friendship.setExes(exSpouses(g));
    }
    return {
      message: `${name} takes the bouquet, blushing. PLACEHOLDER TEXT: you are courting.`,
      consumed: true,
    };
  }
  if (m.stage === "courting" && m.spouse === id) {
    if (points < PROPOSE_HEARTS * HEART)
      return no(`${name} holds your hands, but asks for a little more time.`);
    if (!m.engage(id, points, g.day.clock.day))
      return no(`${name} cannot take it.`);
    g.inventory.remove(held, 1);
    setFlag(g, `token-${id}`);
    return {
      message: `${name} says yes. PLACEHOLDER TEXT: the wedding is in three days.`,
      consumed: true,
    };
  }
  return no(
    m.isPartner(id)
      ? `${name} is already promised to you.`
      : `${name} is not courting you. Give a bouquet first.`,
  );
}

// ---- The wedding -----------------------------------------------------------

/** Why today's wedding cannot take place (a festival or a rain day), or "". */
export function weddingBlock(g: Pick<GameState, "weather" | "day">): string {
  const day = g.day.clock.day;
  if (festivalDayToday(day)) return "festival";
  if (isRaining(g.weather)) return "rain";
  return "";
}

/**
 * The morning check. Returns "go" when the wedding is today and may start,
 * "postponed" when it was today and a festival or rain put it off a day, or
 * "none".
 */
export function weddingMorning(g: GameState): "go" | "postponed" | "none" {
  const day = g.day.clock.day;
  if (!g.marriage.weddingToday(day)) return "none";
  if (weddingBlock(g)) {
    g.marriage.postpone();
    return "postponed";
  }
  return "go";
}

/**
 * The calendar mark for the wedding day (note 84): a journal line while engaged,
 * a "married since" line afterwards, or "" otherwise. A festival or a rain day moves the day, and this follows it.
 */
export function weddingMark(g: Pick<GameState, "marriage" | "day">): string {
  const m = g.marriage;
  // Once married the journal keeps a line, so the day is not forgotten (owner, 2026-11-20).
  if (m.married && m.spouse) {
    const { season, dayOfSeason, year } = dateOf(m.weddingDay);
    return `Married to ${nameOf(m.spouse)} since ${season} ${dayOfSeason}, year ${year}.`;
  }
  if (m.stage !== "engaged" || !m.spouse) return "";
  const { season, dayOfSeason } = dateOf(m.weddingDay);
  const left = m.weddingDay - g.day.clock.day;
  const when =
    left <= 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} days`;
  return `Wedding with ${nameOf(m.spouse)}: ${season} ${dayOfSeason}, ${when}. A festival or a rain day puts it off a day.`;
}

export const weddingId = (spouse: string): string => `wedding-${spouse}`;
export const isWeddingId = (id: string): boolean => id.startsWith("wedding-");

/**
 * The wedding as a scene for the heart event runner (note 62, note 84): the
 * hat-maker's ledger reading is placeholder text on the festival green, every
 * line the same for all 14. Not in the heart event files: built from the id.
 */
export function weddingEvent(
  spouse: string,
  guests: readonly string[] = [],
): HeartEvent {
  const name = nameOf(spouse);
  const scene: Cmd[] = [
    { cmd: "fade", to: "black" },
    { cmd: "place", who: "player", mark: "green-left" },
    { cmd: "place", who: spouse, mark: "green-right" },
    ...guests.map((who, i): Cmd => ({
      cmd: "place",
      who,
      mark: `green-guest-${i + 1}`,
    })),
    { cmd: "fade", to: "clear" },
    {
      cmd: "say",
      who: spouse,
      line: `PLACEHOLDER TEXT. ${name} and you stand on the festival green. The two ledgers are read and joined.`,
    },
    {
      cmd: "say",
      who: "player",
      line: "PLACEHOLDER TEXT. I do.",
    },
    { cmd: "emote", who: spouse, emote: "smile" },
    {
      cmd: "say",
      who: spouse,
      line: "PLACEHOLDER TEXT. The day is ours. Come home when you are ready.",
    },
    { cmd: "fade", to: "black" },
  ];
  return {
    id: weddingId(spouse),
    villager: spouse,
    place: "hw:green",
    hearts: PROPOSE_HEARTS,
    scene,
  };
}

/**
 * The wedding scene is over: the pair are married, the spouse's heart cap lifts
 * and the spouse room appears. The day is free, so nothing else changes.
 */
export function finishWedding(g: GameState): boolean {
  const spouse = g.marriage.spouse;
  if (!spouse || !g.marriage.marry(g.day.clock.day)) return false;
  g.friendship.setSpouse(spouse);
  return true;
}
