// Preload half of the Electron pipe bridge (ADR 0015, 0016). Browser safe and Node free: it is
// bundled into the sandboxed preload, so it must not import anything that needs Node.
import type { BridgeEvent, ElderHostBridge } from "./pipe-electron";

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

/** The slice of Electron's ipcRenderer used here. */
export interface IpcRendererLike {
  invoke(ch: string, ...a: unknown[]): Promise<unknown>;
  send(ch: string, ...a: unknown[]): void;
  on(ch: string, fn: (ev: unknown, ...a: unknown[]) => void): void;
  removeListener(ch: string, fn: (ev: unknown, ...a: unknown[]) => void): void;
}

export const int = (v: unknown, min: number, max: number): number => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max)
    throw new Error("bad argument");
  return v;
};
export const str = (v: unknown): string => {
  if (typeof v !== "string") throw new Error("bad argument");
  return v;
};

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
