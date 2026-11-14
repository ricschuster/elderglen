import { describe, expect, it } from "vitest";
import { journalLines, projectLines, questLines } from "../src/core/journal";
import { newGame } from "../src/core/save";
import { ROOMS } from "../src/core/bundles";

describe("journal", () => {
  it("says so when there are no requests or letters", () => {
    const g = newGame();
    expect(questLines(g)[0]).toBe("No open requests.");
    expect(journalLines(g, "mail")).toEqual(["No letters yet."]);
  });

  it("lists an accepted request with its progress", () => {
    const g = newGame();
    let day = 2;
    while (g.quests.posted(day).length === 0 && day < 60) day++;
    const offer = g.quests.posted(day)[0]!;
    expect(offer).toBeDefined();
    g.quests.accept(offer.id, day);
    const lines = questLines(g);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`Pays ${offer.reward.gold}g`);
  });

  it("lists the open room's bundles and what they still need", () => {
    const g = newGame();
    const lines = projectLines(g);
    const first = ROOMS[0]!;
    expect(lines[0]).toBe(first.name);
    expect(lines.some((l) => l.includes("Still needs:"))).toBe(true);
  });

  it("lists a delivered letter, newest first", () => {
    const g = newGame();
    g.mail.queue("a-test-letter", 1, {
      id: "a-test-letter",
      title: "Hello",
      sender: "Someone",
      body: "Hi",
      trigger: { kind: "day", day: 1 },
    } as never);
    g.mail.deliver(1);
    const [line] = journalLines(g, "mail");
    expect(line).toContain("Hello");
    expect(line).toContain("unread");
  });
});
