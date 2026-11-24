import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { playGame } from "../scripts/sim/bot";
import { PERSONAS } from "../scripts/sim/personas";
import { seeded } from "../src/core/rng";

/** One short seeded run, as a digest per day and the Math.random call count. */
function run(seed: number, days: number) {
  const spy = vi.spyOn(Math, "random");
  const digests: string[] = [];
  const result = playGame(PERSONAS.expert!, seeded(seed), days, (g) => {
    digests.push(
      JSON.stringify([
        g.day.clock.day,
        g.day.clock.minutes,
        g.money,
        g.inventory.save(),
      ]),
    );
  });
  const calls = spy.mock.calls.length;
  spy.mockRestore();
  return { digests, calls, result };
}

describe("sim determinism", () => {
  it("the same seed gives the same state every day, with no unseeded rolls", () => {
    const a = run(1, 2);
    const b = run(1, 2);
    expect(a.calls).toBe(0);
    expect(b.digests).toEqual(a.digests);
    expect(b.result).toEqual(a.result);
  }, 60_000);
});

describe("Math.random in core", () => {
  it("is only a default for an injectable random, never a bare call", () => {
    const dir = join(__dirname, "../src/core");
    const bare: string[] = [];
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts")))
      readFileSync(join(dir, f), "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/Math\.random\(/.test(line) && !/^\s*(\*|\/\/)/.test(line))
            bare.push(`${f}:${i + 1}`);
        });
    expect(bare).toEqual([]);
  });
});
