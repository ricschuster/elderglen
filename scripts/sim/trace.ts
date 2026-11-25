// `node scripts/sim/run.mjs scripts/sim/trace.ts [persona] [seeds] [days] [seedFrom]`
// Pacing trace (#181): for each bundle a run has not finished by the last day,
// which slots are still empty, and what the pack and the furnace held. Printed as
// counts over the runs, so "the bot never gets it" and "the game makes it slow"
// can be told apart.
import { BUNDLES, LAST_ROOM } from "../../src/core/bundles";
import { seeded } from "../../src/core/rng";
import { playGame } from "./bot";
import { PERSONAS } from "./personas";

const SPECIALTY = ["silverthread", "hermit-trout", "crowned-tunny"];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? NaN : (s[Math.floor((s.length - 1) / 2)] as number);
};

export async function main(args: string[]): Promise<void> {
  const persona = PERSONAS[args[0] ?? "expert"]!;
  const seeds = Number(args[1] ?? 10);
  const days = Number(args[2] ?? 168);
  const from = Number(args[3] ?? 1);
  // bundle -> slot -> runs where the slot was empty at the end
  const missing = new Map<string, Map<string, number>>();
  const unfinished = new Map<string, number>();
  const inPack = new Map<string, number[]>();
  const smelted: Record<string, number[]> = {
    "copper-bar": [],
    "iron-bar": [],
    "gold-bar": [],
  };
  const barsHeld: Record<string, number[]> = {
    "copper-bar": [],
    "iron-bar": [],
    "gold-bar": [],
  };
  const finalMoney: number[] = [];
  const fishCaught = new Map<string, number>();
  const fishStats = new Map<string, { bites: number; landed: number }>();
  const furnaceBusy: number[] = [];
  const furnaceIdle: number[] = [];
  for (let seed = from; seed < from + seeds; seed++) {
    let busy = 0;
    let idle = 0;
    let snap: (() => void) | undefined;
    const r = playGame(persona, seeded(seed), days, (g) => {
      if (g.furnace.gifted) g.furnace.job ? busy++ : idle++;
      snap = () => {
        for (const b of BUNDLES) {
          if (g.hall.complete(b.id)) continue;
          unfinished.set(b.id, (unfinished.get(b.id) ?? 0) + 1);
          const m = missing.get(b.id) ?? new Map<string, number>();
          missing.set(b.id, m);
          for (const i of b.items) {
            const have = g.hall.have(b.id, i.id);
            if (have < i.count) {
              const key = `${i.id} (${have}/${i.count})`;
              m.set(key, (m.get(key) ?? 0) + 1);
            }
          }
        }
        for (const id of [
          "copper-ore",
          "iron-ore",
          "gold-ore",
          "coal",
          "quartz",
          "copper-bar",
          "iron-bar",
          "gold-bar",
          "jam",
          "pickles",
          "honey",
          "apple",
          "cherry",
          "silverthread",
          "hermit-trout",
          "crowned-tunny",
          "pearl-lobster",
        ]) {
          const a = inPack.get(id) ?? [];
          a.push(g.inventory.count(id));
          inPack.set(id, a);
        }
        for (const id of [
          "silverthread",
          "hermit-trout",
          "crowned-tunny",
          "pearl-lobster",
        ])
          fishCaught.set(
            id,
            (fishCaught.get(id) ?? 0) + (g.fishing.record(id)?.count ?? 0),
          );
        finalMoney.push(g.money);
        const trees = [...g.fruitTrees.each()].map((t) => `${t.id}:${t.age}`);
        console.log(`  seed ${seed} fruit trees: ${trees.join(" ") || "none"}`);
        for (const bar of Object.keys(barsHeld))
          barsHeld[bar]!.push(
            g.inventory.count(bar) + (g.hall.have("smiths", bar) as number),
          );
      };
    });
    snap?.();
    for (const bar of Object.keys(smelted))
      smelted[bar]!.push(r.smelted[bar] ?? 0);
    for (const id of SPECIALTY) {
      const f = fishStats.get(id) ?? { bites: 0, landed: 0 };
      f.bites += r.bites[id] ?? 0;
      f.landed += r.landedFish[id] ?? 0;
      fishStats.set(id, f);
    }
    furnaceBusy.push(busy);
    furnaceIdle.push(idle);
  }
  console.log(
    `${persona.name}: seeds ${from} to ${from + seeds - 1}, day ${days}`,
  );
  for (const b of BUNDLES) {
    const n = unfinished.get(b.id) ?? 0;
    if (n === 0) continue;
    const tag =
      b.room === LAST_ROOM ? " [Last Seat, locked until all others]" : "";
    console.log(`  ${b.id}${tag}: unfinished in ${n} of ${seeds}`);
    const m = [...(missing.get(b.id) ?? [])].sort((a, c) => c[1] - a[1]);
    for (const [k, c] of m) console.log(`      empty ${k}: ${c} runs`);
  }
  console.log("  pack at the end, median (max):");
  for (const [id, a] of inPack)
    console.log(`    ${id}: ${median(a)} (${Math.max(...a)})`);
  for (const bar of Object.keys(smelted))
    console.log(
      `  ${bar}: batches started median ${median(smelted[bar]!)}, in pack or Smith's slot median ${median(barsHeld[bar]!)}`,
    );
  console.log(
    `  furnace days busy at day end, median ${median(furnaceBusy)}; idle ${median(furnaceIdle)}`,
  );
  console.log(
    `  specialty fish ever landed (total over runs): ${[...fishCaught].map(([k, v]) => `${k} ${v}`).join(", ")}`,
  );
  console.log(
    `  specialty fish bites and landed, totals over the runs: ${[...fishStats].map(([k, v]) => `${k} ${v.bites} bites, ${v.landed} landed`).join("; ")}`,
  );
  console.log(`  money at the end, median ${median(finalMoney)}`);
}
