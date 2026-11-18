import data from "../content/feast-exchange.json";
import { dateOf } from "./calendar";
import { festivalLayout } from "./festivalroutes";
import { FESTIVALS, festivalDayToday } from "./festivals";
import { tasteOf } from "./friendship";
import { allItems, itemById } from "./items";
import type { LetterDef } from "./mail";
import type { GameState } from "./save";
import { splitQuality } from "./quality";
import { villagerById, VILLAGERS } from "./villagers";

/**
 * The Midwinter Feast gift exchange (`docs/design/105_feast_gift_exchange.md`).
 * The steward's letter on Winter 18 names a recipient; on Winter 25 the player
 * gives them a gift at x5 and the secret giver then hands over a present. Pure
 * rules, free of Phaser. The draws are kept in `festivalsJoined` as
 * `feast-recipient:YEAR:ID`, `feast-given:YEAR` and `feast-giver:YEAR:ID`.
 */
const FEAST = data.festival;

export const EXCHANGE_MULTIPLIER = data.multiplier;

/** A small seeded generator, so a draw is the same on every reload. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashOf = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const yearOf = (g: GameState): number => dateOf(g.day.clock.day).year;
const keyFor = (kind: string, year: number): string => `${kind}:${year}`;

function stored(g: GameState, kind: string, year: number): string | undefined {
  const prefix = `${keyFor(kind, year)}:`;
  return g.festivalsJoined
    .find((k) => k.startsWith(prefix))
    ?.slice(prefix.length);
}

/** Everyone who sits at the feast, in the layout the hall state picks. */
function attendees(hallRestored: boolean, year: number): string[] {
  const f = FESTIVALS.find((x) => x.id === FEAST);
  const layout = f && festivalLayout(f, hallRestored, year);
  return layout ? Object.keys(layout.spots).sort() : [];
}

/** True when this person is a child (children are never named, note 61). */
const isChild = (id: string): boolean => villagerById(id)?.ageBand === "child";

/** The recipient for the year, drawn once and kept. The steward when fewer than three are met. */
export function feastRecipient(g: GameState, hallRestored: boolean): string {
  const year = yearOf(g);
  const have = stored(g, "feast-recipient", year);
  if (have) return have;
  const pool = attendees(hallRestored, year).filter(
    (id) => g.friendship.met(id) && !isChild(id),
  );
  const id =
    pool.length < data.minMet
      ? data.host
      : pool[
          Math.floor(
            seeded(hashOf(`${year}:${pool.join(",")}`))() * pool.length,
          )
        ]!;
  g.festivalsJoined.push(`${keyFor("feast-recipient", year)}:${id}`);
  return id;
}

/** True once the player has given the feast gift this year. */
export const feastGiven = (g: GameState): boolean =>
  g.festivalsJoined.includes(keyFor("feast-given", yearOf(g)));

/** The letter on Winter 18: names the recipient. Queued once, from the night before. */
export function queueFeastLetter(g: GameState, day: number): boolean {
  const { season, dayOfSeason, year } = dateOf(day);
  if (season !== "winter" || dayOfSeason !== data.letterDay) return false;
  const id = `feast-letter-${year}`;
  if (g.mail.has(id)) return false;
  const who = villagerById(feastRecipient(g, false))?.name ?? "someone";
  const letter: LetterDef = {
    id,
    sender: villagerById(data.host)?.name ?? "The steward",
    title: "The Midwinter Feast",
    // PLACEHOLDER TEXT, no voice sheet yet.
    body: `PLACEHOLDER TEXT. At the feast on Winter 25, please give a gift to ${who}. Hold it and speak to them at their seat. Someone will have a present for you.`,
    trigger: { kind: "first-achievement" },
  };
  return g.mail.queue(id, day, letter);
}

/** Whether the exchange is open on this map right now. */
export function exchangeOpen(
  g: GameState,
  mapId: string,
  hallRestored: boolean,
): boolean {
  const day = g.day.clock.day;
  const f = festivalDayToday(day);
  if (f?.id !== FEAST) return false;
  const m = g.day.clock.minutes;
  if (m < f.opens || m >= f.closes) return false;
  return festivalLayout(f, hallRestored, yearOf(g))?.map === mapId;
}

/** True when this person holds the lit lantern right now: the recipient, gift not yet given. */
export function lanternOn(
  g: GameState,
  mapId: string,
  hallRestored: boolean,
  id: string,
): boolean {
  return (
    exchangeOpen(g, mapId, hallRestored) &&
    !feastGiven(g) &&
    feastRecipient(g, hallRestored) === id
  );
}

