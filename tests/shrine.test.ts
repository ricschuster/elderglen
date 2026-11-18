import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import { newGame, type GameState } from "../src/core/save";
import {
  SHRINE,
  candlesFor,
  evaluate,
  finishFirstScene,
  firstSceneBeats,
  placeDiamond,
  redoLine,
  shrineNote,
  shrineScore,
  useStatue,
} from "../src/core/shrine";
import { HEARTHSILVER_ORE } from "../src/core/ore";
import { MAX_LEVEL, SKILLS } from "../src/core/skills";
import { deliverAll } from "../src/core/mail";

const dayOf = (season: string, d: number, year: number) =>
  (year - 1) * SEASONS.length * DAYS_PER_SEASON +
  SEASONS.indexOf(season as never) * DAYS_PER_SEASON +
  d;

function game(day = dayOf("spring", 2, 3)): GameState {
  const g = newGame();
  g.day.clock.day = day;
  return g;
}

describe("the score and candles", () => {
  it("starts at zero points and one candle", () => {
    const g = game();
    expect(shrineScore(g).total).toBe(0);
    expect(evaluate(g)).toBe(1);
  });

  it("cuts candles at 4, 8 and 12", () => {
    expect([0, 3, 4, 7, 8, 11, 12, 21].map(candlesFor)).toEqual([
      1, 1, 2, 2, 3, 3, 4, 4,
    ]);
  });

  it("scores earnings: one each step, two at a million", () => {
    const g = game();
    g.cave.earnings = 150000;
    expect(shrineScore(g).rows.find((r) => r.id === "earnings")!.points).toBe(
      2,
    );
    g.cave.earnings = 1000000;
    expect(shrineScore(g).rows.find((r) => r.id === "earnings")!.points).toBe(
      7,
    );
  });

  it("scores skills: 30 levels, then every skill at the top", () => {
    const g = game();
    const row = () => shrineScore(g).rows.find((r) => r.id === "skills")!;
    g.skills.gain(SKILLS[0]!, 10_000_000);
    expect(row().points).toBeLessThanOrEqual(1);
    for (const s of SKILLS) g.skills.gain(s, 10_000_000);
    expect(SKILLS.every((s) => g.skills.level(s) >= MAX_LEVEL)).toBe(true);
    expect(row().points).toBe(2);
  });

  it("counts the end scene, the key and the summit", () => {
    const g = game();
    g.endSeen = true;
    g.mines.openCamp(120);
    g.achievements.award("summit");
    const by = (id: string) =>
      shrineScore(g).rows.find((r) => r.id === id)!.points;
    expect(by("hall")).toBe(2);
    expect(by("deepmark")).toBe(1);
    expect(by("summit")).toBe(1);
  });

  it("never lowers candles", () => {
    const g = game();
    g.cave.earnings = 2_000_000;
    g.endSeen = true;
    g.mines.openCamp(120);
    expect(evaluate(g)).toBe(3);
    g.cave.earnings = 0;
    expect(evaluate(g)).toBe(3);
  });
});

describe("the first scene", () => {
  it("is not owed before year 3", () => {
    const g = game(dayOf("winter", 28, 2));
    expect(g.shrine.callToday(g)).toBe(false);
  });

  it("is owed on the first free morning of year 3, once", () => {
    const g = game(dayOf("spring", 2, 3));
    expect(g.shrine.callToday(g)).toBe(true);
    expect(g.shrine.pending).toBe(true);
    expect(g.shrine.callToday(g)).toBe(false);
  });

  it("waits out a festival day and a wedding", () => {
    const fest = game(dayOf("spring", 10, 3));
    expect(fest.shrine.callToday(fest)).toBe(false);
    const wed = game(dayOf("spring", 2, 3));
    wed.marriage.weddingDay = wed.day.clock.day;
    wed.marriage.weddingToday = () => true;
    expect(wed.shrine.callToday(wed)).toBe(false);
    wed.marriage.weddingToday = () => false;
    expect(wed.shrine.callToday(wed)).toBe(true);
  });

  it("speaks the closing line by the candle count", () => {
    const full = firstSceneBeats(4);
    expect(full).toHaveLength(4);
    expect(full[3]!.speaker).toContain("Hester");
    expect(full[3]!.lit).toBe(4);
    const short = firstSceneBeats(2);
    expect(short[3]!.speaker).toContain("Fenwick");
    expect(Math.max(...short.map((b) => b.lit))).toBe(2);
    expect(JSON.stringify(full)).not.toContain("{name}");
  });

  it("finishing clears it, lights the candles and posts Oriel's letter for tomorrow", () => {
    const g = game();
    g.shrine.callToday(g);
    const today = g.day.clock.day;
    expect(finishFirstScene(g)).toBe(1);
    expect(g.shrine.pending).toBe(false);
    expect(g.shrine.seen).toBe(true);
    expect(g.mail.entry(SHRINE.letter.id)?.due).toBe(today + 1);
    expect(deliverAll(g, today)).toBe(0);
    expect(deliverAll(g, today + 1)).toBe(1);
    expect(g.shrine.callToday(g)).toBe(false);
  });
});

describe("the redo and the statue", () => {
  it("needs a Diamond, and uses it up", () => {
    const g = game();
    expect(placeDiamond(g).ok).toBe(false);
    g.inventory.add("diamond", 1);
    const r = placeDiamond(g);
    expect(r.ok).toBe(true);
    expect(g.inventory.count("diamond")).toBe(0);
    expect(r.ok && r.line).toBe(redoLine(1));
  });

  it("the redo line follows the candle count", () => {
    expect(redoLine(4)).toContain("holds");
    expect(redoLine(3)).toContain("more light");
  });

  it("the stone is shut below four candles", () => {
    const g = game();
    expect(useStatue(g, () => 0.5)).toBe(shrineNote(g));
    expect(g.inventory.count(HEARTHSILVER_ORE)).toBe(0);
  });

  it("pays 2 to 8 ore once a day at four candles", () => {
    const g = game();
    g.shrine.candles = 4;
    useStatue(g, () => 0);
    expect(g.inventory.count(HEARTHSILVER_ORE)).toBe(2);
    expect(useStatue(g, () => 0.99)).toBe(SHRINE.statueUsed);
    g.day.clock.day += 1;
    useStatue(g, () => 0.9999);
    expect(g.inventory.count(HEARTHSILVER_ORE)).toBe(10);
  });

  it("the note changes with the year and the scene", () => {
    expect(shrineNote(game(dayOf("fall", 3, 1)))).toBe(SHRINE.notes.before);
    expect(shrineNote(game())).toBe(SHRINE.notes.waiting);
    const g = game();
    g.shrine.seen = true;
    expect(shrineNote(g)).toBe(SHRINE.notes.after);
  });
});

describe("saving", () => {
  it("keeps the candles, the scene flags and the statue day", () => {
    const g = game();
    g.shrine.candles = 3;
    g.shrine.pending = true;
    g.shrine.statueDay = 9;
    const copy = newGame();
    copy.shrine.load(JSON.parse(JSON.stringify(g.shrine.save())));
    expect(copy.shrine.save()).toEqual(g.shrine.save());
    copy.shrine.load(undefined);
    expect(copy.shrine.save()).toEqual({
      candles: 0,
      pending: false,
      seen: false,
      statueDay: 0,
    });
  });
});
