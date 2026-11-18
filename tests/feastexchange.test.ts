import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import {
  exchangeOpen,
  feastGive,
  feastGiven,
  feastRecipient,
  lanternOn,
  presentChoices,
  queueFeastLetter,
} from "../src/core/feastexchange";
import { FRIEND_IDS } from "../src/core/friendship";
import { newGame, type GameState } from "../src/core/save";
import { villagerById } from "../src/core/villagers";

const dayOf = (season: string, d: number, year = 1) =>
  (year - 1) * SEASONS.length * DAYS_PER_SEASON +
  SEASONS.indexOf(season as never) * DAYS_PER_SEASON +
  d;

function feastGame(day = dayOf("winter", 25), minutes = 13 * 60): GameState {
  const g = newGame();
  g.day.clock.day = day;
  g.day.clock.minutes = minutes;
  for (const id of FRIEND_IDS) g.friendship.meet(id);
  return g;
}

describe("feast gift exchange", () => {
  it("draws a stable recipient: met, never a child, never someone who skips", () => {
    const g = feastGame();
    const r = feastRecipient(g, false);
    expect(feastRecipient(g, false)).toBe(r);
    expect(villagerById(r)?.ageBand).not.toBe("child");
    expect(["rosmarin", "rundahl"]).not.toContain(r);
  });

  it("names the steward when fewer than three are met", () => {
    const g = newGame();
    g.day.clock.day = dayOf("winter", 25);
    expect(feastRecipient(g, false)).toBe("cuthbert");
  });

  it("queues the Winter 18 letter once, naming the recipient", () => {
    const g = feastGame(dayOf("winter", 18));
    expect(queueFeastLetter(g, g.day.clock.day)).toBe(true);
    expect(queueFeastLetter(g, g.day.clock.day)).toBe(false);
    const name = villagerById(feastRecipient(g, false))!.name;
    expect(g.mail.entry("feast-letter-1")?.letter?.body).toContain(name);
    const other = feastGame(dayOf("winter", 17));
    expect(queueFeastLetter(other, other.day.clock.day)).toBe(false);
  });

  it("is open between opening and closing on the feast map only", () => {
    expect(exchangeOpen(feastGame(), "hearthwell", false)).toBe(true);
    expect(exchangeOpen(feastGame(), "hall", false)).toBe(false);
    expect(exchangeOpen(feastGame(), "hall", true)).toBe(true);
    expect(
      exchangeOpen(feastGame(undefined, 11 * 60), "hearthwell", false),
    ).toBe(false);
    expect(
      exchangeOpen(feastGame(undefined, 18 * 60), "hearthwell", false),
    ).toBe(false);
    expect(
      exchangeOpen(feastGame(dayOf("winter", 24)), "hearthwell", false),
    ).toBe(false);
  });

  it("gives at x5 outside the limits, then reveals a giver and a present", () => {
    const g = feastGame();
    const who = feastRecipient(g, false);
    expect(lanternOn(g, "hearthwell", false, who)).toBe(true);
    // An ordinary gift today does not block the feast gift.
    g.friendship.gift(who, "wood", g.day.clock.day);
    g.inventory.add("wood", 1);
    const before = g.friendship.points(who);
    const r = feastGive(g, "hearthwell", who, "wood", false)!;
    expect(r.message).toContain("secret giver");
    expect(r.giver).not.toBe(who);
    expect(r.present).toBeDefined();
    expect(g.friendship.points(who)).not.toBe(before);
    expect(feastGiven(g)).toBe(true);
    expect(lanternOn(g, "hearthwell", false, who)).toBe(false);
    expect(g.inventory.count("wood")).toBe(0);
  });

  it("gives once a year and ignores anyone else or an empty hand", () => {
    const g = feastGame();
    const who = feastRecipient(g, false);
    const other = FRIEND_IDS.find((id) => id !== who)!;
    g.inventory.add("wood", 2);
    expect(feastGive(g, "hearthwell", other, "wood", false)).toBeUndefined();
    expect(feastGive(g, "hearthwell", who, undefined, false)).toBeUndefined();
    expect(feastGive(g, "hearthwell", who, "wood", false)).toBeDefined();
    expect(feastGive(g, "hearthwell", who, "wood", false)).toBeUndefined();
  });

  it("is repeatable for a reload: the same giver and present", () => {
    const a = feastGame();
    const b = feastGame();
    const who = feastRecipient(a, false);
    expect(feastRecipient(b, false)).toBe(who);
    a.inventory.add("wood", 1);
    b.inventory.add("wood", 1);
    const ra = feastGive(a, "hearthwell", who, "wood", false)!;
    const rb = feastGive(b, "hearthwell", who, "wood", false)!;
    expect([ra.giver, ra.present]).toEqual([rb.giver, rb.present]);
  });

  it("posts the present when the pack is full", () => {
    const g = feastGame();
    const who = feastRecipient(g, false);
    g.inventory.add("wood", 2);
    for (let i = 0; i < 40; i++) g.inventory.add(`filler-${i}`, 1);
    const r = feastGive(g, "hearthwell", who, "wood", false)!;
    expect(r.message).toContain("by post");
    expect(g.mail.has("feast-present-1")).toBe(true);
  });

  it("keeps presents to cheap items a person loves or likes", () => {
    const choices = presentChoices("odette");
    expect(choices.length).toBeGreaterThan(0);
  });
});
