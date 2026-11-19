// 5 minute soak on a real tablet: the game on a late-game stage plus a 10 Hz host loop with N guests.
// Prints battery temperature, level and the app's memory every 30 s, then the host loop's tick stats.
// Usage: node spikes/m4/devsoak.mjs <adb serial> [seconds] [guests] [stage]
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
const [serial, secs = "300", guests = "7", stage = "late-game-100"] =
  process.argv.slice(2);
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
if (!(await page.evaluate(() => !!window.farmStage))) {
  await page.goto(new URL("/?new", page.url()).href);
  await page.waitForFunction(() => !!window.farmStage, null, {
    timeout: 30000,
  });
}
await page.evaluate((s) => window.farmStage(s), stage);
await page.waitForTimeout(4000);
await page.evaluate(code);
const n = await page.evaluate(
  ([g]) => window.TH.startSoak(g),
  [Number(guests)],
);
const pid = sh("shell", "pidof", "app.elderglen.game.dbg").trim();
const sample = () => {
  const bat = sh("shell", "dumpsys battery");
  const temp = Number(bat.match(/temperature: (\d+)/)?.[1]) / 10;
  const lvl = bat.match(/level: (\d+)/)?.[1];
  const mem =
    sh("shell", "dumpsys", "meminfo", pid).match(/TOTAL PSS:\s+(\d+)/)?.[1] ??
    sh("shell", "dumpsys", "meminfo", pid).match(/TOTAL\s+(\d+)/)?.[1];
  return `battery ${temp}C level ${lvl}% appPSS ${Math.round(Number(mem) / 1024)}MB`;
};
console.log(serial, "soak start", stage, "guests", n, sample());
for (let t = 30; t <= Number(secs); t += 30) {
  await page.waitForTimeout(30000);
  const fps = await page.evaluate(
    () =>
      new Promise((res) => {
        let c = 0;
        const e = performance.now() + 3000;
        const f = (t) => {
          c++;
          t < e ? requestAnimationFrame(f) : res(+(c / 3).toFixed(1));
        };
        requestAnimationFrame(f);
      }),
  );
  console.log(`t=${t}s`, sample(), "fps", fps);
}
console.log(
  serial,
  "host loop",
  JSON.stringify(
    await page.evaluate(() => {
      const s = window.TH.soakStats();
      window.TH.stopSoak();
      return s;
    }),
  ),
);
await b.close();
sh("forward", "--remove", `tcp:${port}`);
