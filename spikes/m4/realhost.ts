// The real host stack on the desktop for tablet guests: NodeHost + Room + GameRoomWorld over a
// named stage's game state (default late-game-100). Run:
//   node scripts/sim/run.mjs spikes/m4/realhost.ts [stage] [port]
import { NodeHost } from "../../src/net/host-node";
import { GameRoomWorld } from "../../src/core/roomworld";
import { buildStage } from "../../src/core/stages";
import { serialize } from "../../src/core/save";

export async function main(args: string[]) {
  const stage = args[0] ?? "late-game-100";
  const port = Number(args[1] ?? 8790);
  const r = buildStage(stage);
  if (!r) throw new Error(`unknown stage ${stage}`);
  const world = new GameRoomWorld(r.state);
  const host = await NodeHost.start({ world, port, maxPlayers: 9 });
  const kb = Math.round(serialize(r.state).length / 1024);
  console.log(`real host on :${host.port}, stage ${stage}, farm ${kb} KB raw`);
  setInterval(() => {
    const m = host.room.connectedIds.length;
    console.log(
      `ticks ${host.ticks} tickMs ${(host.busyMs / Math.max(1, host.ticks)).toFixed(3)} members ${m ?? "?"} rss ${(process.memoryUsage().rss / 1048576).toFixed(0)}MB`,
    );
  }, 5000);
  await new Promise(() => {});
}
