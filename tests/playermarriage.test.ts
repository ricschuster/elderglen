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
import { TOKEN } from "../src/core/courtship";
import {
  callOff,
  engagedWith,
  expireProposals,
  loadPlayerMarriage,
  marriageReportLines,
  proposalFor,
  savePlayerMarriage,
} from "../src/core/playermarriage";
import {
  ledgerRows,
  proposalCard,
  weddingBeat,
  weddingLines,
  weddingWaiting,
} from "../src/core/marriagecard";
import { deserialize, serialize } from "../src/core/save";
import { applyServerMsg } from "../src/net/guestapply";
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
    expect(w.apply("p2", { kind: "propose", to: "p3" })).toMatch(/token/);
    w.g.players.get("p2").inventory.add(TOKEN, 1);
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

const room = () => {
  const w = new GameRoomWorld(newGame("standard", "separate"), {
    random: () => 0.5,
  });
  for (const [id, n] of [
    ["p2", "Ann"],
    ["p3", "Bo"],
  ] as const) {
    w.admit(id, n);
    w.addPlayer(id, n);
  }
  w.g.players.get("p2").inventory.add(TOKEN, 1);
  return w;
};
const tokens = (w: GameRoomWorld, id: string) =>
  w.g.players.get(id).inventory.count(TOKEN);

describe("token, expiry and calling off (owner, 2026-11-19)", () => {
  it("the token is held while open, used up on accept, back on decline", () => {
    const w = room();
    w.apply("p2", { kind: "propose", to: "p3" });
    expect(tokens(w, "p2")).toBe(0);
    expect(proposalFor(w.marriages, "p3")).toBeDefined();
    expect(proposalFor(w.marriages, "p2")).toBeUndefined();
    w.apply("p3", { kind: "decline-proposal" });
    expect(tokens(w, "p2")).toBe(1);
    w.apply("p2", { kind: "propose", to: "p3" });
    w.apply("p3", { kind: "accept-proposal" });
    expect(tokens(w, "p2")).toBe(0);
    expect(bondOf(w.marriages, "p2")?.stage).toBe("engaged");
  });

  it("withdrawing returns the token", () => {
    const w = room();
    w.apply("p2", { kind: "propose", to: "p3" });
    expect(w.apply("p2", { kind: "withdraw-proposal" })).toBeUndefined();
    expect(tokens(w, "p2")).toBe(1);
  });

  it("an unanswered proposal expires at the day end and refunds", () => {
    const w = room();
    w.apply("p2", { kind: "propose", to: "p3" });
    w.tracker.setAsleep("p1");
    w.tracker.setAsleep("p2");
    w.tracker.setAsleep("p3");
    w.step(60_000);
    expect(bondOf(w.marriages, "p2")).toBeUndefined();
    expect(tokens(w, "p2")).toBe(1);
  });

  it("expireProposals leaves engaged and married bonds", () => {
    const b = wed();
    propose(b, "p4", "p5");
    expect(expireProposals(b)).toEqual(["p4"]);
    expect(isMarried(b, "p2")).toBe(true);
  });

  it("an engaged couple call it off free; the token stays spent; wed cannot", () => {
    const w = room();
    w.apply("p2", { kind: "propose", to: "p3" });
    w.apply("p3", { kind: "accept-proposal" });
    w.g.players.wallet("p3").money = 7;
    expect(w.apply("p3", { kind: "file-divorce" })).toMatch(/not wed/);
    expect(w.apply("p3", { kind: "call-off" })).toBeUndefined();
    expect(w.g.players.wallet("p3").money).toBe(7);
    expect(tokens(w, "p2")).toBe(0);
    expect(bondOf(w.marriages, "p2")).toBeUndefined();
    expect(callOff(wed(), "p2").ok).toBe(false);
  });

  it("a wed pair share a bed: each must get in it themselves", () => {
    const w = room();
    bondOf(w.marriages, "p2");
    propose(w.marriages, "p2", "p3");
    respond(w.marriages, "p3", true, 1);
    weddingMorning(w.marriages, 4, "");
    w.apply("p2", { kind: "sleep" });
    expect(w.presence("p2")).toBe("asleep");
    expect(w.presence("p3")).toBe("awake");
    w.apply("p3", { kind: "sleep" });
    expect(w.presence("p3")).toBe("asleep");
    w.apply("p3", { kind: "wake" });
    expect(w.presence("p2")).toBe("asleep");
  });
});

