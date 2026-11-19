// Main-process and preload halves of the Electron pipe bridge (ADR 0015). The sockets are
// NodePipe; the page reaches them only through the methods exposed here. Electron objects are
// passed in (structural types), so this file has no electron import and is unit tested.
// Node only: never import this from a scene.
import type { BridgeEvent, ElderHostBridge } from "./pipe-electron";
import { NodePipe, type NodePipeOptions } from "./pipe-node";

export const CH = {
  listen: "elderhost:listen",
  send: "elderhost:send",
  close: "elderhost:close",
  stop: "elderhost:stop",
  announce: "elderhost:announce",
  discoverStart: "elderhost:discoverStart",
  discoverStop: "elderhost:discoverStop",
  event: "elderhost:event",
} as const;

/** The slice of Electron's ipcMain used here. */
export interface IpcMainLike {
  handle(ch: string, fn: (ev: unknown, ...a: unknown[]) => unknown): void;
  on(ch: string, fn: (ev: unknown, ...a: unknown[]) => void): void;
}

/** The slice of Electron's ipcRenderer used here. */
export interface IpcRendererLike {
  invoke(ch: string, ...a: unknown[]): Promise<unknown>;
  send(ch: string, ...a: unknown[]): void;
  on(ch: string, fn: (ev: unknown, ...a: unknown[]) => void): void;
  removeListener(ch: string, fn: (ev: unknown, ...a: unknown[]) => void): void;
}

const int = (v: unknown, min: number, max: number): number => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max)
    throw new Error("bad argument");
  return v;
};
const str = (v: unknown): string => {
  if (typeof v !== "string") throw new Error("bad argument");
  return v;
};

/** Main process: serve the bridge. `emit` sends an event to the window that owns the game. */
export function registerPipeBridge(
  ipc: IpcMainLike,
  emit: (e: BridgeEvent) => void,
  o: NodePipeOptions = {},
): { dispose(): Promise<void> } {
  let pipe = new NodePipe(o);
  let stopDiscover: (() => void) | undefined;
  const halt = () => {
    stopDiscover?.();
    stopDiscover = undefined;
  };
  ipc.handle(CH.listen, async (_e, port) => {
    await pipe.stop();
    pipe = new NodePipe(o);
    return pipe.listen(int(port, 0, 65535), {
      onOpen: (conn) => emit({ kind: "open", conn }),
      onMessage: (conn, text) => emit({ kind: "message", conn, text }),
      onClose: (conn) => emit({ kind: "close", conn }),
    });
  });
  ipc.on(CH.send, (_e, conn, text) =>
    pipe.send(int(conn, 1, 2 ** 31), str(text)),
  );
  ipc.on(CH.close, (_e, conn) => pipe.close(int(conn, 1, 2 ** 31)));
  ipc.on(CH.announce, (_e, text) => pipe.announce(str(text) || undefined));
  ipc.on(CH.discoverStart, () => {
    halt();
    stopDiscover = pipe.discover((text, from) =>
      emit({ kind: "game", text, from }),
    );
  });
  ipc.on(CH.discoverStop, halt);
  ipc.handle(CH.stop, async () => {
    halt();
    await pipe.stop();
  });
  return {
    async dispose() {
      halt();
      await pipe.stop();
    },
  };
}

/** Preload: the object to hand to `contextBridge.exposeInMainWorld("elderHost", ...)`. */
export function makePreloadBridge(ipc: IpcRendererLike): ElderHostBridge {
  return {
    listen: async (port) =>
      ipc.invoke(CH.listen, int(port, 0, 65535)) as ReturnType<
        ElderHostBridge["listen"]
      >,
    send: (conn, text) => ipc.send(CH.send, int(conn, 1, 2 ** 31), str(text)),
    close: (conn) => ipc.send(CH.close, int(conn, 1, 2 ** 31)),
    stop: async () => {
      await ipc.invoke(CH.stop);
    },
    announce: (text, port) => {
      int(port, 1, 65535);
      ipc.send(CH.announce, str(text));
    },
    discoverStart: (port) => {
      int(port, 1, 65535);
      ipc.send(CH.discoverStart);
    },
    discoverStop: () => ipc.send(CH.discoverStop),
    onEvent: (cb) => {
      const fn = (_e: unknown, ev: unknown) => cb(ev as BridgeEvent);
      ipc.on(CH.event, fn);
      return () => ipc.removeListener(CH.event, fn);
    },
  };
}
