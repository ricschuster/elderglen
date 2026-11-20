// Electron main process (ADR 0016). Opens the game window and serves the socket pipe
// bridge (ADR 0015). The Room and the world stay in the page; this process only owns sockets.
import { app, BrowserWindow, ipcMain } from "electron";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { registerPipeBridge, CH } from "../src/net/pipe-electron-main";
import type { BridgeEvent } from "../src/net/pipe-electron";
import { allowNavigation, pageTarget, webPreferences } from "./config";

let win: BrowserWindow | undefined;
let bridge: { dispose(): Promise<void> } | undefined;

const emit = (e: BridgeEvent) => {
  if (win && !win.webContents.isDestroyed()) win.webContents.send(CH.event, e);
};

async function open() {
  const dist = join(__dirname, "..", "dist");
  const target = pageTarget(process.env, dist);
  const pageUrl =
    target.kind === "url" ? target.url : pathToFileURL(target.path).href;
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#000000",
    webPreferences: webPreferences(join(__dirname, "preload.cjs")),
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  // Only the game's own page may load; remote content is not part of the app (ADR 0008).
  win.webContents.on("will-navigate", (e) => {
    if (!allowNavigation(e.url, pageUrl)) e.preventDefault();
  });
  await (target.kind === "url"
    ? win.loadURL(target.url)
    : win.loadFile(target.path));
}

void app.whenReady().then(() => {
  bridge = registerPipeBridge(ipcMain, emit);
  return open();
});

app.on("window-all-closed", () => {
  void (bridge?.dispose() ?? Promise.resolve()).finally(() => app.quit());
});
