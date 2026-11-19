// N desktop guests (real GuestClient) against a host, walking at 5 moves a second.
// Usage: node scripts/sim/run.mjs spikes/m4/deskguests.ts <host ip> [port] [guests] [seconds]
import { GuestClient } from "../../src/net/client";

export async function main(args: string[]) {
  const [ip, port = "8787", n = "6", secs = "45"] = args;
  const pct = (a: number[], p: number) =>
    [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];
  const results = await Promise.all(
    Array.from({ length: Number(n) }, async (_, i) => {
      const t0 = performance.now();
      try {
        const g = await GuestClient.connect(`ws://${ip}:${port}`, {
          name: `desk${i}`,
          timeoutMs: 15000,
        });
        const joinMs = Math.round(performance.now() - t0);
        const rtts: number[] = [];
        g.onMessage = (m) => {
          if (m.t === "snap") {
            const me = m.p[g.id];
            if (me && me[2]) rtts.push(performance.now() - me[2]);
          }
        };
        let k = 0;
        await new Promise<void>((res) => {
          const iv = setInterval(() => {
            g.sendPos(40 + ((k++ + i) % 20), 30 + i, "farm", 0, []);
            if (k >= Number(secs) * 5) (clearInterval(iv), res());
          }, 200);
        });
        const r = {
          i,
          joinMs,
          players: g.players.size,
          n: rtts.length,
          p50: pct(rtts, 0.5),
          p95: pct(rtts, 0.95),
          max: Math.max(...rtts),
        };
        g.close();
        return r;
      } catch (e) {
        return { i, error: String(e) };
      }
    }),
  );
  console.log(JSON.stringify(results));
}