/**
 * The tile where the lit lantern hangs: just above the recipient's seat, while
 * the lantern is lit (open, gift not given). Undefined when it is out or the
 * recipient has no seat on this map. The prop is drawn there (note 105).
 */
export function lanternTile(
  g: GameState,
  mapId: string,
  hallRestored: boolean,
): readonly [number, number] | undefined {
  if (!exchangeOpen(g, mapId, hallRestored) || feastGiven(g)) return undefined;
  const f = FESTIVALS.find((x) => x.id === FEAST);
  const seat =
    f &&
    festivalLayout(f, hallRestored, yearOf(g))?.spots[
      feastRecipient(g, hallRestored)
    ];
  return seat ? [seat[0], Math.max(0, seat[1] - 1)] : undefined;
}

/** Items a person loves or likes, cheap enough to be a present, best match first. */
export function presentChoices(giver: string): string[] {
  const cap = isChild(giver) ? data.childPresentCap : data.presentCap;
  return allItems()
    .filter((i) => !i.keep && i.sellPrice > 0 && i.sellPrice <= cap)
    .filter((i) => {
      const t = tasteOf(giver, i.id);
      return t === "love" || t === "like";
    })
    .map((i) => i.id)
    .sort();
}

export interface FeastResult {
  message: string;
  /** The item taken from the pack. */
  consumed: string;
  giver?: string;
  present?: string;
}

/** The secret giver and present: someone else met and seated, with something to give. */
function drawGiver(
  g: GameState,
  recipient: string,
  hallRestored: boolean,
): { giver: string; present: string } | undefined {
  const year = yearOf(g);
  const pool = attendees(hallRestored, year).filter(
    (id) =>
      id !== recipient && g.friendship.met(id) && presentChoices(id).length > 0,
  );
  if (pool.length === 0) return undefined;
  const random = seeded(hashOf(`giver:${year}:${recipient}:${pool.join(",")}`));
  const giver = pool[Math.floor(random() * pool.length)]!;
  const choices = presentChoices(giver);
  return { giver, present: choices[Math.floor(random() * choices.length)]! };
}

/**
 * Talk to someone with an item held at the feast. Returns undefined when this
 * is not the exchange (wrong person, closed, already given, nothing held), so
 * the ordinary talk or gift runs. Otherwise gives the x5 gift, reveals the
 * secret giver and hands over the present (by post if the pack is full).
 */
export function feastGive(
  g: GameState,
  mapId: string,
  id: string,
  held: string | undefined,
  hallRestored: boolean,
): FeastResult | undefined {
  if (!held || g.inventory.count(held) <= 0) return undefined;
  if (!lanternOn(g, mapId, hallRestored, id)) return undefined;
  const r = g.friendship.giftFeast(id, held, EXCHANGE_MULTIPLIER);
  if (!r.ok) return undefined;
  g.inventory.remove(held, 1);
  const year = yearOf(g);
  g.festivalsJoined.push(keyFor("feast-given", year));
  const name = villagerById(id)?.name ?? id;
  const mood = {
    love: "loves",
    like: "likes",
    neutral: "accepts",
    dislike: "dislikes",
    hate: "hates",
  }[r.taste];
  let message = `${name} ${mood} the gift (${r.points >= 0 ? "+" : ""}${r.points}).`;
  const draw = drawGiver(g, id, hallRestored);
  if (!draw) return { message, consumed: held };
  g.festivalsJoined.push(`${keyFor("feast-giver", year)}:${draw.giver}`);
  const giverName = villagerById(draw.giver)?.name ?? draw.giver;
  const presentName =
    itemById(splitQuality(draw.present).base)?.name ?? draw.present;
  // PLACEHOLDER TEXT, no voice sheet yet.
  message += ` ${giverName} steps forward: "I was your secret giver. Happy Midwinter!"`;
  if (g.inventory.add(draw.present, 1)) {
    message += ` You get ${presentName}.`;
  } else {
    const letter: LetterDef = {
      id: `feast-present-${year}`,
      sender: giverName,
      title: "Your Midwinter present",
      body: "PLACEHOLDER TEXT. Your pack was full, so the present comes by post.",
      trigger: { kind: "first-achievement" },
      attachment: { items: [{ id: draw.present, count: 1 }] },
    };
    g.mail.queue(letter.id, g.day.clock.day + 1, letter);
    message += ` Your pack is full, so the ${presentName} comes by post.`;
  }
  return { message, consumed: held, giver: draw.giver, present: draw.present };
}

/** All people who could be named, for tests. */
export const FEAST_VILLAGERS: readonly string[] = VILLAGERS.map((v) => v.id);
