// Browser guest bundle: the real GuestClient joins the real host, walks, reports join cost and
// round trips (the host echoes our ts in snapshots). Built by tabletguest.mjs with esbuild.
import { GuestClient } from "../../src/net/client";

const q = new URLSearchParams(location.search);
const secs = Number(q.get("s") ?? 30);
const tag = q.get("tag") ?? "guest";
const out = document.getElementById("o")!;
const pct = (a: number[], p: number) =>
  [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];

(async () => {
  const t0 = performance.now();
  let r: Record<string, unknown>;
  try {
    const g = await GuestClient.connect(
      `ws://${location.hostname}:${q.get("port") ?? 8790}`,
      { name: tag, timeoutMs: 15000 },
    );
    const joinMs = Math.round(performance.now() - t0);
    const rtts: number[] = [];
    let n = 0;
    const done = performance.now() + secs * 1000;
    g.onMessage = (m) => {
      if (m.t === "snap") {
        const me = m.p[g.id];
        if (me && me[2]) rtts.push(performance.now() - me[2]);
      }
    };
    await new Promise<void>((res) => {
      const iv = setInterval(() => {
        g.sendPos(40 + (n++ % 20), 30, "farm", 0, []);
        out.textContent = `id ${g.id} sent ${n} rtts ${rtts.length} players ${g.players.size}`;
        if (performance.now() > done) (clearInterval(iv), res());
      }, 200);
    });
    r = {
      tag,
      id: g.id,
      joinMs,
      farmKB: Math.round(g.farm.length / 1024),
      players: g.players.size,
      sent: n,
      rtt: {
        n: rtts.length,
        p50: Math.round(pct(rtts, 0.5)),
        p95: Math.round(pct(rtts, 0.95)),
        max: Math.round(Math.max(...rtts)),
      },
    };
    g.close();
  } catch (e) {
    r = { tag, error: String(e), afterMs: Math.round(performance.now() - t0) };
  }
  out.textContent = JSON.stringify(r, null, 1);
  fetch("/report", { method: "POST", body: JSON.stringify(r) });
})();
