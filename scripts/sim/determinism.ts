// `node scripts/sim/run.mjs scripts/sim/determinism.ts [persona] [seed] [days]`
// Plays one seed twice and prints the first day whose state digest differs.
// Also reports any call to Math.random or Date.now during the play, with its caller.
import { playGame } from "./bot";
import { PERSONAS } from "./personas";
import { seeded } from "../../src/core/rng";

export async function main(args: string[]): Promise<void> {
  const persona = PERSONAS[args[0] ?? "expert"]!;
  const seed = Number(args[1] ?? 1);
  const days = Number(args[2] ?? 40);
  const callers = new Map<string, number>();
  const realRandom = Math.random;
  const realNow = Date.now;
  const note = (what: string) => {
    const line = (new Error().stack ?? "").split("\n")[3] ?? "?";
    const k = `${what} ${line.trim()}`;
    callers.set(k, (callers.get(k) ?? 0) + 1);
  };
  Math.random = () => (note("Math.random"), realRandom());
  Date.now = () => (note("Date.now"), realNow());
  const play = () => {
    const digests: string[] = [];
    playGame(persona, seeded(seed), days, (g) => {
      digests.push(
        JSON.stringify({
          money: g.money,
          inv: g.inventory.save(),
          day: g.day.clock.day,
          min: g.day.clock.minutes,
        }),
      );
    });
    return digests;
  };
  const a = play();
  const b = play();
  Math.random = realRandom;
  Date.now = realNow;
  const n = Math.max(a.length, b.length);
  let first = -1;
  for (let i = 0; i < n; i++)
    if (a[i] !== b[i]) {
      first = i;
      break;
    }
  console.log(
    first < 0
      ? `identical over ${n} days`
      : `diverges at index ${first}\n${a[first]}\n${b[first]}`,
  );
  for (const [k, v] of callers) console.log(v, k);
}
