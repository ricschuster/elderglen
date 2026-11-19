import { describe, expect, it } from "vitest";
import {
  nextWalletMode,
  normalizeHostOptions,
  walletModeLabel,
} from "../src/net/hostoptions";
import { FakeTransport } from "../src/net/transport";
import { SocketTransport } from "../src/net/sockettransport";
import {
  pendingByPlayer,
  settlementSplit,
  settlementSplitText,
} from "../src/core/settlementsplit";

describe("host options", () => {
  it("cycles and labels the wallet mode", () => {
    expect(nextWalletMode("shared")).toBe("separate");
    expect(nextWalletMode("separate")).toBe("shared");
    expect(walletModeLabel("shared")).not.toBe(walletModeLabel("separate"));
  });
  it("normalizes unknown values to shared", () => {
    expect(normalizeHostOptions().walletMode).toBe("shared");
    expect(
      normalizeHostOptions({ walletMode: "bad" as never }).walletMode,
    ).toBe("shared");
    expect(normalizeHostOptions({ walletMode: "separate" }).walletMode).toBe(
      "separate",
    );
  });
  it("passes the option through both transports", async () => {
    const f = new FakeTransport();
    await f.startHosting("v", { walletMode: "separate" });
    expect(f.hostOptions?.walletMode).toBe("separate");
    let got: string | undefined;
    const s = new SocketTransport(async (_n, o) => {
      got = o.walletMode;
      return { address: "x:1", stop() {} };
    });
    await s.startHosting("v", { walletMode: "separate" });
    expect(got).toBe("separate");
    await s.startHosting("v");
    expect(got).toBe("shared");
  });
});

describe("settlement split", () => {
  it("is empty for one player", () => {
    expect(settlementSplit({ p1: 120 })).toEqual([]);
    expect(settlementSplit({ p1: 120, p2: 0 })).toEqual([]);
    expect(settlementSplitText({})).toBe("");
  });
  it("lists each player with proceeds in id order", () => {
    expect(settlementSplit({ p2: 30, p1: 120, p10: 5 })).toEqual([
      "Host 120g",
      "Player 2 30g",
      "Player 10 5g",
    ]);
  });
  it("sums pending lines by shipper, defaulting to the host", () => {
    expect(
      pendingByPlayer([
        { count: 2, unit: 10 },
        { count: 1, unit: 5, by: "p2" },
        { count: 1, unit: 5, by: "p1" },
      ]),
    ).toEqual({ p1: 25, p2: 5 });
  });
});
