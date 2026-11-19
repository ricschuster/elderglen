# Host route in the wrapper: the Room stays in the renderer, native code is a socket pipe

## Status

Proposed (2026-11-19, for the owner's review; steps 1 and 3 built the same day). Builds on ADR 0008, which picked
Electron on desktop and Capacitor on tablets, and on the M4 spike results (note 53,
"M4 spike results, tablet runs"). Unblocks #973 and #976.

## Context

ADR 0008 says the Electron main process "runs the host" and that the tablet plugin
"listens on a socket". It does not say where the `Room` and the world live, what the
native side is allowed to do, or what the one interface looks like. That was fine
before the spike. Now there is evidence:

- The real `Room` plus `GameRoomWorld`, with 8 players and all 38 maps, runs inside the
  Android WebView at 0.1 ms or less a tick, a nightly `sleep()` of 27 ms, no late ticks
  in a 5 minute soak (SM-T500, the weakest tablet). The cost is the rules, not the sockets.
- A host also plays. Its own scene needs the same world the `Room` judges, so a second
  copy of the world in a Node process would have to be kept in step with it.
- `src/net/host-node.ts` already moves messages between a `WsServer` and the `Room`.
  Only the server part (`wsserver.ts`) needs Node.
- The link was fine on a real router (round trip about 130 to 170 ms, tail about 320 ms).
  Game list discovery and the native socket cost were not measured.

## Decision

**The `Room` and the world run in the renderer, on every host.** Desktop, tablet and
the Node test host all run the same `Room` and `GameRoomWorld` from `src/core/`. The
native side never sees game rules. This refines ADR 0008: the Electron main process
does not run the host logic, it runs the sockets.

**Native code is a socket pipe, nothing more.** One interface in `src/net/`, replacing
the `startHost` function injected into `SocketTransport`:

```ts
interface SocketPipe {
  /** Listen on a port (0 picks one). Returns the port and the device's LAN address. */
  listen(port: number): Promise<{ port: number; address: string }>;
  onOpen(cb: (conn: ConnId) => void): void;
  onMessage(cb: (conn: ConnId, text: string) => void): void;
  onClose(cb: (conn: ConnId) => void): void;
  send(conn: ConnId, text: string): void;
  close(conn: ConnId): void;
  /** UDP broadcast of the game entry, and listening for others. */
  announce(entry: GameEntry | undefined): void;
  discover(cb: (games: GameEntry[]) => void): () => void;
  stop(): void;
}
```

`NodeHost` takes a `SocketPipe` instead of calling `listen` from `wsserver.ts`. Three
implementations, as in ADR 0008, now with the same narrow job:

1. **Node** (tests and the spike): `wsserver.ts` wrapped in the interface.
2. **Electron:** the same `wsserver.ts` in the main process, reached through a typed
   preload bridge. Context isolation stays on; the renderer gets only these methods.
3. **Capacitor plugin (Android):** a small Java plugin (`ElderHostPlugin`; the project has no Kotlin set up), a WebSocket server on a
   background thread, a UDP socket for announcements, and a multicast lock while
   discovery is listening. Events reach the page as plugin events.

**Checked messages stay in the renderer.** The pipe passes text. `decodeClient` and the
size limit (1 MiB) apply in the renderer before the `Room` sees anything. The native
side also drops a frame over the limit, so a bad guest cannot make the page parse it.

**Discovery is a UDP broadcast, with the typed address as the fallback** (note 53,
default port 24642). mDNS is not used. A tablet that cannot receive broadcasts
shows an empty list and the typed address still works.

**The tablet cap of 8 stands**, from the spike. It is revisited only if the plugin
measurement below says otherwise.

**A tablet host hosts only while the app is in front.** A background WebView does not
draw or tick. Nothing here adds a foreground service. The Host screen says so, and a
host that goes to the background is treated as gone (guests see the existing
"host lost" path). A foreground service is a later decision if play shows the need.

**Build order inside step 8** (note 53):

1. Add `SocketPipe`, move `NodeHost` onto it, keep the Node implementation. Tests unchanged.
2. Electron main process and preload bridge; wire `SocketTransport` and the Host
   screen to it; this also gives #976 its real host starter on desktop.
3. The Android plugin, tested first on the SM-T500 with the spike's `tabletguest.mjs`.

## Result (2026-11-19, built and measured)

Steps 1 and 3 are built: `src/net/pipe.ts`, `roomhost.ts`, `pipe-node.ts`, `pipe-capacitor.ts` and
`android/.../ElderHostPlugin.java`. `NodeHost` is now `RoomHost` over `NodePipe`, with the tests unchanged.
Run on real hardware (`spikes/m4/pipehost.mjs`): the SM-T500 (the weakest tablet) hosted the `late-game-100`
farm through the plugin with 8 connected (the host, 6 desktop guests and the SM-X210 on Wi-Fi). Tick cost
0.45 to 0.54 ms (the Node pipe's page-side figure was 0.1 ms, so the plugin boundary costs about 0.4 ms a tick),
JS heap 54 MB, joins 390 to 710 ms with 6 at once (68 KB farm), round trip p50 157 to 205 ms, p95 215 to 292 ms,
max 341 ms. The cap of 8 stands. Not yet measured: a long soak with the plugin, heat, battery, discovery.

## Consequences

- One rules path for all hosts, so the Node tests exercise what ships. Native code is
  about the size of `wsserver.ts` plus a UDP socket, which keeps the native part small
  and reviewable.
- Every guest message crosses the native to page boundary (IPC on Electron, a plugin
  event on Android). At 10 Hz for 8 guests that is about 80 messages a second inward,
  and the same outward. This cost is **not measured**. Acceptance for the plugin: repeat
  the spike's 8 guest soak with the native pipe in the loop, on the SM-T500, and record
  tick time, round trip, fps and heat. If it fails, lower the tablet cap or fall back to
  join only, and amend this ADR (ADR 0008 already allows this).
- The host's world is only as live as its page. If the renderer stalls (a long
  `sleep()`, a GC pause), the sockets stay open but nothing is served. The spike shows
  27 ms at night on the weakest tablet, so this is accepted.
- The Electron security pass of ADR 0008 narrows to the bridge: the preload exposes the
  `SocketPipe` methods only, with argument checks, and no Node in the renderer.
- Game list discovery on real routers, battery drain unplugged, and a wired host are
  still unmeasured (note 53, needs hands).
- `package.json` still gains Electron only when step 2 starts. iOS is untouched: iOS
  stays join only until a Mac and an Apple account exist (ADR 0004).
- Not decided here: code signing, auto update, installer format (ADR 0008), the
  Kotlin WebSocket implementation (a small hand written one like `wsmini.mjs`, or a
  vetted library; settle it when the plugin starts, by licence and size).
