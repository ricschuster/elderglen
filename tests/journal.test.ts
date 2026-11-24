import { describe, expect, it } from "vitest";
import {
  cancelQuest,
  defaultExpanded,
  journalLines,
  projectLines,
  questLines,
  questView,
  toggleExpanded,
  type QuestEntry,
} from "../src/core/journal";
import { newGame } from "../src/core/save";
import { HALL_ROOMS } from "../src/core/bundles";

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
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain(`Pays ${offer.reward.gold}g`);
  });

  it("lists the open room's bundles and what they still need", () => {
    const g = newGame();
    const lines = projectLines(g);
    const first = HALL_ROOMS[0]!;
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

describe("quest expand", () => {
  const entries: QuestEntry[] = [
    { id: "a", title: "Hand in 2 Turnip", details: ["Not yet.", "Pays 10g."] },
    { id: "b", title: "Gather 3 Berry", details: ["1 of 3.", "Pays 20g."] },
  ];

  it("starts with only the newest entry open", () => {
    expect([...defaultExpanded(entries)]).toEqual(["b"]);
    expect(defaultExpanded([]).size).toBe(0);
  });

  it("toggles an entry open and shut without changing the old set", () => {
    const start = defaultExpanded(entries);
    const both = toggleExpanded(start, "a");
    expect(both.has("a")).toBe(true);
    expect(start.has("a")).toBe(false);
    expect(toggleExpanded(both, "a").has("a")).toBe(false);
  });

  it("shows details only for open entries and tags titles", () => {
    const view = questView(entries, new Set(["b"]), "a");
    expect(view.map((l) => l.quest)).toEqual([
      "a",
      "b",
      undefined,
      undefined,
      undefined,
    ]);
    expect(view[0]!.text).toContain("[+] Hand in 2 Turnip");
    expect(view[0]!.text.startsWith(">")).toBe(true);
    expect(view[1]!.text).toContain("[-]");
    expect(view[3]!.text).toContain("Pays 20g.");
    expect(view[4]!.cancel).toBe("b");
  });
});

describe("quest cancel", () => {
  it("shows a Cancel line under an open request and gives it up for free", () => {
    const g = newGame();
    let day = 2;
    while (g.quests.posted(day).length === 0 && day < 60) day++;
    const offer = g.quests.posted(day)[0]!;
    g.quests.accept(offer.id, day);
    const entries = [{ id: offer.id, title: "t", details: ["d"] }];
    const lines = questView(entries, new Set([offer.id]));
    expect(lines.find((l) => l.cancel)?.cancel).toBe(offer.id);
    expect(questView(entries, new Set()).some((l) => l.cancel)).toBe(false);
    const gold = g.money;
    expect(cancelQuest(g, offer.id)).toBe(true);
    expect(g.quests.open()).toHaveLength(0);
    expect(cancelQuest(g, offer.id)).toBe(false);
    expect(g.money).toBe(gold);
  });
});
