# M4 hosting spike (issue 948)

Throwaway harness. Nothing here ships. Results and recommendations are in
`docs/design/53_multiplayer.md`, "M4 spike results (2026-11-18)".

- `latefarm.ts`: the same save inflated to a built-up late farm, sizes by area.
- `statesize.ts`: plays the expert sim bot and prints save sizes by section at days 1, 28, 56 and 84.
  `OUT=farm.json npm run sim`-style run: `OUT=/tmp/farm84.json node scripts/sim/run.mjs spikes/m4/statesize.ts`.
- `wsmini.mjs`, `host.mjs`: a minimal WebSocket host on node:http with a 10 Hz room tick.
  `FARM=<file>` sends a farm blob on join; `SNAPSHOT=full` sends it every tick (the worst case);
  `HZ=<n>` changes the tick rate.
- `load.mjs <host:port> <guests> [seconds]`: synthetic guests walking at 5 moves a second,
  printing round trips and bandwidth.

By hand (needs your router and tablet): run `host.mjs` on the desktop, join from a tablet browser
or a second machine with `load.mjs`, and read the stats line the host prints every 5 s. For the
tablet host the same file has to run in the Capacitor wrapper (step 8 of the build order), which
this spike does not build.

## Tablet runs (2026-11-19)

Results are in note 53, "M4 spike results, tablet runs". Needs the "Elderglen DBG" app on the tablet
(`npm run android:install -- --debug`) and `adb` on the path (`~/Android/Sdk/platform-tools`).

- `tabletguest.mjs [webPort] [hostPort]`: serves two guest pages and collects their `POST /report`.
  `/?s=60&tag=x` joins `host.mjs` with a toy protocol; `/real?s=45&tag=x` uses the real `GuestClient`
  against `realhost.ts`. Open them in the tablet's browser (`adb shell am start -a android.intent.action.VIEW -d <url>`).
- `realhost.ts`: `node scripts/sim/run.mjs spikes/m4/realhost.ts [stage] [port]`, the real `NodeHost`, `Room` and
  `GameRoomWorld` on a stage's state (default `late-game-100`).
- `devperf.mjs <serial> [stage] [seconds]`: frame rate in the app on a stage, over the WebView DevTools socket.
- `devhost.mjs <serial> [guests] [ticks]` and `devsoak.mjs <serial> [seconds]`: `tablethost.ts` bundled and run inside
  the app. Tick, `sleep()` and `serialize` cost, then a soak with temperature and memory samples.
- Keep the app in front and the screen awake (`adb shell svc power stayon usb`): a background WebView does not draw.
  Phaser caps the step for its first 100 or so frames after a load, so wait before timing movement.
