// The real host starter for the Lobby (#976, ADR 0015). Generic over the pipe: the tablet
// passes a CapacitorPipe, the desktop app will pass the Electron pipe. Browser safe.
import type { RoomWorld } from "../core/room";
import type { HostOptions } from "./hostoptions";
import type { SocketPipe } from "./pipe";
import { RoomHost } from "./roomhost";
import type { HostHandle } from "./sockettransport";

export interface HostStarterDeps {
  /** A fresh pipe for each hosting session (a stopped pipe is not reused). */
  makePipe: () => SocketPipe;
  /** The world the room judges, built from the host's choices. */
  makeWorld: (name: string, options: HostOptions) => RoomWorld;
  /** Port to listen on; 0 (default) picks a free one. */
  port?: number;
  tickHz?: number;
  /** The host's name in the room. */
  hostName?: string;
  /** Called with the running host so the game can read the room. */
  onStarted?: (host: RoomHost) => void;
}

/** Build the function `SocketTransport` takes: start a RoomHost that announces and accepts guests. */
export function makeHostStarter(
  deps: HostStarterDeps,
): (name: string, options: HostOptions) => Promise<HostHandle> {
  return async (name, options) => {
    const host = await RoomHost.start({
      world: deps.makeWorld(name, options),
      pipe: deps.makePipe(),
      port: deps.port,
      tickHz: deps.tickHz,
      hostName: deps.hostName,
      announceName: name,
    });
    deps.onStarted?.(host);
    return {
      address: `${host.address ?? "localhost"}:${host.port}`,
      stop: () => void host.close(),
    };
  };
}
