// `node scripts/sim/run.mjs scripts/sim/watch.ts <persona> <seed> <days> [every]`: one run, one line every few days.
import { BUNDLES } from "../../src/core/bundles";
import { dateOf } from "../../src/core/calendar";
import { FISH } from "../../src/core/fishing";
import { playGame } from "./bot";
import { PERSONAS } from "./personas";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

declare const process: { env: Record<string, string | undefined> };

export async function main(args: string[]): Promise<void> {
  const persona = { ...PERSONAS[args[0] ?? "expert"]! };
  if (process.env.FISH0) persona.fishChance = 0;
  if (process.env.FOREST0) persona.forestChance = 0;
  const seed = Number(args[1] ?? 1);
  const days = Number(args[2] ?? 60);
  const every = Number(args[3] ?? 7);
  const r = playGame(persona, mulberry32(seed), days, (g) => {
    const day = g.day.clock.day;
    if (day % every !== 0) return;
    const done = BUNDLES.filter((b) => g.hall.complete(b.id)).length;
    const inv = (id: string) => g.inventory.count(id);
    const left = BUNDLES.filter((b) => !g.hall.complete(b.id))
      .map((b) => b.id)
      .join(",");
    if (process.env.WATCH_FISH)
      console.log(
        "  fish kinds:",
        FISH.filter((f) => g.fishing.has(f.id))
          .map((f) => f.id)
          .join(","),
      );
    if (process.env.WATCH_STACKS) {
      const out: string[] = [];
      for (let i = 0; i < g.inventory.size; i++) {
        const sl = g.inventory.slot(i);
        if (sl) out.push(`${sl.id}x${sl.count}`);
      }
      console.log("  pack:", out.join(" "));
      console.log(
        "  hall:",
        JSON.stringify(g.hall.save()["lake-fish"] ?? {}),
        g.hall.roomOpen("water-room"),
      );
    }
    console.log(
      `energy ${g.day.energy.current} minutes ${g.day.clock.minutes} bin ${g.bin.isEmpty} crops ${g.farm.cropCount} weather ${g.weather}`,
    );
    console.log(
      `day ${day} ${dateOf(day).season} money ${g.money} bundles ${done}/30 animals ${g.animals.animals.length} coop ${g.animals.coopBuilt ? g.animals.tier : "-"} barn ${g.animals.barnBuilt ? g.animals.barnTier : "-"} house ${g.houseTier} wood ${inv("wood")} stone ${inv("stone")} fish ${g.fishing.total} fl ${g.skills.level("fishing")} fm ${g.skills.level("farming")} left ${left}`,
    );
  });
  console.log(
    "time by step (hours):",
    Object.entries(r.timeBy)
      .map(([k, v]) => `${k} ${(v / 60).toFixed(0)}`)
      .join(", "),
  );
}
