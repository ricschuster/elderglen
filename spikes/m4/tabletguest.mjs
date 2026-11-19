// Serves a tiny guest page and collects its results. The page opens a WebSocket to host.mjs,
// walks at 5 moves a second, measures the round trip from the host's echoed ts, and POSTs a
// summary to /report. Run host.mjs too. Usage: node spikes/m4/tabletguest.mjs [webPort] [hostPort]
import { createServer } from "node:http";
import { rolldown } from "rolldown";
import { fileURLToPath } from "node:url";

// /real: the real GuestClient (src/net/client.ts) against realhost.ts, bundled for the browser.
const bundle = await rolldown({
  input: fileURLToPath(new URL("./realguest.ts", import.meta.url)),
});
const realJs = (await bundle.generate({ format: "iife" })).output[0].code;
const realPage = `<!doctype html><meta name=viewport content="width=device-width"><body style="font:20px monospace"><pre id=o>starting</pre><script>${realJs.replace(/<\/script/g, "<\\/script")}</script>`;

const webPort = Number(process.argv[2] ?? 8788);
const hostPort = Number(process.argv[3] ?? 8787);
const page = `<!doctype html><meta name=viewport content="width=device-width"><body style="font:20px monospace">
<pre id=o>starting</pre><script>
const secs = Number(new URLSearchParams(location.search).get("s") || 30);
const tag = new URLSearchParams(location.search).get("tag") || navigator.userAgent.slice(0, 40);
const o = document.getElementById("o");
const ws = new WebSocket("ws://" + location.hostname + ":${hostPort}");
const rtts = []; let id = 0, sent = 0, snaps = 0, bytes = 0, opened = 0, gaps = [], last = 0;
const t0 = performance.now();
ws.onopen = () => { opened = performance.now() - t0; };
ws.onmessage = (e) => {
  bytes += e.data.length; const m = JSON.parse(e.data);
  if (m.t === "hello") id = m.id;
  if (m.t === "snap") {
    snaps++; const now = performance.now(); if (last) gaps.push(now - last); last = now;
    const me = m.p[id]; if (me && me[2]) rtts.push(Date.now() - me[2]);
  }
};
const iv = setInterval(() => {
  if (ws.readyState === 1) ws.send(JSON.stringify({ t: "move", x: sent % 100, y: 0, ts: Date.now() })), sent++;
  o.textContent = "id " + id + " sent " + sent + " snaps " + snaps + " rtts " + rtts.length;
}, 200);
const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];
setTimeout(() => {
  clearInterval(iv); ws.close();
  const r = { tag, secs, opened: Math.round(opened), sent, snaps, kbIn: Math.round(bytes / 1024),
    rtt: { n: rtts.length, p50: q(rtts, .5), p95: q(rtts, .95), max: Math.max(...rtts) },
    snapGap: { p50: Math.round(q(gaps, .5)), p95: Math.round(q(gaps, .95)), max: Math.round(Math.max(...gaps)) } };
  o.textContent = JSON.stringify(r, null, 1);
  fetch("/report", { method: "POST", body: JSON.stringify(r) });
}, secs * 1000);
</script>`;

createServer((req, res) => {
  if (req.method === "POST" && req.url === "/report") {
    let b = "";
    req.on("data", (d) => (b += d));
    req.on("end", () => {
      console.log("REPORT", b);
      res.end("ok");
    });
    return;
  }
  res.setHeader("content-type", "text/html");
  res.end(req.url.startsWith("/real") ? realPage : page);
}).listen(webPort, "0.0.0.0", () => console.log(`guest page on :${webPort}`));
