# M4 hosting spike (issue 948)

Throwaway harness. Nothing here ships. Results and recommendations are in
`docs/design/53_multiplayer.md`, "M4 spike results (2026-11-18)".

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
