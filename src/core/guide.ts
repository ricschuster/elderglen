import guideText from "../content/guide-text.json";
import { ALL_CROPS, type CropDef } from "./crops";
import { FISH, type FishDef } from "./fishing";
import { FORAGE } from "./forage";
import { shippedOf } from "./achievements";
import { seedId, itemById } from "./items";
import { splitQuality } from "./quality";
import { SHOPS, VILLAGERS, type Villager } from "./villagers";
import type { Taste } from "./friendship";
import type { GameState } from "./save";

/**
 * The in-game Guide (`docs/design/101_in_game_guide.md`). A reference built
 * from the same data as the wiki, showing only what the player has found. An
 * entry is hidden until seen, and `known` once the player has done the thing.
 * Cards hold no facts of their own: every line is read from the content data.
 * Pure rules, free of Phaser.
 */

/** Items the player has ever held, noted by `sweep`. The one save field the Guide adds. */
export class Guide {
  private held = new Set<string>();

  has(base: string): boolean {
    return this.held.has(base);
  }

  note(id: string): void {
    this.held.add(splitQuality(id).base);
  }

  /** Note everything in the backpack. Called when the game saves and when the Guide opens. */
  sweep(g: GameState): void {
    for (const s of g.inventory.save()) if (s) this.note(s.id);
  }

  save(): string[] {
    return [...this.held].sort();
  }

  load(raw: unknown): void {
    this.held = new Set();
    if (!Array.isArray(raw)) return;
    for (const id of raw) if (typeof id === "string") this.held.add(id);
  }
}

export type GuideState = "seen" | "known";

export interface GuideEntry {
  id: string;
  name: string;
  state: GuideState;
  /** The cleared one-line blurb, when the wiki text has one that is not a draft. */
  blurb?: string;
  /** The facts the player has earned, one per line. */
  lines: string[];
}

export interface GuideCategory {
  id: string;
  name: string;
  entries: GuideEntry[];
}

type TextBook = Record<string, Record<string, string>>;
const TEXT = guideText as TextBook;
const blurbOf = (cat: string, id: string): string | undefined =>
  TEXT[cat]?.[id];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const seasons = (s: readonly string[]) =>
  s.length === 4 ? "Every season" : s.map(cap).join(", ");

const WATERS: Record<string, string> = {
  river: "River",
  "forest-lake": "Forest lake",
  "mountain-lake": "Mountain lake",
  "marsh-lake": "Delta marsh lake",
  sea: "Sea",
  "woods-pond": "Secret Woods pond",
  cove: "Lake cove",
};
const TIMES: Record<string, string> = {
  dawn: "Dawn",
  day: "Daytime",
  dusk: "Dusk",
  night: "Night",
  rain: "Rain",
  any: "Any time",
};

function cropEntry(g: GameState, c: CropDef): GuideEntry | undefined {
  const grown = g.guide.has(c.id) || shippedOf(g, c.id) > 0;
  const seed = g.guide.has(seedId(c.id));
  if (!grown && !seed) return undefined;
  const lines = [`Grows in: ${seasons(c.seasons)}`];
  if (grown) {
    lines.push(`Takes ${c.growDays} days to grow`);
    if (c.regrowDays) lines.push(`Gives more every ${c.regrowDays} days`);
    lines.push(`Sells for ${c.sellPrice} g`);
  }
  return {
    id: c.id,
    name: c.name,
    state: grown ? "known" : "seen",
    lines,
  };
}

function fishEntry(g: GameState, f: FishDef): GuideEntry | undefined {
  const rec = g.fishing.record(f.id);
  if (!rec) return undefined;
  const lines = [
    `Found in: ${WATERS[f.water] ?? f.water}`,
    `Season: ${seasons(f.seasons)}`,
    `Time: ${TIMES[f.time] ?? f.time}`,
  ];
  if (f.weather)
    lines.push(`Weather: ${f.weather === "rain" ? "Rain" : "Clear sky"}`);
  lines.push(`Sells for ${f.sellPrice} g`, `Longest caught: ${rec.longest} cm`);
  return {
    id: f.id,
    name: f.name,
    state: "known",
    blurb: blurbOf("fish", f.id),
    lines,
  };
}