describe("report lines and saving", () => {
  it("shows the engaged notice and a told divorce", () => {
    const b = newPlayerMarriageBook();
    propose(b, "p2", "p3");
    respond(b, "p3", true, 10);
    const nm = (k: string) => (k === "p2" ? "Ann" : "Bo");
    expect(engagedWith(b, "p3")).toEqual({ partner: "p2", weddingDay: 13 });
    expect(marriageReportLines(b, "p3", 11, nm)).toEqual([
      "Engaged to Ann. The wedding is in 2 days.",
    ]);
    expect(marriageReportLines(b, "p3", 12, nm)).toEqual([
      "Wedding tomorrow with Ann.",
    ]);
    expect(
      marriageReportLines(b, "p2", 12, nm, [{ filer: "p3", told: "p2" }]),
    ).toContain("Bo filed for divorce.");
  });

  it("the book survives a save, and bad data loads as no bonds", () => {
    const w = room();
    w.apply("p2", { kind: "propose", to: "p3" });
    w.apply("p3", { kind: "accept-proposal" });
    const back = deserialize(serialize(w.g));
    expect(back && bondOf(back.playerMarriage, "p2")).toMatchObject({
      stage: "engaged",
      proposer: "p2",
    });
    const raw = savePlayerMarriage(w.marriages);
    expect(loadPlayerMarriage(raw).bonds).toHaveLength(1);
    expect(loadPlayerMarriage(raw, () => false).bonds).toHaveLength(0);
    expect(loadPlayerMarriage("x").bonds).toEqual([]);
    expect(
      loadPlayerMarriage({
        bonds: [
          { proposer: "a", other: "a", stage: "married", weddingDay: 1 },
          { proposer: "a", other: "b", stage: "nope", weddingDay: 1 },
        ],
      }).bonds,
    ).toEqual([]);
  });

  it("a guest copy follows marriage intents the host applied", () => {
    const w = room();
    const guest = deserialize(serialize(w.g))!;
    const intent = { kind: "propose", to: "p3" };
    expect(w.apply("p2", intent)).toBeUndefined();
    expect(
      applyServerMsg(guest, { t: "applied", seq: 1, by: "p2", intent }),
    ).toBe(true);
    expect(proposalFor(guest.playerMarriage, "p3")).toBeDefined();
    expect(guest.players.get("p2").inventory.count(TOKEN)).toBe(0);
  });
});

describe("marriage screens", () => {
  const nm = (k: string) => (k === "p2" ? "Ann" : "Bo");
  it("the proposal card is for the asked player only", () => {
    const b = newPlayerMarriageBook();
    propose(b, "p2", "p3");
    expect(proposalCard(b, "p2", nm)).toBeUndefined();
    expect(proposalCard(b, "p3", nm)?.text).toMatch(/Ann/);
    respond(b, "p3", true, 1);
    expect(proposalCard(b, "p3", nm)).toBeUndefined();
  });

  it("ledger rows follow the stage: call off free, divorce for the wed", () => {
    const b = newPlayerMarriageBook();
    expect(ledgerRows(b, "p2", 0, nm)).toEqual([]);
    propose(b, "p2", "p3");
    expect(ledgerRows(b, "p2", 0, nm)).toEqual([]);
    respond(b, "p3", true, 10);
    expect(ledgerRows(b, "p3", 0, nm)[0]).toMatchObject({
      intent: "call-off",
      dim: false,
    });
    weddingMorning(b, 13, "");
    expect(ledgerRows(b, "p3", 5, nm)[0]).toMatchObject({
      intent: "file-divorce",
      dim: true,
    });
    expect(ledgerRows(b, "p3", DIVORCE_FEE, nm)[0]?.dim).toBe(false);
    fileDivorce(b, "p3", DIVORCE_FEE);
    expect(ledgerRows(b, "p3", 0, nm)[0]?.intent).toBe("cancel-divorce");
    expect(ledgerRows(b, "p2", 0, nm)[0]).toMatchObject({
      intent: "",
      dim: true,
    });
  });

  it("the wedding scene lines and the seen intent", () => {
    const w = room();
    propose(w.marriages, "p2", "p3");
    respond(w.marriages, "p3", true, 1);
    expect(weddingLines(w.marriages, "p3", nm)).toEqual([]);
    weddingMorning(w.marriages, 4, "");
    expect(weddingWaiting(w.marriages, "p3")).toBe(true);
    expect(weddingLines(w.marriages, "p3", nm).join(" ")).toMatch(/Ann.*Bo/);
    expect(w.apply("p3", { kind: "wedding-seen" })).toBeUndefined();
    expect(weddingWaiting(w.marriages, "p3")).toBe(false);
    expect(weddingWaiting(w.marriages, "p2")).toBe(true);
  });
});

describe("wedding staging", () => {
  it("walks the couple in, joins them, then walks them off", () => {
    const [b0, b1, b2, b3] = [0, 1, 2, 3].map(weddingBeat);
    expect(b0!.a).toBeLessThan(b1!.a);
    expect(b1!.a).toBeLessThan(b1!.o);
    expect(b2!.hop).toBe(true);
    expect(b3!.a).toBeGreaterThan(960);
    expect(weddingBeat(99)).toEqual(b3);
    expect(weddingBeat(-1)).toEqual(b0);
  });
});
