import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import {
  CAKE_POINTS,
  POOR_DISH,
  dishesMissing,
  giveDish,
  lowestQuality,
  newCakeTable,
  tasteResult,
} from "../src/core/cakeday";
import {
  FestivalGate,
  WAITING_TO_LEAVE,
  nameList,
  waitingToEnterLine,
} from "../src/core/festivalgate";
import { festivalLayout } from "../src/core/festivalroutes";
import { FESTIVALS } from "../src/core/festivals";
import { feastRecipient } from "../src/core/feastexchange";
import {
  iceDone,
  iceWinners,
  judgeEntry,
  noteContestCatch,
  startIceContest,
} from "../src/core/icefishing";
import { rollPearl, PEARL } from "../src/core/marketpier";
import { asPlayer } from "../src/core/asplayer";
import { LOCAL_PLAYER } from "../src/core/players";
import { deserialize, newGame, serialize } from "../src/core/save";
import {
  HUNT_TARGETS,
  huntTarget,
  huntWinners,
  pickPacket,
  startHuntContest,
  tickContest,
  contestRival,
} from "../src/core/seedhunt";
import {
  collectProblem,
  collectShowingPrize,
  judgeShared,
  sharedResult,
} from "../src/core/showing";

const fest = (id: string) => FESTIVALS.find((f) => f.id === id)!;
const dayOf = (id: string, year = 1) => {
  const f = fest(id);
  return (
    (year - 1) * SEASONS.length * DAYS_PER_SEASON +
    SEASONS.indexOf(f.season) * DAYS_PER_SEASON +
    f.day
  );
};

describe("festival gate", () => {
  it("goes ahead only when every present player has entered", () => {
    const gate = new FestivalGate("harvest-showing", 1);
    const all = ["p1", "p2", "p3"];
    gate.enter("p2", all);
    expect(gate.ahead).toBe(false);
    expect(gate.waitingToEnter(all)).toEqual(["p1", "p3"]);
    expect(gate.view(all, (id) => id.toUpperCase()).line).toBe(
      "Waiting for P1 and P3.",
    );
    gate.enter("p1", all);
    gate.enter("p3", all);
    expect(gate.ahead).toBe(true);
    expect(gate.view(all, String).line).toBe("");
  });

  it("does not count a dropped guest, and a lone player goes straight in", () => {
    const gate = new FestivalGate("harvest-showing", 1);
    gate.enter("p1", ["p1", "p2"]);
    expect(gate.ahead).toBe(false);
    gate.refresh(["p1"]);
    expect(gate.ahead).toBe(true);
    const solo = new FestivalGate("x", 1);
    solo.enter("p1", ["p1"]);
    expect(solo.ahead).toBe(true);
  });

  it("ends when every player inside has chosen to leave", () => {
    const gate = new FestivalGate("x", 1);
    const all = ["p1", "p2"];
    expect(gate.leave("p1", all)).toBe("You have not gone in.");
    gate.enter("p1", all);
    expect(gate.leave("p1", all)).toBe("The others have not all come in yet.");
    gate.enter("p2", all);
    expect(gate.leave("p1", all)).toBeUndefined();
    expect(gate.ended).toBe(false);
    expect(gate.view(all, String).line).toBe(WAITING_TO_LEAVE);
    gate.refresh(["p1"]); // p2 dropped
    expect(gate.ended).toBe(true);
    expect(gate.enter("p2", all)).toBe("The festival is over for today.");
  });

  it("a main event can end it, and a late arrival walks in", () => {
    const gate = new FestivalGate("x", 1);
    gate.enter("p1", ["p1"]);
    gate.enter("p2", ["p1", "p2"]);
    expect(gate.ahead).toBe(true);
    expect(gate.waitingToLeave(["p1", "p2"])).toEqual(["p1", "p2"]);
    gate.finish();
    expect(gate.ended).toBe(true);
  });

  it("names read as a list", () => {
    expect(nameList(["Ada"])).toBe("Ada");
    expect(nameList(["Ada", "Bram"])).toBe("Ada and Bram");
    expect(nameList(["Ada", "Bram", "Cy"])).toBe("Ada, Bram and Cy");
    expect(waitingToEnterLine(["Ada", "Bram"])).toBe(
      "Waiting for Ada and Bram.",
    );
  });
});

