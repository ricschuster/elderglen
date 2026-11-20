// Electron preload (ADR 0016). Exposes `window.elderHost` and nothing else. Runs sandboxed,
// so it is bundled into one file (scripts/electron/build.mjs).
import { contextBridge, ipcRenderer } from "electron";
import { makePreloadBridge } from "../src/net/pipe-electron-preload";
import { BRIDGE_KEY } from "./config";

contextBridge.exposeInMainWorld(BRIDGE_KEY, makePreloadBridge(ipcRenderer));
