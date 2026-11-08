// `npm run sim -- <expert|intermediate|casual> [runs] [maxDay]`
// Plays the core rules headless over many seeds and prints how fast the hall
// bundles get done (note 46). Not a gate, like the browser playtests.
import { BUNDLES } from "../../src/core/bundles";
import { clockText } from "../../src/core/clock";
import { playGame, UNPLAYED_BUNDLES, type RunResult } from "./bot";
import { PERSONAS } from "./personas";
import { TIME } from "./world";

/** A small seeded generator, so a run is exactly repeatable. */
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

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? NaN : (s[Math.floor((s.length - 1) / 2)] as number);
};

function spread(xs: number[], total: number): string {
  if (xs.length === 0) return `0 of ${total} finished`;
  const s = [...xs].sort((a, b) => a - b);
  return `median ${median(xs)}, range ${s[0]} to ${s[s.length - 1]}, ${xs.length} of ${total}`;
}

const env_ = (
  globalThis as unknown as {
    process: { env: Record<string, string | undefined> };
  }
).process.env;

export async function main(args: string[]): Promise<void> {
  const name = args[0] ?? "expert";
  const runs = Number(args[1] ?? 100);
  const maxDay = Number(args[2] ?? 112);
  // SIM_ACTION, SIM_DIAGONAL, SIM_TRANSITION override the time model, for
  // checking how much a result depends on it.
  for (const [env, field] of [
    ["SIM_ACTION", "action"],
    ["SIM_DIAGONAL", "diagonal"],
    ["SIM_TRANSITION", "transition"],
  ] as const) {
    const v = env_[env];
    if (v !== undefined) TIME[field] = Number(v);
  }
  const persona = PERSONAS[name];
  if (!persona) throw new Error(`unknown persona ${name}`);

  const results: RunResult[] = [];
  for (let seed = 1; seed <= runs; seed++)
    results.push(playGame(persona, mulberry32(seed), maxDay));

  // SIM_VERBOSE=1 prints each seed's bundle days, to chase one odd run.
  if (env_.SIM_VERBOSE)
    results.forEach((r, i) =>
      console.log(`  seed ${i + 1}: ${JSON.stringify(r.bundleDays)}`),
    );
  console.log(`${name}: ${runs} runs to day ${maxDay}`);
  for (const b of BUNDLES)
    console.log(
      `  ${b.id}${UNPLAYED_BUNDLES.includes(b.id) ? " (not played by the bot)" : ""}: ${spread(
        results.flatMap((r) =>
          b.id in r.bundleDays ? [r.bundleDays[b.id] as number] : [],
        ),
        runs,
      )}`,
    );
  console.log(
    `  all played bundles: ${spread(
      results.flatMap((r) => (r.allDay ? [r.allDay] : [])),
      runs,
    )}`,
  );
  const ends = results.flatMap((r) => r.dayEnds);
  console.log(
    `  day ends before bed: median ${clockText(Math.round(median(ends)))}, latest ${clockText(Math.max(...ends))}`,
  );
  console.log(
    `  pass-outs per run: median ${median(results.map((r) => r.passOuts))}`,
  );
  console.log(
    `  withered crops per run: median ${median(results.map((r) => r.withered))}`,
  );
  for (const season of [0, 1, 2, 3]) {
    const money = results.flatMap((r) =>
      r.moneyAtSeasonEnd.slice(season, season + 1),
    );
    console.log(
      `  money at end of season ${season + 1}: ${
        money.length === 0
          ? "no run got there"
          : `median ${median(money)}, ${money.length} runs`
      }`,
    );
  }
}
