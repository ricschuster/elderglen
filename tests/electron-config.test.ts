import { describe, expect, it } from "vitest";
import {
  BRIDGE_KEY,
  DEV_URL,
  allowNavigation,
  pageTarget,
  webPreferences,
} from "../electron/config";
import { CH, makePreloadBridge } from "../src/net/pipe-electron-main";

describe("electron wrapper config", () => {
  it("picks the page", () => {
    expect(pageTarget({}, "/d")).toEqual({
      kind: "file",
      path: "/d/index.html",
    });
    expect(pageTarget({ ELDERGLEN_DEV: "1" }, "/d")).toEqual({
      kind: "url",
      url: DEV_URL,
    });
    expect(pageTarget({ ELDERGLEN_URL: "http://x:1/" }, "/d")).toEqual({
      kind: "url",
      url: "http://x:1/",
    });
  });
  it("allows only the game's own origin", () => {
    expect(allowNavigation(`${DEV_URL}/a`, DEV_URL)).toBe(true);
    expect(allowNavigation("https://example.com/", DEV_URL)).toBe(false);
    expect(allowNavigation("nonsense", DEV_URL)).toBe(false);
  });
  it("keeps isolation and the sandbox on", () => {
    expect(webPreferences("p.cjs")).toEqual({
      preload: "p.cjs",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    });
  });
  it("names the bridge as the page expects, with unique channels", () => {
    expect(BRIDGE_KEY).toBe("elderHost");
    const names = Object.values(CH);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((n) => n.startsWith("elderhost:"))).toBe(true);
    expect(Object.keys(makePreloadBridge({} as never)).sort()).toEqual(
      [
        "announce",
        "close",
        "discoverStart",
        "discoverStop",
        "listen",
        "onEvent",
        "send",
        "stop",
      ].sort(),
    );
  });
});
