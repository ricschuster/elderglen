import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isObject } from "../src/core/guards";
import { mapFiles } from "../src/content/maps";
import { serviceLabel } from "../src/core/labels";

const DIR = join(__dirname, "../src/content");
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const read = (f: string): unknown =>
  JSON.parse(readFileSync(join(DIR, f), "utf8"));

type Kind = "string" | "number" | "boolean" | "array" | "object";

/**
 * The fields every row of a list file must carry, with the primitive type each
 * takes (the required fields of the TypeScript def; optional fields are left out).
 */
const S: Kind = "string";
const N: Kind = "number";
const LIST_SHAPES: Record<string, Record<string, Kind>> = {
  "achievements.json": {
    id: S,
    name: S,
    goal: S,
    kind: S,
    threshold: N,
    secret: "boolean",
  },
  "bombs.json": {
    id: S,
    name: S,
    price: N,
    radius: N,
    monsterDamage: N,
    playerPercent: N,
  },
  "boots.json": { id: S, name: S, price: N, defense: N, immunity: N },
  "bundles.json": {
    id: S,
    name: S,
    room: S,
    hint: S,
    items: "array",
    reward: "object",
  },
  "creature-goods.json": { id: S, name: S, sellPrice: N },
  "creatures.json": {
    id: S,
    name: S,
    hp: N,
    xp: N,
    speed: N,
    touch: N,
    sight: N,
    windup: N,
    behaviour: S,
    bands: "array",
    drops: "array",
  },
  "crops.json": {
    id: S,
    name: S,
    growDays: N,
    seasons: "array",
    sellPrice: N,
    seedPrice: N,
  },
  "decor.json": { id: S, name: S, kind: S, color: S, price: N },
  "dishes.json": {
    id: S,
    name: S,
    energy: N,
    sellPrice: N,
    ingredients: "array",
    sources: "array",
  },
  "farm-types.json": {
    id: S,
    name: S,
    map: S,
    perk: S,
    theme: S,
    startSeeds: "object",
    stumpRegrowDays: N,
  },
  "festivals.json": {
    id: S,
    name: S,
    blurb: S,
    season: S,
    day: N,
    opens: N,
    closes: N,
    ends: N,
    counter: "array",
    place: "object",
  },
  "fish.json": {
    id: S,
    name: S,
    behaviour: S,
    difficulty: N,
    length: "array",
    rarity: S,
    seasons: "array",
    sellPrice: N,
    time: S,
    water: S,
  },
  "forage.json": { id: S, name: S, seasons: "array", sellPrice: N },
  "fruit-trees.json": {
    id: S,
    name: S,
    energy: N,
    saplingPrice: N,
    season: S,
    sellPrice: N,
  },
  "furniture.json": { id: S, name: S, color: S, price: N },
  "guide-places.json": { id: S, name: S, line: S },
  "hats.json": { id: S, name: S, color: S },
  "house-renos.json": { id: S, name: S, price: N },
  "house-rooms.json": { id: S, name: S, tier: N, x: N, y: N, w: N, h: N },
  "item-table.json": { id: S, name: S, sellPrice: N },
  "letters.json": { id: S, sender: S, title: S, body: S, trigger: "object" },
  "orders.json": {
    id: S,
    title: S,
    text: S,
    poster: S,
    gold: N,
    windowDays: N,
    repeat: "boolean",
    ask: "object",
    firstReward: "object",
    notSeasons: "array",
  },
  "placeables.json": {
    id: S,
    kind: S,
    blocksWalking: "boolean",
    footprint: "array",
    pickUp: S,
    places: "array",
  },
  "recipes.json": {
    id: S,
    ingredients: "array",
    result: "object",
    sources: "array",
  },
  "rings.json": { id: S, name: S, light: N, magnet: N },
  "rods.json": {
    id: S,
    name: S,
    price: N,
    range: N,
    lures: N,
    barWidth: N,
    bait: "boolean",
  },
  "rooms.json": { id: S, name: S, unlock: S },
  "weapons.json": {
    id: S,
    name: S,
    short: S,
    family: S,
    tier: N,
    damage: N,
    arc: N,
    cooldown: N,
    targets: N,
  },
};

