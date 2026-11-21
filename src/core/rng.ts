/** A small seeded generator (mulberry32), so a draw is the same on every reload. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The state's injected RNG, or Math.random (issue 977). Rules take a `random`
 * parameter that defaults to this, so setting `g.rng` makes every roll fixed.
 */
export const rngOf = (g: { rng?: () => number }): (() => number) =>
  g.rng ?? Math.random;
