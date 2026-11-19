// Runs tablethost.ts inside the DBG app on a real tablet and prints tick cost and JS heap.
// Usage: node spikes/m4/devhost.mjs <adb serial> [guests] [ticks]
import { execFileSync } from "node:child_process";
import { build } from "vite";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const adb = `${process.env.HOME}/Android/Sdk/platform-tools/adb`;
const [serial, guests = "8", ticks = "3000"] = process.argv.slice(2);
const sh = (...a) => execFileSync(adb, ["-s", serial, ...a]).toString();
const out = await build({
  root,
  logLevel: "error",
  configFile: false,
  build: {
    write: false,
    minify: false,
    lib: {
      entry: path.join(root, "spikes/m4/tablethost.ts"),
      formats: ["iife"],
      name: "TH",
    },
  },
});
const code = (Array.isArray(out) ? out[0] : out).output[0].code;
const sock = sh("shell", "cat /proc/net/unix")
  .split("\n")
  .map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1])
  .filter(Boolean)
  .pop();
const port = 9300 + Math.floor(Math.random() * 500);
sh("forward", `tcp:${port}`, `localabstract:${sock}`);
const b = await chromium.connectOverCDP(`http://localhost:${port}`);
const page = b.contexts()[0].pages()[0];
const cdp = await page.context().newCDPSession(page);
await cdp.send("Performance.enable");
const heap = async () =>
  (await cdp.send("Performance.getMetrics")).metrics.find(
    (m) => m.name === "JSHeapUsedSize",
  ).value / 1048576;
await page.evaluate(code);
const h0 = await heap();
const r = await page.evaluate(
  ([g, t]) => window.TH.run(g, t),
  [Number(guests), Number(ticks)],
);
const h1 = await heap();
console.log(
  serial,
  JSON.stringify({
    ...r,
    heapBeforeMB: +h0.toFixed(0),
    heapAfterMB: +h1.toFixed(0),
  }),
);
await b.close();
sh("forward", "--remove", `tcp:${port}`);