describe("seed hunt with several players", () => {
  const f = fest("seedswap-fair");
  const hunt = festivalLayout(f)!.hunt!;
  const start = (players: string[]) =>
    startHuntContest(f, dayOf("seedswap-fair"), 13 * 60, players)!;

  it("lowers the target with the number of players, keeping one player's nine", () => {
    expect(HUNT_TARGETS).toEqual([9, 7, 6, 5]);
    expect(huntTarget(hunt, 1)).toBe(9);
    expect(huntTarget(hunt, 2)).toBe(7);
    expect(huntTarget(hunt, 3)).toBe(6);
    expect(huntTarget(hunt, 4)).toBe(5);
    expect(huntTarget(hunt, 8)).toBe(5);
  });

  it("a lone player wins on reaching the target, as in single player", () => {
    const c = start(["p1"]);
    expect(c.target).toBe(9);
    for (const t of c.packets.slice(0, 9)) pickPacket(c, "p1", t[0], t[1]);
    expect(c.counts.p1).toBe(9);
    expect(c.status).toBe("done");
    expect(huntWinners(c)).toEqual(["p1"]);
  });

  it("the top player who reached the target wins; a tie for the most gives each the win", () => {
    const c = start(["p1", "p2"]);
    expect(c.target).toBe(7);
    const all = [...c.packets];
    for (const t of all.slice(0, 7)) pickPacket(c, "p1", t[0], t[1]);
    for (const t of all.slice(7, 13)) pickPacket(c, "p2", t[0], t[1]);
    expect(c.status).toBe("running");
    pickPacket(c, "p2", all[13]![0], all[13]![1]);
    // Both reached 7: a tie for the most.
    expect(huntWinners(c).sort()).toEqual(["p1", "p2"]);
    const d = start(["p1", "p2"]);
    const tiles = [...d.packets];
    for (const t of tiles.slice(0, 8)) pickPacket(d, "p1", t[0], t[1]);
    for (const t of tiles.slice(8, 15)) pickPacket(d, "p2", t[0], t[1]);
    expect(huntWinners(d)).toEqual(["p1"]);
  });

  it("a packet goes to the first player on its tile, and an unreached target means the rival wins", () => {
    const c = start(["p1", "p2"]);
    const t = c.packets[0]!;
    expect(pickPacket(c, "p1", t[0], t[1])).toBe(true);
    expect(pickPacket(c, "p2", t[0], t[1])).toBe(false);
    expect(pickPacket(c, "p3", c.packets[0]![0], c.packets[0]![1])).toBe(false);
    tickContest(c, 999);
    expect(c.status).toBe("done");
    expect(huntWinners(c)).toEqual([]);
    expect(contestRival(f, c)).toBe("linnet");
  });

  it("is decided early when nobody else can reach the target", () => {
    const c = start(["p1", "p2"]);
    const tiles = [...c.packets];
    for (const t of tiles.slice(0, 7)) pickPacket(c, "p1", t[0], t[1]);
    expect(c.status).toBe("running"); // p2 could still take the other 11
    for (const t of tiles.slice(7, 15)) pickPacket(c, "p1", t[0], t[1]);
    // 3 packets are left and p2 has none, so p2 cannot reach 7.
    expect(c.status).toBe("done");
  });
});

describe("ice contest with several players", () => {
  const f = fest("frostday");

  it("counts each player's hole catches and rewards every winner", () => {
    const c = startIceContest(f)!;
    for (let i = 0; i < 5; i++) noteContestCatch(c, "p2", "forest-lake", true);
    for (let i = 0; i < 6; i++) noteContestCatch(c, "p3", "forest-lake", true);
    noteContestCatch(c, "p4", "forest-lake", true);
    // Only the lake and only a hole count.
    expect(noteContestCatch(c, "p4", "river", true)).toBe(false);
    expect(noteContestCatch(c, "p4", "forest-lake", false)).toBe(false);
    expect(judgeEntry(c, "p2", 13 * 60)).toBe("won");
    expect(judgeEntry(c, "p3", 13 * 60)).toBe("won");
    expect(judgeEntry(c, "p4", 13 * 60)).toBe("fishing");
    expect(iceDone(c)).toBe(false);
    expect(judgeEntry(c, "p4", 17 * 60)).toBe("lost");
    expect(iceWinners(c).sort()).toEqual(["p2", "p3"]);
    expect(iceDone(c)).toBe(true);
  });

  it("a won entry stays won and stops counting", () => {
    const c = startIceContest(f)!;
    for (let i = 0; i < 5; i++) noteContestCatch(c, "p2", "forest-lake", true);
    judgeEntry(c, "p2", 13 * 60);
    expect(noteContestCatch(c, "p2", "forest-lake", true)).toBe(false);
    expect(c.entries.p2!.caught).toBe(5);
  });
});

describe("cake table with several players", () => {
  it("the lowest dish sets the quality, and a missing dish makes it the poor one", () => {
    expect(lowestQuality(["gold", "silver", "gold"])).toBe("silver");
    expect(lowestQuality([])).toBe(POOR_DISH);
    const table = newCakeTable(1);
    table.dishes.p1 = "gold";
    expect(tasteResult(table, ["p1", "p2"])).toEqual({
      quality: "normal",
      missing: ["p2"],
    });
    table.dishes.p2 = "silver";
    expect(dishesMissing(table, ["p1", "p2"])).toEqual([]);
    expect(tasteResult(table, ["p1", "p2"])).toEqual({
      quality: "silver",
      missing: [],
    });
    // A dropped player's dish is not counted.
    expect(tasteResult(table, ["p2"])!.quality).toBe("silver");
    expect(tasteResult(newCakeTable(1), ["p1"])).toBeUndefined();
    expect(CAKE_POINTS.silver).toBe(90);
  });

  it("a dish is taken from the giver once, and only on Cake Day", () => {
    const g = newGame();
    const table = newCakeTable(1);
    g.inventory.add("fried-egg@gold", 1);
    expect(giveDish(g, table, "p1", "fried-egg@gold")).toBe(
      "There is no cake table today.",
    );
    g.day.clock.day = dayOf("cake-day");
    expect(giveDish(g, table, "p1", "fried-egg@gold")).toBeUndefined();
    expect(table.dishes.p1).toBe("gold");
    expect(g.inventory.count("fried-egg@gold")).toBe(0);
    expect(giveDish(g, table, "p1", "fried-egg@gold")).toBe(
      "Your dish is already on the table.",
    );
  });
});