/** Known bad rows: file name, then row id, then the field and why. Empty is the goal. */
const KNOWN_EXCEPTIONS = new Set<string>([]);

function kindOf(v: unknown): Kind | "other" {
  if (Array.isArray(v)) return "array";
  if (isObject(v)) return "object";
  if (typeof v === "string") return "string";
  if (typeof v === "number" && Number.isFinite(v)) return "number";
  if (typeof v === "boolean") return "boolean";
  return "other";
}

describe("content JSON files", () => {
  it("every file parses and holds something", () => {
    expect(files.length).toBeGreaterThan(50);
    for (const f of files) {
      const d = read(f);
      expect(Array.isArray(d) || isObject(d), f).toBe(true);
      expect(Object.keys(d as object).length, f).toBeGreaterThan(0);
    }
  });

  it("names a shape for every list file", () => {
    for (const f of files)
      if (Array.isArray(read(f)))
        expect(LIST_SHAPES[f], `${f} has no shape`).toBeDefined();
  });

  for (const [f, shape] of Object.entries(LIST_SHAPES)) {
    it(`${f} rows carry their required fields`, () => {
      const rows = read(f);
      expect(Array.isArray(rows), f).toBe(true);
      const ids = new Set<unknown>();
      for (const [i, row] of (rows as unknown[]).entries()) {
        expect(isObject(row), `${f}[${i}]`).toBe(true);
        const r = row as Record<string, unknown>;
        for (const [k, want] of Object.entries(shape)) {
          const tag = `${f}[${i}] ${String(r.id)} ${k}`;
          if (KNOWN_EXCEPTIONS.has(tag)) continue;
          expect(kindOf(r[k]), tag).toBe(want);
        }
        expect(ids.has(r.id), `${f} repeats id ${String(r.id)}`).toBe(false);
        ids.add(r.id);
      }
    });
  }
});

describe("map service kinds", () => {
  const ROOT = join(__dirname, "../src");
  const sources = [
    ...readdirSync(join(ROOT, "scenes")).map((f) => join(ROOT, "scenes", f)),
    ...readdirSync(join(ROOT, "core")).map((f) => join(ROOT, "core", f)),
  ]
    .filter((f) => f.endsWith(".ts"))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");

  /** Every service object in every map file: its kind and name. */
  const services: { map: string; id: string; kind: string }[] = [];
  for (const [map, json] of Object.entries(mapFiles))
    for (const layer of json.layers as unknown as {
      objects?: {
        name: string;
        class?: string;
        type?: string;
        properties?: { name: string; value: unknown }[];
      }[];
    }[])
      for (const o of layer.objects ?? [])
        if ((o.class ?? o.type) === "service")
          services.push({
            map,
            id: o.name,
            kind: String(
              o.properties?.find((p) => p.name === "kind")?.value ?? "",
            ),
          });

  /** Kinds that name a screen through a constant, so the value is not written in a scene. */
  const VIA_CONSTANT = new Set(["market-pier", "market-float"]);

  it("finds services to check", () => {
    expect(services.length).toBeGreaterThan(50);
  });

  it("gives every service a kind that a scene or handler knows", () => {
    for (const s of services) {
      const where = `${s.map}:${s.id} kind "${s.kind}"`;
      expect(s.kind, where).not.toBe("");
      const named = serviceLabel(s.kind, s.id) !== undefined;
      const handled =
        VIA_CONSTANT.has(s.kind) || sources.includes(`"${s.kind}"`);
      expect(named || handled, `${where} has no label or handler`).toBe(true);
      expect(handled, `${where} is not handled in src/scenes or src/core`).toBe(
        true,
      );
    }
  });
});
