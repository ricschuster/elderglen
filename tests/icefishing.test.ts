import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import { FESTIVALS } from "../src/core/festivals";
import { festivalLayout } from "../src/core/festivalroutes";
import {
  FROSTFIN,
  ICE_FISHING,
  awardIcePrize,
  finishIceFishing,
  iceBite,
  iceEndLine,
  iceOffer,
  iceWinner,
  isHole,
  judge,
  lakeShut,
  noteHoleCatch,
  startIceFishing,
} from "../src/core/icefishing";
import { itemById } from "../src/core/items";
import { newGame } from "../src/core/save";

const f = FESTIVALS.find((x) => x.id === "frostday")!;
const day = (year: number) =>
  (year - 1) * SEASONS.length * DAYS_PER_SEASON +
  SEASONS.indexOf("winter") * DAYS_PER_SEASON +
  8;

const won = () => {
  const s = startIceFishing(f)!;
  for (let i = 0; i < 5; i++) noteHoleCatch(s, "forest-lake", true);
  judge(s, 13 * 60);
  return s;
};

describe("ice fishing", () => {
  it("knows the twelve holes and shuts the lake before noon", () => {
    expect(festivalLayout(f)!.holes).toHaveLength(12);
    expect(isHole(f, 42, 22)).toBe(true);
    expect(isHole(f, 43, 22)).toBe(false);
    expect(lakeShut(f, 11 * 60 + 59)).toBe(true);
    expect(lakeShut(f, 12 * 60)).toBe(false);
  });

  it("counts only Forest lake fish cast into a hole", () => {
    const s = startIceFishing(f)!;
    expect(noteHoleCatch(s, "river", true)).toBe(false);
    expect(noteHoleCatch(s, "forest-lake", false)).toBe(false);
    expect(noteHoleCatch(s, "forest-lake", true)).toBe(true);
    expect(s.caught).toBe(1);
    expect(startIceFishing(FESTIVALS.find((x) => x.id !== "frostday")!)).toBe(
      undefined,
    );
  });

  it("the Frostfin replaces a fish bite only, never the tutorial or other bites", () => {
    const carp = { kind: "fish", fish: { ...FROSTFIN, id: "carp" } } as const;
    const hit = iceBite(carp, false, () => 0);
    expect(hit.kind === "fish" && hit.fish.id).toBe("frostfin");
    expect(iceBite(carp, false, () => 0.99)).toBe(carp);
    expect(iceBite(carp, true, () => 0)).toBe(carp);
    const none = { kind: "none" } as const;
    expect(iceBite(none, false, () => 0)).toBe(none);
    expect(itemById("frostfin")?.name).toBe("Frostfin");
  });

  it("wins at 5 any time, but a short count loses only from the judging time", () => {
    const s = startIceFishing(f)!;
    for (let i = 0; i < 4; i++) noteHoleCatch(s, "forest-lake", true);
    expect(judge(s, 16 * 60 + 59)).toBe("fishing");
    expect(iceOffer(s, "cuthbert", 13 * 60)).toContain("4 of 5");
    expect(iceOffer(s, "tilda", 13 * 60)).toBeUndefined();
    expect(judge(s, 17 * 60)).toBe("lost");
    expect(iceWinner(s)).toBe("rushie");
    expect(iceEndLine(s)).toContain("Rushie wins");
    const w = won();
    expect(iceWinner(w)).toBe("player");
    expect(noteHoleCatch(w, "forest-lake", true)).toBe(false);
    expect(iceOffer(startIceFishing(f), "cuthbert", 11 * 60)).toContain("noon");
  });

  it("gives the hat once ever and one Frostfin a year", () => {
    const g = newGame("test");
    g.day.clock.day = day(1);
    const first = awardIcePrize(g, won())!;
    expect(first.hat).toBe(ICE_FISHING.hat);
    expect(first.frostfin).toBe(true);
    expect(g.inventory.count("frostfin")).toBe(1);
    expect(awardIcePrize(g, won())).toBeUndefined();
    g.day.clock.day = day(2);
    const next = awardIcePrize(g, won())!;
    expect(next.hat).toBeUndefined();
    expect(next.frostfin).toBe(true);
    expect(awardIcePrize(g, startIceFishing(f)!)).toBeUndefined();
  });

  it("ends the festival after the judging", () => {
    const g = newGame("test");
    g.day.clock.day = day(1);
    g.day.clock.minutes = 13 * 60;
    const s = startIceFishing(f)!;
    expect(finishIceFishing(g, s)).toBe(false);
    expect(finishIceFishing(g, won())).toBe(true);
    expect(g.day.clock.minutes).toBeGreaterThanOrEqual(f.ends);
  });
});
