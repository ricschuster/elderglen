import { childById, childrenOn, talkToChild } from "./children";
import { dateOf } from "./calendar";
import { clockText } from "./clock";
import { courtGift } from "./courtship";
import {
  jealousyLine,
  kiss,
  kissLine,
  spouseId,
  spouseLine,
  villagerForDay,
} from "./spouse";
import { villagerNow, type FestivalOpts } from "./festivalroutes";
import { HEART, Friendship, isBirthday, type Taste } from "./friendship";
import type { GameState } from "./save";
import {
  SHOPS,
  dayContext,
  shopState,
  villagerById,
  VILLAGERS,
} from "./villagers";

/**
 * Villagers in the scenes (#599 slice 3, notes 79 and 80). Pure: who stands on
 * a map at a time, and what talking or giving them something does. The scene
 * only draws the result. All dialogue here is placeholder text (no dialogue is
 * written yet), one line per kind of meeting.
 */

export interface Present {
  id: string;
  name: string;
  /** Tile on the map the scene is showing. */
  x: number;
  y: number;
  /** True when the tile is a stand-in until the maps place the person. */
  placeholder: boolean;
  /** True while a festival marcher is walking the parade (the scene walks the sprite, note 82). */
  marching?: boolean;
}

/**
 * The villagers standing on a map at a game-clock minute. Nobody asleep, in
 * transit or on another map is listed. Tiles are the schedule's (the place
 * table is partly placeholder, see `resolvePlace`).
 */
export function villagersOn(
  g: Pick<GameState, "weather"> &
    Partial<Pick<GameState, "marriage" | "houseTier">>,
  mapId: string,
  day: number,
  minutes: number,
  opts: FestivalOpts = {},
): Present[] {
  const ctx = dayContext(day, g.weather);
  const out: Present[] = [];
  for (const row of VILLAGERS) {
    // The spouse keeps a route built from their own from the morning after the wedding (note 84).
    const v = villagerForDay(g, row, day, g.weather);
    // The festival layer comes first (note 79 selection order, note 82).
    const n = villagerNow(v, day, ctx, minutes, opts);
    if (n.festival) {
      if (n.festival.map !== mapId) continue;
      out.push({
        id: v.id,
        name: v.name,
        x: n.festival.x,
        y: n.festival.y,
        placeholder: false,
        ...(n.festival.state === "marching" ? { marching: true } : {}),
      });
      continue;
    }
    const w = n.route;
    if (w.asleep || w.where.transit || w.where.map !== mapId) continue;
    out.push({
      id: v.id,
      name: v.name,
      x: w.where.x,
      y: w.where.y,
      placeholder: w.where.placeholder,
    });
  }
  // The children walk their stage's route in the house (note 12, slice 5).
  if (g.marriage && "houseTier" in g)
    for (const c of childrenOn(
      g as Pick<GameState, "weather" | "marriage" | "houseTier">,
      mapId,
      day,
      minutes,
    ))
      out.push({ ...c, placeholder: false });
  return out;
}

/** The villager on a tile, if any. */
export const presentAt = (
  list: readonly Present[],
  x: number,
  y: number,
): Present | undefined => list.find((p) => p.x === x && p.y === y);

/** "3 hearts" for a person, singular for one. */
export function heartText(points: number): string {
  const n = Math.floor(points / HEART);
  return `${n} ${n === 1 ? "heart" : "hearts"}`;
}

/** Placeholder lines, by kind. `{name}` is the person. */
const LINES = {
  first: "Hello. I am {name}. Good to meet you.",
  talk: "{name} nods and chats for a while.",
  already: "{name} has nothing new to say today.",
  birthday: "{name} says it is their birthday today.",
  love: "{name} lights up. This is wonderful.",
  like: "{name} smiles. Thank you.",
  neutral: "{name} accepts it. Thank you.",
  dislike: "{name} frowns a little. Oh. Thanks.",
  hate: "{name} looks upset. Please do not give me that.",
  today: "{name} has had a gift from you today.",
  week: "{name} has had enough gifts this week.",
} as const;

