import { afterEach, describe, expect, it } from "vitest";
import { ElectronPipe, type BridgeEvent } from "../src/net/pipe-electron";
import {
  CH,
  makePreloadBridge,
  registerPipeBridge,
  type IpcMainLike,
  type IpcRendererLike,
} from "../src/net/pipe-electron-main";

type Fn = (ev: unknown, ...a: unknown[]) => unknown;

// A fake Electron: ipcMain and ipcRenderer wired to each other in memory.
function wire(opts = {}) {
  const handlers = new Map<string, Fn>();
  const ons = new Map<string, Fn>();
  const renderer = new Map<string, Set<Fn>>();
  const main: IpcMainLike = {
    handle: (c, f) => void handlers.set(c, f),
    on: (c, f) => void ons.set(c, f),
  };
  const ipcr: IpcRendererLike = {
    invoke: async (c, ...a) => handlers.get(c)?.({}, ...a),
    send: (c, ...a) => void ons.get(c)?.({}, ...a),
    on: (c, f) => {
      if (!renderer.has(c)) renderer.set(c, new Set());
      renderer.get(c)?.add(f);
    },
    removeListener: (c, f) => void renderer.get(c)?.delete(f),
  };
  const reg = registerPipeBridge(
    main,
    (e: BridgeEvent) => renderer.get(CH.event)?.forEach((f) => f({}, e)),
    opts,
  );
  return { reg, bridge: makePreloadBridge(ipcr), ons, handlers };
}

const until = async (f: () => boolean) => {
  for (let i = 0; i < 100 && !f(); i++)
    await new Promise((r) => setTimeout(r, 20));
  expect(f()).toBe(true);
};

describe("ElectronPipe over the bridge", () => {
  const cleanup: (() => Promise<void>)[] = [];
  afterEach(async () => {
    for (const c of cleanup.splice(0)) await c();
  });

  it("hosts a socket and moves text both ways", async () => {
    const w = wire();
    const pipe = new ElectronPipe(w.bridge);
    cleanup.push(
      () => pipe.stop(),
      () => w.reg.dispose(),
    );
    const got: string[] = [];
    const closed: number[] = [];
    const { port } = await pipe.listen(0, {
      onOpen: (c) => pipe.send(c, "hello"),
      onMessage: (_c, t) => got.push(t),
      onClose: (c) => closed.push(c),
    });
    expect(port).toBeGreaterThan(0);
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const back: string[] = [];
    ws.onmessage = (m) => back.push(String(m.data));
    await until(() => back.length === 1);
    expect(back[0]).toBe("hello");
    ws.send("ping");
    await until(() => got.length === 1);
    expect(got[0]).toBe("ping");
    ws.close();
    await until(() => closed.length === 1);
  });

  it("announces and discovers over UDP", async () => {
    const dp = 24000 + Math.floor(Math.random() * 1000);
    const w = wire({ discoveryPort: dp, broadcastAddress: "127.0.0.1" });
    cleanup.push(() => w.reg.dispose());
    const pipe = new ElectronPipe(w.bridge);
    cleanup.push(() => pipe.stop());
    const heard: [string, string][] = [];
    const stop = pipe.discover((t, from) => heard.push([t, from]));
    await new Promise((r) => setTimeout(r, 50));
    pipe.announce("game-entry");
    await until(() => heard.length > 0);
    expect(heard[0]).toEqual(["game-entry", "127.0.0.1"]);
    pipe.announce(undefined);
    stop();
  });

  it("rejects bad arguments", async () => {
    const w = wire();
    cleanup.push(() => w.reg.dispose());
    await expect(w.bridge.listen(-1)).rejects.toThrow();
    expect(() => w.bridge.send(0, "x")).toThrow();
    expect(() => w.bridge.send(1, 5 as unknown as string)).toThrow();
    await expect(w.handlers.get(CH.listen)?.({}, "80")).rejects.toThrow();
  });
});
