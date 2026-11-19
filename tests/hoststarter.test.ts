import { afterEach, describe, expect, it } from "vitest";
import { makeHostStarter } from "../src/net/hoststarter";
import { SocketTransport } from "../src/net/sockettransport";
import { NodePipe } from "../src/net/pipe-node";
import { GuestClient } from "../src/net/client";
import { GameRoomWorld } from "../src/core/roomworld";
import { newGame } from "../src/core/save";
import { parseAnnounce } from "../src/net/announce";
import type { PipeEvents, PipeListening, SocketPipe } from "../src/net/pipe";

const clients: GuestClient[] = [];
const transports: SocketTransport[] = [];
afterEach(() => {
  clients.splice(0).forEach((c) => c.close());
  transports.splice(0).forEach((t) => t.stopHosting());
});

/** A pipe that records announcements and reports a LAN address. */
class RecordingPipe extends NodePipe implements SocketPipe {
  announced: (string | undefined)[] = [];
  override announce(text: string | undefined): void {
    this.announced.push(text);
  }
  override async listen(port: number, ev: PipeEvents): Promise<PipeListening> {
    const l = await super.listen(port, ev);
    return { ...l, address: "192.168.1.20" };
  }
}

describe("makeHostStarter", () => {
  it("makes canHost true and hosts a real room with an announcement", async () => {
    const pipes: RecordingPipe[] = [];
    const worlds: string[] = [];
    const t = new SocketTransport(
      makeHostStarter({
        makePipe: () => {
          const p = new RecordingPipe();
          pipes.push(p);
          return p;
        },
        makeWorld: (name, o) => {
          worlds.push(`${name}:${o.walletMode}`);
          return new GameRoomWorld(newGame("standard", o.walletMode));
        },
        tickHz: 50,
      }),
    );
    transports.push(t);
    expect(t.canHost).toBe(true);
    const info = await t.startHosting("Farm", { walletMode: "separate" });
    expect(worlds).toEqual(["Farm:separate"]);
    expect(info.address).toMatch(/^192\.168\.1\.20:\d+$/);
    const port = Number(info.address.split(":")[1]);
    const game = parseAnnounce(pipes[0]!.announced[0]!, "192.168.1.20", 0);
    expect(game?.name).toBe("Farm");
    expect(game?.port).toBe(port);

    const g = await GuestClient.connect(`ws://127.0.0.1:${port}`, {
      name: "Pip",
    });
    clients.push(g);
    expect(g.farm).toBeTruthy();
    // The count change is announced again.
    expect(pipes[0]!.announced.length).toBeGreaterThan(1);
  });

  it("is not available without a starter, and stop frees the port", async () => {
    expect(new SocketTransport().canHost).toBe(false);
    const t = new SocketTransport(
      makeHostStarter({
        makePipe: () => new NodePipe(),
        makeWorld: () => new GameRoomWorld(newGame()),
      }),
    );
    transports.push(t);
    const info = await t.startHosting("A");
    t.stopHosting();
    await expect(
      GuestClient.connect(`ws://127.0.0.1:${info.address.split(":")[1]}`, {
        name: "x",
      }),
    ).rejects.toBeTruthy();
  });
});
