// Listens for games in the app on a tablet, through the ElderHost plugin, and prints the list. Needs the app built with the plugin (npm run android:apk -- --debug, android:install).
// Usage: node spikes/m4/pipelisten.mjs <adb serial> [seconds]
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
const [serial, stage = "late-game-100", port = "8787", secs = "120"] =
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
      entry: path.join(root, "spikes/m4/pipelisten.ts"),
      formats: ["iife"],
      name: "PL",
    },
  },
});
const code = (Array.isArray(out) ? out[0] : out).output[0].code;
const sock = sh("shell", "cat /proc/net/unix")
  .split("\n")
  .map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1])
  .filter(Boolean)
  .pop();
const cport = 9300 + Math.floor(Math.random() * 500);
sh("forward", `tcp:${cport}`, `localabstract:${sock}`);
const b = await chromium.connectOverCDP(`http://localhost:${cport}`);
const page = b.contexts()[0].pages()[0];
await page.evaluate(code);
console.log("canDiscover", await page.evaluate("PL.start()"));
const end = Date.now() + Number(secs) * 1000;
while (Date.now() < end) {
  await new Promise((r) => setTimeout(r, 2000));
  console.log(JSON.stringify(await page.evaluate("PL.games()")));
}
await page.evaluate("PL.end()");
await b.close();
sh("forward", "--remove", `tcp:${cport}`);
