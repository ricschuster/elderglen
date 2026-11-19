// Starts a RoomHost in the app on a tablet, through the ElderHost plugin, then prints stats until
// Ctrl-C. Needs the app built with the plugin (npm run android:apk -- --debug, android:install).
// Usage: node spikes/m4/pipehost.mjs <adb serial> [stage] [port] [seconds]
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
      entry: path.join(root, "spikes/m4/pipehost.ts"),
      formats: ["iife"],
      name: "PH",
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
const info = await page.evaluate(
  `PH.start(${JSON.stringify(stage)}, ${Number(port)})`,
);
console.log("host", JSON.stringify(info));
const end = Date.now() + Number(secs) * 1000;
while (Date.now() < end) {
  await new Promise((r) => setTimeout(r, 5000));
  console.log(JSON.stringify(await page.evaluate("PH.stats()")));
}
await page.evaluate("PH.stop()");
await b.close();
sh("forward", "--remove", `tcp:${cport}`);
