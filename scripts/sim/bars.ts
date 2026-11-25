// `node scripts/sim/run.mjs scripts/sim/bars.ts [persona] [seed] [days]`
// Follows the furnace bars of one run day by day (#181 trace): batches started, bars in
// the pack, in the Smith's slots, and spent on sprinklers and machines.
import { seeded } from "../../src/core/rng";
import { playGame } from "./bot";
import { PERSONAS } from "./personas";

export async function main(args: string[]): Promise<void> {
  const persona = PERSONAS[args[0] ?? "expert"]!;
  const seed = Number(args[1] ?? 1);
  const days = Number(args[2] ?? 168);
  const bars = ["copper-bar", "iron-bar", "gold-bar"];
  const last: Record<string, number> = {};
  let smithsLast = "";
  const r = playGame(persona, seeded(seed), days, (g) => {
    const row = bars.map((b) => {
      const pack = g.inventory.count(b);
      const hall = g.hall.have("smiths", b);
      const key = `${pack}+${hall}`;
      const changed = last[b] !== undefined && `${last[b]}` !== key;
      last[b] = key as unknown as number;
      return `${b.replace("-bar", "")} pack ${pack} hall ${hall}${changed ? "*" : ""}`;
    });
    const line = `${row.join(" | ")} | sprinklers ${g.sprinklers.count} | job ${g.furnace.job?.bar ?? "-"} | ore c${g.inventory.count("copper-ore")} i${g.inventory.count("iron-ore")} g${g.inventory.count("gold-ore")} coal ${g.inventory.count("coal")} | money ${g.money}`;
    if (line !== smithsLast && row.some((x) => x.endsWith("*")))
      console.log(`day ${g.day.clock.day}: ${line}`);
    smithsLast = line;
  });
  console.log("batches started", JSON.stringify(r.smelted));
}