function forageEntries(g: GameState): GuideEntry[] {
  const out: GuideEntry[] = [];
  for (const f of FORAGE) {
    if (!g.guide.has(f.id)) continue;
    const lines = [
      `Found in: ${seasons(f.seasons)}`,
      `Sells for ${f.sellPrice} g`,
    ];
    if (f.energy) lines.push(`Eating it gives ${f.energy} energy`);
    out.push({
      id: f.id,
      name: f.name,
      state: "known",
      blurb: blurbOf("forage", f.id),
      lines,
    });
  }
  return out;
}

const TASTE_WORDS: Record<Taste, string> = {
  love: "Loves",
  like: "Likes",
  neutral: "Neither likes nor dislikes",
  dislike: "Dislikes",
  hate: "Hates",
};
const TASTE_ORDER: Taste[] = ["love", "like", "neutral", "dislike", "hate"];

function personEntry(g: GameState, v: Villager): GuideEntry | undefined {
  if (!g.friendship.met(v.id)) return undefined;
  const lines = [
    `${cap(v.role)}`,
    `Birthday: ${cap(v.birthday.season)} ${v.birthday.day}`,
  ];
  // A gift taste is learned only by giving that item (note 101). The list is never shown whole.
  const log = g.friendship.giftLog(v.id);
  for (const t of TASTE_ORDER) {
    const names = Object.entries(log)
      .filter(([, taste]) => taste === t)
      .map(([item]) => itemById(item)?.name ?? item);
    if (names.length) lines.push(`${TASTE_WORDS[t]}: ${names.join(", ")}`);
  }
  const shop = SHOPS.find((s) => s.id === v.shop);
  if (shop) lines.push(`Keeps ${shop.name}`);
  return {
    id: v.id,
    name: v.knownAs ?? v.name,
    state: "known",
    blurb: blurbOf("people", v.id),
    lines,
  };
}

function itemEntries(g: GameState): GuideEntry[] {
  const out: GuideEntry[] = [];
  const crop = new Set(ALL_CROPS.map((c) => c.id));
  const forage = new Set(FORAGE.map((f) => f.id));
  const fish = new Set(FISH.map((f) => f.id));
  for (const id of g.guide.save()) {
    if (crop.has(id) || forage.has(id) || fish.has(id)) continue;
    if (id.endsWith("-seed")) continue;
    const def = itemById(id);
    if (!def) continue;
    const lines = [
      def.keep ? "Cannot be sold" : `Sells for ${def.sellPrice} g`,
    ];
    if (def.energy) lines.push(`Eating it gives ${def.energy} energy`);
    out.push({
      id,
      name: def.name,
      state: "known",
      blurb: blurbOf("items", id),
      lines,
    });
  }
  return out;
}

const byName = (a: GuideEntry, b: GuideEntry) => a.name.localeCompare(b.name);

/** Every category with the entries the player has earned. Empty categories are kept so the page shows them. */
export function guideCategories(g: GameState): GuideCategory[] {
  g.guide.sweep(g);
  const some = <T>(xs: (T | undefined)[]) => xs.filter((x): x is T => !!x);
  return [
    {
      id: "crops",
      name: "Crops",
      entries: some(ALL_CROPS.map((c) => cropEntry(g, c))).sort(byName),
    },
    {
      id: "fish",
      name: "Fish",
      entries: some(FISH.map((f) => fishEntry(g, f))).sort(byName),
    },
    { id: "forage", name: "Forage", entries: forageEntries(g).sort(byName) },
    {
      id: "people",
      name: "People",
      entries: some(VILLAGERS.map((v) => personEntry(g, v))).sort(byName),
    },
    { id: "items", name: "Items", entries: itemEntries(g).sort(byName) },
  ];
}
