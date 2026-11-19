// Tablet host through the native plugin (ADR 0015): the real RoomHost, Room and GameRoomWorld
// in the page of the running app, with sockets from the ElderHost Capacitor plugin.
// pipehost.mjs injects this bundle and reads stats().
import { RoomHost } from "../../src/net/roomhost";
import { CapacitorPipe } from "../../src/net/pipe-capacitor";
import { GameRoomWorld } from "../../src/core/roomworld";
import { buildStage } from "../../src/core/stages";

let host: RoomHost | undefined;
let t0 = 0;

export async function start(stage: string, port: number) {
  const r = buildStage(stage)!;
  host = await RoomHost.start({
    world: new GameRoomWorld(r.state),
    pipe: new CapacitorPipe(),
    port,
    maxPlayers: 9,
  });
  t0 = performance.now();
  return { port: host.port, address: host.address };
}

export function stats() {
  const h = host!;
  const mem = (
    performance as unknown as { memory?: { usedJSHeapSize: number } }
  ).memory;
  return {
    ticks: h.ticks,
    busyMsPerTick: h.ticks ? +(h.busyMs / h.ticks).toFixed(3) : 0,
    connected: h.room.connectedIds.length,
    upSec: Math.round((performance.now() - t0) / 1000),
    heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : undefined,
  };
}

export function stop() {
  return host?.close();
}
