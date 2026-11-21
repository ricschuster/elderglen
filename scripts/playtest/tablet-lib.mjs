// Shared helpers for driving the debug app on a tablet over adb and the WebView
// DevTools socket. Text first: read state with `ev()` and the `farm*` hooks, and take a
// picture only when the look is the question (`shot.mjs`: cropped, small, tiled).
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";

export const ADB = `${homedir()}/Android/Sdk/platform-tools/adb`;
export const PKG = "app.elderglen.game.dbg";

export function adb(...args) {
  return execFileSync(ADB, args, { encoding: "utf8" }).trim();
}

/** Wake the screen and keep it on, so taps are not swallowed. */
export function wake() {
  adb("shell", "svc", "power", "stayon", "usb");
  adb("shell", "input", "keyevent", "KEYCODE_WAKEUP");
}

export function tap(x, y) {
  adb("shell", "input", "tap", String(x), String(y));
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Evaluate JS in the game page; returns the value (objects come back as JSON). */
export async function ev(expression) {
  const pid = adb("shell", "pidof", PKG);
  if (!pid) throw new Error(`${PKG} is not running`);
  adb("forward", "tcp:9222", `localabstract:webview_devtools_remote_${pid}`);
  const t = (await (await fetch("http://localhost:9222/json")).json()).find(
    (x) => x.webSocketDebuggerUrl,
  );
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  return new Promise((resolve, reject) => {
    ws.onopen = () =>
      ws.send(
        JSON.stringify({
          id: 1,
          method: "Runtime.evaluate",
          params: { expression, returnByValue: true, awaitPromise: true },
        }),
      );
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id !== 1) return;
      ws.close();
      if (m.result?.exceptionDetails)
        reject(new Error(m.result.exceptionDetails.text));
      else resolve(m.result?.result?.value);
    };
    ws.onerror = reject;
  });
}

/** A short one-line status of the game, for scripts to print. */
export async function status() {
  return ev(`(() => { const d = window.farmDebug(); const s = window.__game?.registry.get("state");
    return "day " + d.day + " " + d.map + " tile " + d.tile.x + "," + d.tile.y +
      " tier " + d.houseTier + " " + d.money + "g" + (s?.marriage ? " marriage " + s.marriage.stage : ""); })()`);
}
