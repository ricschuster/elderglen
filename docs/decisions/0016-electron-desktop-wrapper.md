# Electron desktop wrapper: process split, bridge and packaging

## Status

Proposed (2026-11-19, for the owner's review). Refines ADR 0008 (Electron on desktop, Capacitor on
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

## Open questions for the owner

1. **Packager.** electron-builder (Recommended: one tool for Windows, Mac and Linux installers, auto
   update later) or electron-forge, or plain `@electron/packager` zips for now. Not decided: signing, auto update.
2. **Page origin in production.** `file://` (Recommended: simplest, no server; saves live in the
   renderer's storage for that origin) or a custom `app://` scheme (cleaner security and relative
   URLs, a little more code). Switching later changes the origin and can lose saves, so settle before release.
3. **Saves.** Keep browser storage (Recommended for now: same code as the tablet) or move to files in
   the user data folder before the first public build so saves survive a cleared profile.
4. **Platforms to ship first.** Linux and Windows (Recommended: Mac needs an Apple account, as for iOS) or all three.
5. **Windows firewall.** First host prompts the OS firewall; accept that and document it (Recommended), or add an installer rule.

## Consequences

- One rules path for all hosts; the wrapper is about 100 lines.
- Not run in a real window yet: the skeleton typechecks, bundles and tests, but needs `electron`
  installed and a hands-on run (host, discover, join from a tablet).
- IPC cost at 8 guests (about 80 messages a second each way) is unmeasured, as in ADR 0015.
