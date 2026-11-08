import { describe, expect, it } from "vitest";
import {
  LETTERS,
  deliverAll,
  nextLetter,
  openLetter,
  queueMail,
  type LetterDef,
} from "../src/core/mail";
import { reportLines } from "../src/core/report";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { STACK_SIZE } from "../src/core/inventory";
import { ACHIEVEMENTS } from "../src/core/achievements";

const gift: LetterDef = {
  id: "test-gift",
  sender: "A friend",
  title: "A gift",
  body: "Here.",
  trigger: { kind: "achievement", id: ACHIEVEMENTS[0]!.id },
  attachment: {
    gold: 500,
    items: [{ id: "turnip", count: 3 }],
    hat: "wool-beret",
  },
};
const defs = [...LETTERS, gift];

describe("mail", () => {
  it("has unique letters with a sender, title and text and no em dashes", () => {
    expect(new Set(LETTERS.map((l) => l.id)).size).toBe(LETTERS.length);
    for (const l of LETTERS) {
      expect(l.sender && l.title && l.body, l.id).toBeTruthy();
      expect(`${l.title}${l.body}`).not.toContain(String.fromCharCode(0x2014));
    }
  });

  it("delivers a queued letter on its morning, and sends each letter once", () => {
    const g = newGame();
    g.achievements.award(ACHIEVEMENTS[0]!.id);
    expect(queueMail(g, 5, defs)).toEqual(["hatters-letter", "test-gift"]);
    expect(queueMail(g, 6, defs)).toEqual([]);
    expect(g.mail.deliver(4)).toBe(0);
    expect(g.mail.flagUp).toBe(false);
    expect(g.mail.deliver(5)).toBe(2);
    expect(g.mail.flagUp).toBe(true);
    expect(nextLetter(g)).toBe("hatters-letter");
  });

  it("gives an attachment once, and rereading never repeats it", () => {
    const g = newGame();
    g.achievements.award(ACHIEVEMENTS[0]!.id);
    deliverAll(g, 3, defs);
    const money = g.money;
    const r = openLetter(g, "test-gift", defs);
    expect(r.ok && r.pending).toBe(false);
    expect(g.money).toBe(money + 500);
    expect(g.inventory.count("turnip")).toBe(3);
    expect(g.wardrobe.has("wool-beret")).toBe(true);
    openLetter(g, "test-gift", defs);
    expect(g.money).toBe(money + 500);
    expect(g.inventory.count("turnip")).toBe(3);
    expect(g.mail.entry("test-gift")?.state).toBe("taken");
  });

  it("keeps the gift and the flag when the pack is full", () => {
    const g = newGame();
    g.achievements.award(ACHIEVEMENTS[0]!.id);
    deliverAll(g, 3, defs);
    openLetter(g, "hatters-letter", defs);
    let n = 0;
    while (g.inventory.add(`filler-${n++}`, STACK_SIZE));
    const money = g.money;
    const r = openLetter(g, "test-gift", defs);
    expect(r.ok && r.pending).toBe(true);
    expect(g.money).toBe(money);
    expect(g.mail.entry("test-gift")?.state).toBe("opened");
    expect(g.mail.flagUp).toBe(true);
    expect(nextLetter(g)).toBe("test-gift");
    // Make room, use the mailbox again.
    g.inventory.remove("filler-0", STACK_SIZE);
    const again = openLetter(g, "test-gift", defs);
    expect(again.ok && again.pending).toBe(false);
    expect(g.money).toBe(money + 500);
    expect(g.mail.flagUp).toBe(false);
  });

  it("takes a letter with no attachment when it is opened", () => {
    const g = newGame();
    g.achievements.award(ACHIEVEMENTS[0]!.id);
    deliverAll(g, 3);
    openLetter(g, "hatters-letter");
    expect(g.mail.entry("hatters-letter")?.state).toBe("taken");
    expect(g.mail.flagUp).toBe(false);
  });

  it("refuses a letter that has not arrived", () => {
    const g = newGame();
    g.mail.queue("hatters-letter", 9);
    expect(openLetter(g, "hatters-letter").ok).toBe(false);
  });

  it("round trips through the save, and an old save has an empty box", () => {
    const g = newGame();
    g.achievements.award(ACHIEVEMENTS[0]!.id);
    deliverAll(g, 3);
    const back = deserialize(serialize(g))!;
    expect(back.mail.save()).toEqual(g.mail.save());
    const old = JSON.parse(serialize(newGame()));
    delete old.mail;
    expect(deserialize(JSON.stringify(old))!.mail.kept()).toEqual([]);
    old.mail = [{ id: 1 }, "x", { id: "a", state: "bad", due: 1 }];
    expect(deserialize(JSON.stringify(old))!.mail.save()).toEqual([]);
  });

  it("brings the hatter's letter the morning after the first achievement", () => {
    const g = newGame();
    g.cave.addEarnings(20000, 1);
    const r = sleep(g, [], () => 0.5);
    expect(r.newMail).toBe(1);
    expect(reportLines(r)).toContain("There is mail.");
    expect(g.mail.flagUp).toBe(true);
    const quiet = sleep(g, [], () => 0.5);
    expect(quiet.newMail).toBe(0);
  });
});