const line = (key: keyof typeof LINES, name: string): string =>
  LINES[key].replace("{name}", name);

/** The note on a shopkeeper whose counter is shut right now, or "". */
export function shopNote(
  g: Pick<GameState, "weather">,
  id: string,
  day: number,
  minutes: number,
): string {
  const v = villagerById(id);
  const shop = v?.shop && SHOPS.find((s) => s.id === v.shop);
  if (!shop) return "";
  const ctx = dayContext(day, g.weather);
  // Festival closures and the hall opening the shop every day are not wired yet (placeholder).
  const state = shopState(shop, ctx.weekday, g.weather, minutes);
  if (state === "open") return "";
  return state === "door"
    ? ` The ${shop.name.toLowerCase()} counter is shut. Only the door is open.`
    : ` The ${shop.name.toLowerCase()} is closed. It opens at ${clockText(shop.open)}.`;
}

export interface MeetResult {
  message: string;
  /** The gift item taken from the pack, if one was given. */
  consumed?: string;
  /** True when the first kiss of the day was given: the scene shows hearts. */
  kiss?: boolean;
}

const TASTE_KEY: Record<Taste, keyof typeof LINES> = {
  love: "love",
  like: "like",
  neutral: "neutral",
  dislike: "dislike",
  hate: "hate",
};

/**
 * What happens when the player uses Action or taps a villager. First meeting is
 * a talk. With an item held and a gift allowed, the item is given; otherwise it
 * is the daily talk (+20 once a day). Returns the placeholder line with the
 * heart count and any birthday and shop note.
 */
export function meet(
  g: GameState,
  id: string,
  held: string | undefined,
): MeetResult {
  if (childById(g, id)) return { message: talkToChild(g, id).message };
  const v = villagerById(id);
  if (!v) return { message: "" };
  const f: Friendship = g.friendship;
  const day = g.day.clock.day;
  const birthday = isBirthday(id, day);
  const tail = (): string =>
    ` (${heartText(f.points(id))})${birthday ? " It is their birthday today!" : ""}${shopNote(g, id, day, g.day.clock.minutes)}`;
  if (!f.met(id)) {
    f.talk(id, day);
    return { message: line("first", v.name) + tail() };
  }
  const court = courtGift(g, id, held);
  if (court)
    return {
      message: court.message + tail(),
      ...(court.consumed ? { consumed: held } : {}),
    };
  if (held && f.canGift(id, day) && g.inventory.count(held) > 0) {
    const r = f.gift(id, held, day);
    if (r.ok) {
      g.inventory.remove(held, 1);
      const jealous = jealousyLine(g, id, r.taste);
      return {
        message:
          line(TASTE_KEY[r.taste], v.name) +
          (jealous ? ` ${jealous}` : "") +
          tail(),
        consumed: held,
      };
    }
  }
  const t = f.talk(id, day);
  // The spouse has a line by heart level, and the first kiss of the day restores energy (note 12).
  if (spouseId(g) === id) {
    const kissed = kiss(g, id) !== undefined;
    return {
      message:
        spouseLine(g, id, day) + (kissed ? ` ${kissLine(id)}` : "") + tail(),
      ...(kissed ? { kiss: true } : {}),
    };
  }
  return {
    message:
      (t.ok
        ? line(birthday ? "birthday" : "talk", v.name)
        : line("already", v.name)) + tail(),
  };
}

/** The date of a person's next birthday text, e.g. "fall 4", for the dialogue panel. */
export function birthdayText(id: string): string {
  const b = villagerById(id)?.birthday;
  return b ? `${b.season} ${b.day}` : "";
}

/** True for a day number that is somebody's birthday (for a morning notice). */
export function birthdaysOn(day: number): string[] {
  const { season, dayOfSeason } = dateOf(day);
  return VILLAGERS.filter(
    (v) => v.birthday.season === season && v.birthday.day === dayOfSeason,
  ).map((v) => v.name);
}
