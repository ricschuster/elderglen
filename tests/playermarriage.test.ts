import { describe, expect, it } from "vitest";
import { newGame } from "../src/core/save";
import { DIVORCE_FEE } from "../src/core/marriage";
import { joinNeedsCabin, newCabinBook } from "../src/core/cabins";
import {
  bondOf,
  cancelDivorce,
  divorceMorning,
  fileDivorce,
  homeCabin,
  isMarried,
  newPlayerMarriageBook,
  partnerOf,
  propose,
  respond,
  takeWeddingScene,
  weddingMorning,
  withdraw,
} from "../src/core/playermarriage";
import { GameRoomWorld } from "../src/core/roomworld";

const wed = () => {
  const b = newPlayerMarriageBook();
  propose(b, "p2", "p3");
  respond(b, "p3", true, 10);
  weddingMorning(b, 13, "");
  return b;
};

describe("player marriage rules", () => {
  it("proposes, and a decline costs nothing and clears", () => {
    const b = newPlayerMarriageBook();
    expect(propose(b, "p2", "p3").ok).toBe(true);
    expect(propose(b, "p4", "p3").ok).toBe(false);
    expect(propose(b, "p2", "p2").ok).toBe(false);
    expect(respond(b, "p2", true, 1).ok).toBe(false); // the proposer cannot answer
    expect(respond(b, "p3", false, 1).ok).toBe(true);
    expect(bondOf(b, "p2")).toBeUndefined();
  });

  it("withdraw is for the proposer, before an answer", () => {
    const b = newPlayerMarriageBook();
    propose(b, "p2", "p3");
    expect(withdraw(b, "p3").ok).toBe(false);
    expect(withdraw(b, "p2").ok).toBe(true);
  });

  it("acceptance engages for three days; the wedding plays after night 3", () => {
    const b = newPlayerMarriageBook();
    propose(b, "p2", "p3");
    respond(b, "p3", true, 10);
    expect(bondOf(b, "p2")).toMatchObject({ stage: "engaged", weddingDay: 13 });
    expect(weddingMorning(b, 12, "")).toEqual([]);
    expect(weddingMorning(b, 13, "")).toEqual([
      { proposer: "p2", other: "p3" },
    ]);
    expect(isMarried(b, "p3")).toBe(true);
    expect(partnerOf(b, "p3")).toBe("p2");
  });

  it("a festival or rain day puts it off a day", () => {
    const b = newPlayerMarriageBook();
    propose(b, "p2", "p3");
    respond(b, "p3", true, 10);
    expect(weddingMorning(b, 13, "rain")).toEqual([]);
    expect(bondOf(b, "p2")?.weddingDay).toBe(14);
    expect(weddingMorning(b, 14, "")).toHaveLength(1);
  });

  it("an absent partner sees the scene when they next join", () => {
    const b = wed();
    expect(takeWeddingScene(b, "p2")).toBe(true);
    expect(takeWeddingScene(b, "p2")).toBe(false);
    expect(takeWeddingScene(b, "p3")).toBe(true);
  });

  it("the proposer's cabin is home; the mover's own cabin stays theirs", () => {
    const area = { x: 0, y: 0, w: 40, h: 10 };
    let cabins = newCabinBook("multiplayer-start");
    for (const k of ["p2", "p3"]) {
      const r = joinNeedsCabin(cabins, k, area, () => false);
      if (r.kind === "refused") throw new Error("refused");
      cabins = r.book;
    }
    const b = newPlayerMarriageBook();
    propose(b, "p2", "p3");
    respond(b, "p3", true, 1);
    expect(homeCabin(b, cabins, "p3")?.ownerKey).toBe("p3");
    weddingMorning(b, 4, "");
    expect(homeCabin(b, cabins, "p3")?.ownerKey).toBe("p2");
    expect(cabins.cabins.some((c) => c.ownerKey === "p3")).toBe(true);
    fileDivorce(b, "p3", DIVORCE_FEE);
    divorceMorning(b);
    expect(homeCabin(b, cabins, "p3")?.ownerKey).toBe("p3");
  });

  it("divorce needs the fee, can be cancelled by the filer, and tells the other", () => {
    const b = wed();
    expect(fileDivorce(b, "p2", DIVORCE_FEE - 1).ok).toBe(false);
    expect(fileDivorce(b, "p2", DIVORCE_FEE).ok).toBe(true);
    expect(fileDivorce(b, "p3", DIVORCE_FEE).ok).toBe(false);
    expect(cancelDivorce(b, "p3").ok).toBe(false);
    expect(cancelDivorce(b, "p2").ok).toBe(true);
    fileDivorce(b, "p3", DIVORCE_FEE);
    expect(divorceMorning(b)).toEqual([{ filer: "p3", told: "p2" }]);
    expect(bondOf(b, "p2")).toBeUndefined();
    expect(divorceMorning(b)).toEqual([]);
  });
});

describe("player marriage through the room world", () => {
  it("intents move gold: the filer pays, cancel refunds", () => {
    const w = new GameRoomWorld(newGame("standard", "separate"), {
      random: () => 0.5,
    });
    for (const [id, n] of [
      ["p2", "Ann"],
      ["p3", "Bo"],
    ] as const) {
      expect(w.admit(id, n)).toBeUndefined();
      w.addPlayer(id, n);
    }
    expect(w.apply("p2", { kind: "propose", to: "p3" })).toBeUndefined();
    expect(w.apply("p3", { kind: "accept-proposal" })).toBeUndefined();
    const b = bondOf(w.marriages, "p2")!;
    b.stage = "married";
    w.g.players.wallet("p3").money = DIVORCE_FEE + 5;
    expect(w.apply("p3", { kind: "file-divorce" })).toBeUndefined();
    expect(w.g.players.wallet("p3").money).toBe(5);
    expect(w.apply("p3", { kind: "cancel-divorce" })).toBeUndefined();
    expect(w.g.players.wallet("p3").money).toBe(DIVORCE_FEE + 5);
    expect(w.apply("p2", { kind: "file-divorce" })).toMatch(/fee/);
  });
});
