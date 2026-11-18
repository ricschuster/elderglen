import { playGame } from "../../scripts/sim/bot";
import { PERSONAS } from "../../scripts/sim/personas";
import { serialize } from "../../src/core/save";
import { gzipSync } from "node:zlib";
import { writeFileSync } from "node:fs";

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
export async function main() {
  const marks = new Set([1, 28, 56, 84, 112]);
  playGame(PERSONAS.expert!, mulberry32(1), 112, (g) => {
    const d = g.day.clock.day;
    if (!marks.has(d)) return;
    const text = serialize(g);
    // OUT=<file> keeps the day 84 save, as the farm blob for host.mjs (FARM=<file>).
    if (d === 84 && process.env.OUT) writeFileSync(process.env.OUT, text);
    const data = JSON.parse(text) as Record<string, unknown>;
    const parts = Object.entries(data)
      .map(([k, v]) => [k, JSON.stringify(v).length] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    console.log(
      `day ${d}: ${text.length} B, gzip ${gzipSync(text).length} B; top: ${parts.map(([k, n]) => `${k} ${n}`).join(", ")}`,
    );
  });
}
