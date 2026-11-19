// The Node test host: a RoomHost over real WebSockets on node:http (note 53, ADR 0015).
// Node only. The real hosts use the same RoomHost with the Electron or Capacitor pipe.
import { RoomHost, type RoomHostOptions } from "./roomhost";
import { NodePipe } from "./pipe-node";

export type NodeHostOptions = Omit<RoomHostOptions, "pipe">;
export type NodeHost = RoomHost;

export const NodeHost = {
  start: (opts: NodeHostOptions): Promise<RoomHost> =>
    RoomHost.start({ ...opts, pipe: new NodePipe() }),
};