describe("shared Harvest Showing display", () => {
  it("is judged once for the farm, and each player collects the same placing once", () => {
    const g = newGame("standard", "separate");
    g.day.clock.day = dayOf("harvest-showing");
    g.players.add("p2", 0);
    const ids = ["parsnip", "parsnip"];
    g.inventory.add("parsnip", 2);
    expect(sharedResult(g)).toBeUndefined();
    expect(collectProblem(g)).toBe("The judge has not scored the table yet.");
    const r = judgeShared(g, ids)!;
    expect(sharedResult(g)!.place.place).toBe(r.place.place);
    expect(sharedResult(g)!.points).toBe(r.score.total);
    expect(judgeShared(g, ids)).toBeUndefined();
    // Nothing is paid by the judging.
    expect(g.showTokens.count).toBe(0);
    const a = collectShowingPrize(g)!;
    expect(a.tokens).toBe(r.place.tokens);
    expect(collectShowingPrize(g)).toBeUndefined();
    const b = asPlayer(g, "p2", () => collectShowingPrize(g))!;
    expect(b.tokens).toBe(r.place.tokens);
    expect(g.players.get("p2").showTokens.count).toBe(r.place.tokens);
    expect(g.showTokens.count).toBe(r.place.tokens);
  });

  it("starts fresh the next year", () => {
    const g = newGame();
    g.day.clock.day = dayOf("harvest-showing");
    g.inventory.add("parsnip", 1);
    judgeShared(g, ["parsnip"]);
    expect(sharedResult(g)).toBeDefined();
    g.day.clock.day = dayOf("harvest-showing", 2);
    expect(sharedResult(g)).toBeUndefined();
  });
});

describe("per-player festival record", () => {
  it("each player has their own keys and tokens, saved and loaded, and old saves still load", () => {
    const g = newGame("standard", "separate");
    g.players.add("p2", 0);
    g.festivalsJoined.push("host-key");
    asPlayer(g, "p2", () => {
      g.festivalsJoined.push("guest-key");
      g.showTokens = { year: 1, count: 50 };
    });
    expect(g.festivalsJoined).toEqual(["host-key"]);
    expect(g.showTokens.count).toBe(0);
    const back = deserialize(serialize(g))!;
    expect(back.festivalsJoined).toEqual(["host-key"]);
    expect(back.players.get("p2").festivalsJoined).toEqual(["guest-key"]);
    expect(back.players.get("p2").showTokens).toEqual({ year: 1, count: 50 });
    // A save from before this change (no guest keys) loads with none.
    const old = JSON.parse(serialize(g));
    for (const p of old.players) {
      delete p.festivals;
      delete p.tokens;
    }
    const loaded = deserialize(JSON.stringify(old))!;
    expect(loaded.players.get("p2").festivalsJoined).toEqual([]);
    expect(loaded.festivalsJoined).toEqual(["host-key"]);
    expect(LOCAL_PLAYER).toBe("p1");
  });

  it("the Night Market pearl is once for each player", () => {
    const g = newGame("standard", "separate");
    g.day.clock.day = dayOf("night-market");
    g.players.add("p2", 0);
    const at = { x: 63, y: 66 };
    expect(rollPearl(g, at, () => 0)).toBe(true);
    expect(rollPearl(g, at, () => 0)).toBe(false);
    expect(g.inventory.count(PEARL.id)).toBe(1);
    expect(asPlayer(g, "p2", () => rollPearl(g, at, () => 0))).toBe(true);
    expect(g.players.get("p2").inventory.count(PEARL.id)).toBe(1);
  });

  it("each player draws their own feast recipient from their own seed", () => {
    const g = newGame("standard", "separate");
    g.day.clock.day = dayOf("midwinter-feast");
    g.players.add("p2", 0);
    const host = feastRecipient(g, false);
    const again = feastRecipient(g, false);
    expect(again).toBe(host);
    const guest = asPlayer(g, "p2", () => feastRecipient(g, false));
    expect(typeof guest).toBe("string");
    expect(
      g.players
        .get("p2")
        .festivalsJoined.some((k) => k.startsWith("feast-recipient")),
    ).toBe(true);
  });
});
