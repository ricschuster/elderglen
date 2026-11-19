// Frame rate and heap of the DBG app on a real tablet, over the WebView DevTools socket.
// Usage: node spikes/m4/devperf.mjs <adb serial> [stage] [seconds]
// Needs the debug app running (npm run android:install -- --debug).
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const adb = `${process.env.HOME}/Android/Sdk/platform-tools/adb`;
const [serial, stage, secs = "15"] = process.argv.slice(2);
const sh = (...a) => execFileSync(adb, ["-s", serial, ...a]).toString();
const sock = sh("shell", "cat /proc/net/unix")
  .split("\n")
  .map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1])
  .filter(Boolean)
  .pop();
const port = 9300 + Math.floor(Math.random() * 500);
sh("forward", `tcp:${port}`, `localabstract:${sock}`);
const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
const page = browser.contexts()[0].pages()[0];
if (stage) {
  // The stage hook exists once the farm scene is up: start a fresh game first.
  if (!(await page.evaluate(() => !!window.farmStage))) {
    await page.goto(new URL("/?new", page.url()).href);
    await page.waitForFunction(() => !!window.farmStage, null, {
      timeout: 30000,
    });
  }
  await page.evaluate((s) => window.farmStage(s), stage);
  await page.waitForTimeout(4000);
}
const r = await page.evaluate(
  (ms) =>
    new Promise((res) => {
      const gaps = [];
      let last = performance.now();
      const end = last + ms;
      const f = (t) => {
        gaps.push(t - last);
        last = t;
        if (t < end) requestAnimationFrame(f);
        else {
          gaps.sort((a, b) => a - b);
          const q = (p) => gaps[Math.floor((gaps.length - 1) * p)];
          const m = performance.memory;
          res({
            frames: gaps.length,
            fps: +((gaps.length / ms) * 1000).toFixed(1),
            p50: +q(0.5).toFixed(1),
            p95: +q(0.95).toFixed(1),
            max: +gaps[gaps.length - 1].toFixed(0),
            heapMB: m ? +(m.usedJSHeapSize / 1048576).toFixed(0) : null,
            ua: navigator.userAgent.slice(-60),
          });
        }
      };
      requestAnimationFrame(f);
    }),
  Number(secs) * 1000,
);
console.log(serial, stage ?? "(current)", JSON.stringify(r));
await browser.close();
sh("forward", "--remove", `tcp:${port}`);
