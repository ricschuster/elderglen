import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import {
  PARADE_LINE,
  PARADE_TAIL,
  paradeLaps,
} from "../src/core/festivalroutes";
import {
  PARADE_FRIENDSHIP,
  finishParade,
  joinParade,
  paradeEnd,
  paradeJoin,
  paradeJoinProblem,
  paradeJoinedAt,
  playerMarchAt,
} from "../src/core/parade";
import { newGame } from "../src/core/save";

const SPRING_10 = SEASONS.indexOf("spring") * DAYS_PER_SEASON + 10;

function game(minutes: number, day = SPRING_10) {
  const g = newGame();
  g.day.clock.day = day;
  g.day.clock.minutes = minutes;
  g.wardrobe.add("parade-ribbon");
  g.wardrobe.wear("parade-ribbon");
  return g;
}

describe("the player's part in the Hat Parade march (note 82)", () => {
  it("lets a hatted player on the square fall in between 14:00 and 14:30", () => {
    expect(paradeJoinProblem(game(14 * 60), "hearthwell", 66, 60)).toBe(
      undefined,
    );
    expect(paradeJoinProblem(game(14 * 60 + 30), "hearthwell", 66, 60)).toBe(
      undefined,
    );
    expect(paradeJoinProblem(game(13 * 60 + 50), "hearthwell", 66, 60)).toMatch(
      /two/,
    );
    expect(paradeJoinProblem(game(14 * 60 + 40), "hearthwell", 66, 60)).toMatch(
      /gone by/,
    );
  });

  it("needs the square, the day and a hat", () => {
    expect(paradeJoinProblem(game(14 * 60), "hearthwell", 50, 60)).toMatch(
      /square/,
    );
    expect(paradeJoinProblem(game(14 * 60), "forest", 66, 60)).toMatch(
      /square/,
    );
    expect(
      paradeJoinProblem(game(14 * 60, SPRING_10 + 1), "hearthwell", 66, 60),
    ).toMatch(/no march/);
    const bare = game(14 * 60);
    bare.wardrobe.wear(undefined);
    expect(paradeJoinProblem(bare, "hearthwell", 66, 60)).toMatch(/hat/);
  });

  it("records the join once a year and gives the late extra lap", () => {
    const g = game(14 * 60 + 20);
    expect(paradeJoinedAt(g)).toBeUndefined();
    expect(joinParade(g, "hearthwell", 66, 60)).toBeUndefined();
    expect(paradeJoin(g)).toEqual({ at: 14 * 60 + 20, stand: [66, 60] });
    expect(paradeLaps(paradeJoinedAt(g))).toHaveLength(2);
    expect(joinParade(g, "hearthwell", 66, 60)).toMatch(/marched/);
    expect(paradeJoinedAt(game(14 * 60))).toBeUndefined();
  });

  it("walks the player at the tail: waiting, out to the turn and back, then done", () => {
    const g = game(14 * 60);
    joinParade(g, "hearthwell", 66, 60);
    const j = paradeJoin(g)!;
    expect(playerMarchAt(j, 14 * 60).state).toBe("waiting");
    expect(playerMarchAt(j, 14 * 60).tile).toEqual([66, 60]);
    // The tail reaches the square mouth 22 minutes after the head (one minute each).
    const mouth = playerMarchAt(j, 14 * 60 + PARADE_TAIL);
    expect(mouth).toEqual({ state: "marching", tile: [64, 61] });
    const turn = playerMarchAt(j, 14 * 60 + PARADE_TAIL + 16);
    expect(turn.tile).toEqual([48, 61]);
    const end = paradeEnd(j);
    expect(playerMarchAt(j, end).state).toBe("marching");
    expect(playerMarchAt(j, end + 1)).toEqual({
      state: "done",
      tile: [66, 60],
    });
  });

  it("pays +20 friendship with each marcher once a year", () => {
    const g = game(14 * 60);
    const before = g.friendship.points("cuthbert");
    const line = finishParade(g);
    expect(line).toMatch(/Well marched/);
    for (const id of PARADE_LINE)
      expect(g.friendship.points(id), id).toBeGreaterThan(
        id === "cuthbert" ? before : -1,
      );
    expect(g.friendship.points("cuthbert") - before).toBe(PARADE_FRIENDSHIP);
    finishParade(g);
    expect(g.friendship.points("cuthbert") - before).toBe(PARADE_FRIENDSHIP);
  });
});
