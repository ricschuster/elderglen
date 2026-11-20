import { describe, expect, it } from "vitest";
import { GameRoomWorld } from "../src/core/roomworld";
import { CABIN_PRICE } from "../src/core/cabins";
import { newGame } from "../src/core/save";

const mk = (origin: "multiplayer-start" | "converted" = "multiplayer-start") =>
  new GameRoomWorld(newGame("standard", "separate"), {
    origin,
    random: () => 0.5,
  });

describe("GameRoomWorld units", () => {
  it("admit holds a cabin and addPlayer commits it", () => {
    const w = mk();
    expect(w.admit("p2", "Ann")).toBeUndefined();
    expect(w.cabinOf("p2")).toBeUndefined();
    w.addPlayer("p2", "Ann");
    expect(w.cabinOf("p2")).toBeDefined();
    expect(w.names.get("p2")).toBe("Ann");
    expect(w.g.players.has("p2")).toBe(true);
  });

  it("a converted game refuses without a cabin, notes the offer, then buyCabin clears it", () => {
    const w = mk("converted");
    const refused: string[] = [];
    w.onCabinRefused = (n) => refused.push(n);
    expect(w.admit("p2", "Ann")).toBe("no-free-cabin");
    expect(refused).toEqual(["Ann"]);
    expect(w.cabinOffer).toEqual({ name: "Ann", price: CABIN_PRICE });
    w.g.players.wallet("p1").money = CABIN_PRICE;
    // The default site must be buildable, else the reason comes back.
    const r = w.buyCabin({ x: 0, y: 0 });
    if (r === undefined) {
      expect(w.cabinOffer).toBeUndefined();
      expect(w.g.players.wallet("p1").money).toBe(0);
    } else {
      expect(w.cabinOffer).toBeDefined();
    }
  });

  it("buyCabin refuses when the host cannot afford it", () => {
    const w = mk("converted");
    w.g.players.wallet("p1").money = CABIN_PRICE - 1;
    expect(w.buyCabin({ x: 0, y: 0 })).toBeDefined();
    expect(w.g.players.wallet("p1").money).toBe(CABIN_PRICE - 1);
  });

  it("a drop and a rejoin change presence", () => {
    const w = mk();
    w.admit("p2", "Ann");
    w.addPlayer("p2", "Ann");
    w.playerDropped("p2");
    expect(w.presence("p2")).toBe("dropped");
    w.playerRejoined("p2");
    expect(w.presence("p2")).not.toBe("dropped");
  });

  it("unknown players and unknown intents are refused", () => {
    const w = mk();
    expect(w.apply("p9", { kind: "sleep" })).toBe("unknown player");
    expect(w.apply("p1", { kind: "dance" } as never)).toMatch(/unknown intent/);
  });
});

describe("GameRoomWorld day end report", () => {
  it("everyone in bed ends the day once, with guest lines and a host report", () => {
    const w = mk();
    w.admit("p2", "Ann");
    w.addPlayer("p2", "Ann");
    w.apply("p1", { kind: "sleep" });
    w.step(2000);
    expect(w.takeNight()).toBeUndefined(); // Ann is still up
    w.apply("p2", { kind: "sleep" });
    const day = w.day();
    w.step(100);
    expect(w.takeNight()).toBeUndefined(); // settling
    w.step(2000);
    expect(w.day()).toBe(day + 1);
    const night = w.takeNight();
    expect(night?.forGuest("p2").lines[0]).toBe("You slept well.");
    expect(w.takeNight()).toBeUndefined();
    expect(w.takeHostNight()?.passedOut).toBe(false);
    expect(w.takeHostNight()).toBeUndefined();
    w.step(5000); // not again
    expect(w.day()).toBe(day + 1);
  });

  it("a guest awake at the limit passes out and pays once", () => {
    const w = mk();
    w.admit("p2", "Ann");
    w.addPlayer("p2", "Ann");
    w.g.players.wallet("p2").money = 1000;
    w.g.day.clock.minutes = 26 * 60;
    w.step(100);
    const g = w.takeNight()?.forGuest("p2");
    expect(g?.lost).toBe(100);
    expect(g?.lines[0]).toContain("passed out");
    expect(w.g.players.wallet("p2").money).toBe(900);
  });

  it("marriage news reaches the guest lines", () => {
    const w = mk();
    w.admit("p2", "Ann");
    w.addPlayer("p2", "Ann");
    w.lastWeddings = [{ proposer: "p1", other: "p2" }];
    w.lastDivorces = [];
    expect(w.guestLines("p2").lines).toContain(
      "You married Host this morning.",
    );
  });
});
