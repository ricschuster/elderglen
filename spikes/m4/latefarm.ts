// Size of a built-up late farm (issue 948 follow-up). Takes the expert bot's day 84 save, then
// fills the sections the bot leaves thin with plausible late-game data, round trips it through
// deserialize and serialize so the loader accepts it, and prints raw and gzip bytes by area.
// Run: node scripts/sim/run.mjs spikes/m4/latefarm.ts
import { playGame } from "../../scripts/sim/bot";
import { PERSONAS } from "../../scripts/sim/personas";
import { deserialize, serialize } from "../../src/core/save";
import { GALLERY_IDS } from "../../src/core/gallery";
import { SPECIES_ORDER } from "../../src/core/animals";
import items from "../../src/content/item-table.json";
import { gzipSync } from "node:zlib";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ids = (items as { id: string }[])
  .map((i) => i.id)
  .filter((id) => !id.startsWith("tool:"));
const stack = (n: number) => ({
  id: ids[(n * 7) % ids.length]! + (n % 5 === 0 ? "@gold" : ""),
  count: 1 + (n % 99),
});

function inflate(base: string): string {
  const d = JSON.parse(base) as Record<string, any>;
  d.inventory = Array.from({ length: 36 }, (_, i) => stack(i));
  // Fields: 900 tilled tiles, 600 with crops.
  for (let i = 0; i < 900; i++) {
    d.farm[`${20 + (i % 40)},${70 + Math.floor(i / 40)}`] = {
      tilled: true,
      wateredToday: i % 2 === 0,
      ...(i < 600
        ? { crop: { id: "corn", daysGrown: i % 12, harvests: i % 9 } }
        : {}),
    };
  }
  const placed: Record<string, unknown[]> = { farm: [] };
  let x = 5;
  const at = () => ({ x: 5 + (x % 60), y: 100 + Math.floor(x++ / 60) });
  for (let i = 0; i < 80; i++)
    placed.farm!.push({ ...at(), id: "quality-sprinkler" });
  const machineIds = [
    "keg",
    "preserves-jar",
    "cheese-press",
    "loom",
    "bee-house",
    "furnace",
    "seed-maker",
    "mayonnaise-machine",
    "oil-maker",
    "cask",
  ];
  for (let i = 0; i < 60; i++)
    placed.farm!.push({
      ...at(),
      id: machineIds[i % machineIds.length],
      state: {
        job: {
          output: ids[i % ids.length],
          count: 1 + (i % 5),
          doneAt: 100000 + i * 37,
          input: { item: ids[(i * 3) % ids.length], use: 1 },
        },
      },
    });
  for (let i = 0; i < 30; i++)
    placed.farm!.push({
      ...at(),
      id: i % 3 === 0 ? "big-chest" : "chest",
      state: {
        slots: Array.from({ length: i % 3 === 0 ? 70 : 36 }, (_, k) =>
          stack(i * 70 + k),
        ),
      },
    });
  for (let i = 0; i < 80; i++)
    placed.farm!.push({ ...at(), id: i % 2 ? "wood-lamp-post" : "torch" });
  d.placed = placed;
  // Fruit trees and tea bushes.
  d.mapItems.farm.fruitTrees = Array.from({ length: 60 }, (_, i) => ({
    x: 3 + (i % 30),
    y: 140 + Math.floor(i / 30),
    id: "apricot",
    age: 200 + i,
    fruit: i % 4,
    hits: 0,
  }));
  // Animals: coop, barn, 3 ponds-worth of fish not modelled; 12 coop, 12 barn animals.
  const animals = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    species: SPECIES_ORDER[i % SPECIES_ORDER.length],
    name: `Animal ${i}`,
    age: 60 + i,
    friendship: 900,
    mood: 200,
    fed: true,
    petted: true,
    outside: false,
    fresh: false,
    lay: 1,
    grazed: true,
    product: "silver",
  }));
  Object.assign(d.animals, {
    coopBuilt: true,
    tier: 3,
    barnBuilt: true,
    barnTier: 3,
    silo: true,
    hay: 240,
    animals,
    nextId: 25,
    stableBuilt: true,
  });
  d.gallery = GALLERY_IDS.slice(0, 94);
  d.bin.lines = Array.from({ length: 30 }, (_, i) => ({
    ...stack(i),
    unit: 100,
  }));
  return JSON.stringify(d);
}

const area = (d: Record<string, unknown>, keys: string[]) => {
  const part = Object.fromEntries(
    keys.filter((k) => k in d).map((k) => [k, d[k]]),
  );
  const s = JSON.stringify(part);
  return [s.length, gzipSync(s).length] as const;
};

export async function main() {
  let base = "";
  playGame(PERSONAS.expert!, mulberry32(1), 84, (g) => {
    if (g.day.clock.day === 84) base = serialize(g);
  });
  const g = deserialize(inflate(base));
  if (!g) throw new Error("loader rejected the built-up save");
  const text = serialize(g);
  const d = JSON.parse(text) as Record<string, unknown>;
  const kb = (n: number) => (n / 1024).toFixed(1);
  const row = (name: string, keys: string[]) => {
    const [r, z] = area(d, keys);
    console.log(`${name}: ${kb(r)} KB raw, ${kb(z)} KB gzip`);
  };
  console.log(
    `total: ${kb(text.length)} KB raw, ${kb(gzipSync(text).length)} KB gzip`,
  );
  row("areas (other maps)", ["areas"]);
  row("trees, rocks, weeds, grass, twigs, ground", [
    "trees",
    "rocks",
    "weeds",
    "grass",
    "twigs",
    "ground",
  ]);
  row("farm soil and crops", ["farm", "greenhouse"]);
  row("placed (sprinklers, machines, chests, lamps)", ["placed"]);
  row("fruit trees and tea", ["mapItems"]);
  row("animals", ["animals"]);
  row("inventory and bin", ["inventory", "bin"]);
  row("gallery", ["gallery"]);
  const rest = Object.keys(d).filter(
    (k) =>
      ![
        "areas",
        "trees",
        "rocks",
        "weeds",
        "grass",
        "twigs",
        "ground",
        "farm",
        "greenhouse",
        "placed",
        "mapItems",
        "animals",
        "inventory",
        "bin",
        "gallery",
      ].includes(k),
  );
  row("everything else", rest);
}
