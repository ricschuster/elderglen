// Synthetic guests for the spike host. Each walks at 5 moves a second and measures round
// trips: the time from sending a move to seeing its ts come back in a snapshot.
// Run: node spikes/m4/load.mjs <host:port> <guests> [seconds]
const [addr = "127.0.0.1:8787", n = "8", secs = "20"] = process.argv.slice(2);
const rtts = [];
let bytesIn = 0;
const sockets = [];
for (let i = 0; i < Number(n); i++) {
  const ws = new WebSocket(`ws://${addr}`);
  let id = 0;
  let x = 0;
  const sent = new Map();
  ws.onmessage = (e) => {
    bytesIn += e.data.length;
    const m = JSON.parse(e.data);
    if (m.t === "hello") id = m.id;
    if (m.t === "snap" && m.p[id]) {
      const ts = m.p[id][2];
      const at = sent.get(ts);
      if (at !== undefined) {
        rtts.push(performance.now() - at);
        sent.delete(ts);
      }
    }
  };
  ws.onopen = () =>
    setInterval(() => {
      const ts = Math.floor(performance.now() * 1000) + i;
      sent.set(ts, performance.now());
      ws.send(JSON.stringify({ t: "move", x: (x += 0.2), y: i, ts }));
    }, 200);
  sockets.push(ws);
}
setTimeout(
  () => {
    rtts.sort((a, b) => a - b);
    const q = (f) =>
      rtts[Math.min(rtts.length - 1, Math.floor(rtts.length * f))];
    console.log(
      `${n} guests ${secs}s: ${rtts.length} samples, rtt p50 ${q(0.5)?.toFixed(1)} p95 ${q(0.95)?.toFixed(1)} max ${q(1)?.toFixed(1)} ms, in ${(bytesIn / 1024 / Number(secs)).toFixed(0)} KB/s per all guests`,
    );
    process.exit(0);
  },
  Number(secs) * 1000,
);
