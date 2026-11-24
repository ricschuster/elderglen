// `node scripts/sim/run.mjs scripts/sim/withered.ts [persona] [seeds] [days]`
// Breaks the crops that wither at a season turn down by cause, crop and planting day.
import { dateOf, DAYS_PER_SEASON } from "../../src/core/calendar";
import { cropById } from "../../src/core/crops";
import { seeded } from "../../src/core/rng";
import { playGame } from "./bot";
import { PERSONAS } from "./personas";

export async function main(args: string[]): Promise<void> {
  const persona = PERSONAS[args[0] ?? "expert"]!;
  const seeds = Number(args[1] ?? 3);
  const days = Number(args[2] ?? 168);
  const cause = new Map<string, number>();
  const byCrop = new Map<string, number>();
  const byPlantDay = new Map<number, number>();
  const deficit = new Map<number, number>();
  const slack = new Map<string, number>();
  const bump = <K>(m: Map<K, number>, k: K) => m.set(k, (m.get(k) ?? 0) + 1);
  for (let seed = 1; seed <= seeds; seed++) {
    const planted = new Map<string, number>();
    const grown = new Map<string, number>();
    playGame(persona, seeded(seed), days, (g) => {
      const day = g.day.clock.day;
      const { dayOfSeason } = dateOf(day);
      const next = dateOf(day + 1).season;
      for (const { x, y, plot } of g.farm.each()) {
        const k = `${x},${y}`;
        if (!plot.crop) {
          planted.delete(k);
          grown.delete(k);
          continue;
        }
        const prev = grown.get(k) ?? 0;
        grown.set(k, plot.crop.daysGrown);
        if (!planted.has(k) || (prev > 0 && plot.crop.daysGrown < prev))
          planted.set(k, day);
        if (dayOfSeason !== DAYS_PER_SEASON) continue;
        const def = cropById(plot.crop.id)!;
        if (def.seasons.includes(next)) continue;
        const ripe = plot.crop.daysGrown >= def.growDays - 1e-6;
        const c =
          plot.crop.harvests > 0
            ? "regrowing, already harvested"
            : ripe
              ? "ripe, unharvested"
              : "unripe at turn";
        bump(cause, c);
        if (c === "unripe at turn") {
          bump(deficit, Math.round(def.growDays - plot.crop.daysGrown));
          const at = (planted.get(k) ?? 0) - (day - DAYS_PER_SEASON);
          bump(
            slack,
            `left ${DAYS_PER_SEASON - at} grow ${def.growDays} short ${Math.round(def.growDays - plot.crop.daysGrown)}`,
          );
        }
        bump(byCrop, `${plot.crop.id} (${c})`);
        bump(byPlantDay, (planted.get(k) ?? 0) - (day - DAYS_PER_SEASON));
      }
    });
  }
  console.log(`${args[0] ?? "expert"}: ${seeds} seeds`);
  console.log([...cause]);
  console.log([...byCrop].sort((a, b) => b[1] - a[1]));
  console.log(
    "days short of ripe:",
    [...deficit].sort((a, b) => a[0] - b[0]),
  );
  console.log([...slack].sort((a, b) => b[1] - a[1]).slice(0, 30));
  console.log(
    "by planting day of season:",
    [...byPlantDay].sort((a, b) => a[0] - b[0]),
  );
}
