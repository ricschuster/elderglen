// Main-process and preload halves of the Electron pipe bridge (ADR 0015). The sockets are
// NodePipe; the page reaches them only through the methods exposed here. Electron objects are
// passed in (structural types), so this file has no electron import and is unit tested.
// Node only: never import this from a scene.
import type { BridgeEvent } from "./pipe-electron";
import { CH, int, str } from "./pipe-electron-preload";
import { NodePipe, type NodePipeOptions } from "./pipe-node";

export { CH, makePreloadBridge } from "./pipe-electron-preload";
export type { IpcRendererLike } from "./pipe-electron-preload";

/** The slice of Electron's ipcMain used here. */
export interface IpcMainLike {
  handle(ch: string, fn: (ev: unknown, ...a: unknown[]) => unknown): void;
  on(ch: string, fn: (ev: unknown, ...a: unknown[]) => void): void;
}

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
