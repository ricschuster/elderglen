// Throwaway M4 spike host: a room of players on a fixed tick (default 10 Hz). Guests send
// {t:"move",x,y,ts}; the host steps and broadcasts a snapshot of every player each tick.
// SNAPSHOT=full sends the whole farm blob with every tick (worst case) for comparison.
// Run: node spikes/m4/host.mjs [port]   (stats print every 5 s)
import { readFileSync, existsSync } from "node:fs";
import { listen } from "./wsmini.mjs";

const port = Number(process.argv[2] ?? 8787);
const HZ = Number(process.env.HZ ?? 10);
const MODE = process.env.SNAPSHOT ?? "delta";
const farmBlob =
  process.env.FARM && existsSync(process.env.FARM)
    ? readFileSync(process.env.FARM, "utf8")
    : "";
const players = new Map();
let nextId = 1;
let ticks = 0;
let busyMs = 0;
const startCpu = process.cpuUsage();

const server = await listen(port, {
  onOpen(c) {
    c.id = nextId++;
    players.set(c.id, { x: 0, y: 0, ts: 0, c });
    c.send(JSON.stringify({ t: "hello", id: c.id }));
    if (farmBlob) c.send(JSON.stringify({ t: "join", farm: farmBlob }));
  },
  onMessage(c, text) {
    const m = JSON.parse(text);
    const p = players.get(c.id);
    if (m.t === "move") Object.assign(p, { x: m.x, y: m.y, ts: m.ts });
  },
  onClose(c) {
    players.delete(c.id);
  },
});

setInterval(() => {
  const t0 = performance.now();
  const snap = { t: "snap", n: ticks++, p: {} };
  for (const [id, p] of players) snap.p[id] = [p.x, p.y, p.ts];
  const base = JSON.stringify(snap);
  for (const { c } of players.values())
    c.send(
      MODE === "full" && farmBlob
        ? base.slice(0, -1) + `,"farm":${JSON.stringify(farmBlob)}}`
        : base,
    );
  busyMs += performance.now() - t0;
}, 1000 / HZ);

setInterval(() => {
  const cpu = process.cpuUsage(startCpu);
  const out = [...players.values()].reduce((a, p) => a + p.c.bytesOut, 0);
  console.log(
    `players ${players.size} ticks ${ticks} tickMs ${(busyMs / Math.max(1, ticks)).toFixed(3)} cpu ${((cpu.user + cpu.system) / 1000).toFixed(0)}ms out ${(out / 1024).toFixed(0)}KB rss ${(process.memoryUsage().rss / 1048576).toFixed(0)}MB`,
  );
}, 5000);
console.log(`spike host on :${port}, ${HZ} Hz, snapshot ${MODE}`);
void server;
