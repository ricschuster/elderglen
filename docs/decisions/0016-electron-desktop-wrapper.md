# Electron desktop wrapper: process split, bridge and packaging

## Status

Accepted (2026-11-19, owner answers below). Refines ADR 0008 (Electron on desktop, Capacitor on
tablets) and builds on ADR 0015 (the Room stays in the page; native code is a socket pipe). Unblocks #973.

## Context

The desktop game is the final form; the browser build is for development and as a guest (ADR 0008).
ADR 0015 fixed what native code does: listen on sockets, send UDP announcements, pass text. The pipe
(`pipe-electron.ts`, `pipe-electron-main.ts`) and its detection (`nativepipe.ts`) exist, but nothing
creates a window or exposes `window.elderHost`.

## Decision

**What it wraps.** The production build in `dist/` (`npm run build`), loaded with `loadFile`. In
development it loads the Vite dev server (`ELDERGLEN_DEV=1`). The wrapper adds no game code.

**Process split.**

- Main (`electron/main.ts`): opens one `BrowserWindow`, calls `registerPipeBridge`, which owns a
  `NodePipe` (`wsserver.ts` and the UDP announcer). Events go to the window on `elderhost:event`.
  Window opening is denied; navigation is limited to the game's own origin (`electron/config.ts`).
- Preload (`electron/preload.ts`): calls `contextBridge.exposeInMainWorld("elderHost", makePreloadBridge(ipcRenderer))`.
  The bridge lives in `src/net/pipe-electron-preload.ts`, which has no Node import so the sandboxed
  preload bundle stays small. Arguments are checked on both sides.
- Page: unchanged. `nativepipe.ts` finds `window.elderHost` and picks `ElectronPipe`; `hoststarter.ts`
  and `RoomHost` run in the page as on a tablet. The Node host (`host-node.ts`) is not run by the
  wrapper; it stays the test host and shares `RoomHost` and `NodePipe`.
- Security: `contextIsolation` on, `nodeIntegration` off, `sandbox` on. No remote content loads.

**Build.** `npm run electron:build` bundles main and preload to `dist-electron/*.cjs` with Vite's own
bundler (`scripts/electron/build.mjs`), so no extra build dependency. `electron:dev` runs it against
the dev server; `electron:start` runs it against a fresh `dist/`.

**Electron is not yet a dependency.** `electron/electron.d.ts` declares the few types used, so the
gates and knip pass without a 100 MB install in CI. To run the wrapper locally:
`npm install --save-dev electron`, then delete `electron/electron.d.ts` (the real types replace it)
and the `electron` entries under `ignoreDependencies` and `ignoreBinaries` in `knip.json`.

**Relation to Capacitor.** Same web build, same page code, same `SocketPipe` seam. Capacitor wraps
tablets with a Java plugin; Electron wraps desktop with the Node pipe. Neither has game rules. A
change to the page works on both; a change to a pipe is tested against `SocketPipe` (`tests/pipe*.test.ts`).

## Decided (owner, 2026-11-19)

1. **Packager: electron-builder.** One tool for Windows, Mac and Linux installers, auto update possible later.
   Signing and auto update are still not decided. Stardew has no equivalent (Steam and GOG distribution is a
   separate choice not made yet).
2. **Page origin: `file://`.** No server. Saves in browser storage belong to that origin, so do not switch later
   without an import path.
3. **Saves: browser storage for now, files in the user data folder before the first public build.** Same code as the
   tablet today. The move to files needs a one-time import of old saves and is its own work item before release.
   (Stardew keeps saves as files on disk.)
4. **Platforms: Windows, Mac and Linux (Stardew).** Mac needs an Apple account and a Mac or CI runner (as for iOS,
   ADR 0004), so the Mac build can trail the other two.
5. **Windows firewall: accept the OS prompt and document it.** Not asked; this is the recommended default and stands
   unless the owner objects. An installer rule is a later option.

## Consequences

- One rules path for all hosts; the wrapper is about 100 lines.
- Not run in a real window yet: the skeleton typechecks, bundles and tests, but needs `electron`
  installed and a hands-on run (host, discover, join from a tablet).
- IPC cost at 8 guests (about 80 messages a second each way) is unmeasured, as in ADR 0015.
