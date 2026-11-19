# Installed-app wrapper: Electron on desktop, Capacitor on tablets

## Status

Accepted. Closes issue #62 and the wrapper choice left open in ADR 0004. ADR 0015 refines
the host route (the Room stays in the renderer; native code is a socket pipe).

## Context

ADR 0004 builds the game as a web app and defers the wrapper. Two later
decisions now fix what the wrapper must do:

- The final form is a standalone desktop game. The browser build stays for
  development and as a guest (owner, 2026-11-02).
- Multiplayer (ADR 0007, `docs/design/53_multiplayer.md`) has the host run the
  world. A host must listen on a socket and announce itself on the local
  network. A browser tab cannot, and neither can a tablet WebView. Any player
  can host, desktop or tablet.

The performance spike (`docs/design/04_performance_spike.md`) ran in Chrome and
warned that a system webview can differ. A wrapper that uses the system webview
would need that spike repeated on every platform.

Options for the desktop wrapper:

| Option | For | Against |
| --- | --- | --- |
| Electron | Bundles Chromium, so rendering matches the Chrome spike on every OS. Node is built in: a WebSocket server and a UDP broadcast need no extra language, and the Node test host of note 53 shares code with the real host. | Large download (about 100 MB). Higher memory than a system webview. |
| Tauri | Small download. Uses the system webview. | The webview differs per OS (WebKitGTK on Linux, WebView2 on Windows, WKWebView on Mac), so the spike repeats per platform. Sockets would be written in Rust, a language the owner and the tests do not use. |
| Native engine (Stardew's route) | No webview at all. | This is the Godot fallback of ADR 0004: scene and UI code rewritten. Not justified while the spike passes. |

## Decision

**Desktop: Electron.** The renderer is the existing Vite build. The main
process runs the host: a WebSocket server and the UDP game announcement of note
53. The host code is plain Node and is shared with the Node test host, so the
test host and the real host cannot drift apart. The renderer reaches it through
a small, typed preload bridge, with context isolation on and no Node access in
the renderer.

**Tablets: Capacitor**, Android first, iOS later (needs a Mac and an Apple
account, per ADR 0004). Hosting uses a small native Capacitor plugin that
listens on a socket and announces on the network, the route beaver_cycle built
and measured (about 30 ms round trips on one router). Only ideas are taken from
beaver_cycle, no code.

**Browser:** development and guest only. It joins by typed address and never
hosts.

**One host interface.** `src/net/` talks to a `HostBridge` interface with three
implementations: the Electron main process, the Capacitor plugin, and the Node
test host. Game rules stay in `src/core/` and do not know which one is in use.

**Not decided here:** code signing, auto update, store release and the
installer format. Each gets its own note when packaging starts.

## Consequences

- Rendering on desktop is Chromium on every OS, so the existing spike numbers
  carry over. The spike is still repeated once inside Electron, and on the
  tablet inside Capacitor's WebView (Android System WebView, which can differ
  from Chrome).
- The Node test host is built first (note 53, build step 0) and becomes the
  Electron host code, so the multiplayer spike also proves the desktop route.
- A tablet host is the riskiest part: the plugin must be written and the 8
  player load check of note 53 must pass on a real tablet. If it fails, tablets
  fall back to join only, and this ADR is amended, not replaced.
- Saves live in the wrapper's storage. Note 52's export and import covers a
  cleared store. Desktop can also write the save to a file in the user data
  folder, to be settled in the save build.
- Electron needs a security pass before release: context isolation, a fixed
  content security policy, no remote content, and the host accepting only
  checked messages (note 53).
- `package.json` gains Electron only when the wrapper is built. Nothing is
  added now, and the first playable stays a plain web build.
- Revisit if the Electron spike misses the 60 fps desktop target, or if the
  download size becomes a problem. Tauri and the native route stay the fallbacks.
