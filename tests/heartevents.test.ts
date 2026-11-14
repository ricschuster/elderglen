import { describe, expect, it } from "vitest";
import {
  HEART_EVENTS,
  LINES,
  completeEvent,
  dueEvents,
  eventById,
  inWindow,
  nextEvent,
  presenceOverlaps,
  playable,
  validateEvents,
  validateScene,
  type Cmd,
  type HeartEvent,
} from "../src/core/heartevents";
import { LETTERS, deliverAll, openLetter } from "../src/core/mail";
import { DISHES, dishById } from "../src/core/dishes";
import { dishKnown, knownDishes } from "../src/core/cooking";
import { HEART } from "../src/core/friendship";
import { deserialize, newGame, serialize } from "../src/core/save";
import { allItems } from "../src/core/items";
import { STACK_SIZE } from "../src/core/inventory";

const setHearts = (g: ReturnType<typeof newGame>, id: string, n: number) => {
  g.friendship.load({
    ...Object.fromEntries(
      g.friendship.save() ? Object.entries(g.friendship.save()) : [],
    ),
    [id]: {
      points: n * HEART,
      met: true,
      talkDay: 0,
      giftDay: 0,
      week: 0,
      weekGifts: 0,
      bouquet: false,
      log: {},
    },
  });
};
const ctx = (place: string, day = 3, weather = "sunny" as const) => ({
  day,
  weather,
  place,
});

describe("heart event data", () => {
  it("validates", () => {
    expect(validateEvents()).toEqual([]);
  });
  it("has placeholder lines and no em dashes", () => {
    expect(HEART_EVENTS.length).toBeGreaterThan(0);
    for (const t of Object.values(LINES)) {
      expect(t.startsWith("PLACEHOLDER TEXT.")).toBe(true);
      expect(t).not.toContain(String.fromCharCode(0x2014));
    }
  });
});

describe("presence window (note 84)", () => {
  it("every event has a window where its person stands at the place", () => {
    for (const e of HEART_EVENTS) {
      expect(e.window, e.id).toBeDefined();
      expect(presenceOverlaps(e), e.id).toBe(true);
    }
  });

  it("rejects a window the person never keeps, or none at all", () => {
    const base = eventById("odette-store-2")!;
    expect(
      validateEvents([
        { ...base, window: { from: "3:00", until: "5:00" } },
      ]).join(),
    ).toContain("never at the place");
    const bare: Partial<HeartEvent> = { ...base };
    delete bare.window;
    expect(validateEvents([bare as HeartEvent]).join()).toContain(
      "presence window",
    );
  });

  it("starts an event only inside its window", () => {
    const g = newGame();
    setHearts(g, "odette", 2);
    const e = eventById("odette-store-2")!;
    expect(inWindow(e, undefined)).toBe(true);
    expect(
      nextEvent(g, { ...ctx("hw:store"), minute: 8 * 60 }),
    ).toBeUndefined();
    expect(nextEvent(g, { ...ctx("hw:store"), minute: 10 * 60 })?.id).toBe(
      e.id,
    );
    expect(
      nextEvent(g, { ...ctx("hw:store"), minute: 20 * 60 }),
    ).toBeUndefined();
  });
});

describe("triggers", () => {
  it("needs the hearts, the place and the conditions", () => {
    const g = newGame();
    expect(nextEvent(g, ctx("hw:store"))).toBeUndefined();
    setHearts(g, "odette", 2);
    expect(nextEvent(g, ctx("hw:store"))?.id).toBe("odette-store-2");
    expect(nextEvent(g, ctx("hw:inn"))).toBeUndefined();
    setHearts(g, "odette", 1);
    expect(nextEvent(g, ctx("hw:store"))).toBeUndefined();
  });

  it("checks weather", () => {
    const g = newGame();
    setHearts(g, "hattie", 2);
    expect(nextEvent(g, ctx("hw:inn"))).toBeUndefined();
    expect(nextEvent(g, ctx("hw:inn", 3, "rainy" as never))?.id).toBe(
      "hattie-inn-rain-2",
    );
  });

  it("checks season, an earlier event, a flag and a bundle", () => {
    const base = eventById("odette-store-2")!;
    const defs: HeartEvent[] = [
      { ...base, id: "a", conditions: { season: "summer" } },
      { ...base, id: "b", conditions: { after: ["odette-store-2"] } },
      { ...base, id: "c", conditions: { flags: ["rosmarin-ring-seen"] } },
      { ...base, id: "d", conditions: { bundle: "specialty-fish" } },
    ];
    const g = newGame();
    setHearts(g, "odette", 2);
    expect(dueEvents(g, ctx("hw:store"), defs)).toEqual([]);
    expect(dueEvents(g, ctx("hw:store", 31), [defs[0]!])).toHaveLength(1);
    g.heartEvents.mark("odette-store-2", 1);
    g.heartEvents.load({ ...g.heartEvents.save(), lastDay: 0 });
    expect(dueEvents(g, ctx("hw:store"), [defs[1]!])).toHaveLength(1);
    g.heartEvents.setFlag("rosmarin-ring-seen");
    expect(dueEvents(g, ctx("hw:store"), [defs[2]!])).toHaveLength(1);
  });

  it("is once only, one a day, and never on a festival day", () => {
    const g = newGame();
    setHearts(g, "odette", 4);
    setHearts(g, "hattie", 4);
    const e = eventById("odette-store-2")!;
    expect(dueEvents(g, ctx("hw:store", 10))).toEqual([]); // Hat Parade
    completeEvent(g, e, 3);
    expect(dueEvents(g, ctx("hw:store", 4))).toEqual([]); // seen
    const second = eventById("hattie-inn-rain-2")!;
    expect(dueEvents(g, ctx("hw:inn", 3, "rainy" as never))).toEqual([]); // one a day
    expect(
      dueEvents(g, ctx("hw:inn", 4, "rainy" as never)).map((x) => x.id),
    ).toEqual([second.id]);
  });
});

describe("results and replay", () => {
  it("applies the Result group once, and replay strips it", () => {
    const g = newGame();
    const e = eventById("odette-store-2")!;
    const words = completeEvent(g, e, 3);
    expect(words).toEqual(["2 x Potato"]);
    expect(g.inventory.count("potato")).toBe(2);
    expect(g.heartEvents.hasFlag("odette-store-seen")).toBe(true);
    expect(g.heartEvents.speedOf("odette")).toBe(1.5);
    completeEvent(g, e, 9);
    expect(g.inventory.count("potato")).toBe(2);
    const replay = playable(e, true);
    expect(replay.some((c) => c.cmd === "give" || c.cmd === "setFlag")).toBe(
      false,
    );
    expect(replay.at(-1)?.cmd).toBe("end");
    expect(validateScene(replay, "odette", () => true)).toEqual([]);
  });

  it("posts a gift by mail when the pack is full", () => {
    const g = newGame();
    for (const it of allItems()) if (!g.inventory.add(it.id, STACK_SIZE)) break;
    while (g.inventory.add("wood", 1) || g.inventory.add("stone", 1)) {
      /* fill any gaps */
    }
    expect(g.inventory.add("potato", 2)).toBe(false);
    const e = eventById("odette-store-2")!;
    expect(completeEvent(g, e, 3)).toEqual([]);
    expect(g.mail.entry("odette-store-2-gift")?.due).toBe(4);
  });
});

describe("save", () => {
  it("round trips seen events, flags and the last day", () => {
    const g = newGame();
    completeEvent(g, eventById("odette-store-2")!, 3);
    const back = deserialize(serialize(g))!;
    expect(back.heartEvents.seen("odette-store-2")).toBe(true);
    expect(back.heartEvents.hasFlag("odette-store-seen")).toBe(true);
    expect(back.heartEvents.lastDay).toBe(3);
    expect(back.heartEvents.speedOf("odette")).toBe(1.5);
  });

  it("loads old saves with no heart events field", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.heartEvents;
    const g = deserialize(JSON.stringify(raw))!;
    expect(g.heartEvents.seenCount()).toBe(0);
  });

  it("ignores a malformed field", () => {
    const raw = JSON.parse(serialize(newGame()));
    raw.heartEvents = { seen: { a: "x", b: 4 }, flags: [1, "f"], lastDay: "z" };
    const g = deserialize(JSON.stringify(raw))!;
    expect(g.heartEvents.seenIds()).toEqual(["b"]);
    expect(g.heartEvents.hasFlag("f")).toBe(true);
    expect(g.heartEvents.lastDay).toBe(0);
  });
});

describe("scene validator", () => {
  const ok: Cmd[] = [
    { cmd: "say", who: "odette", line: "odette_2_a" },
    { cmd: "end" },
  ];
  const bad = (scene: Cmd[]) => validateScene(scene, "odette").join("|");

  it("accepts a minimal scene", () => {
    expect(validateScene(ok, "odette")).toEqual([]);
  });
  it("needs an end on every path", () => {
    expect(bad([{ cmd: "say", who: "odette", line: "odette_2_a" }])).toContain(
      "no path reaches an end",
    );
  });
  it("rejects a loop with no wait, and allows one with a wait", () => {
    expect(
      bad([
        { cmd: "label", name: "x" },
        { cmd: "jump", to: "x" },
        { cmd: "end" },
      ]),
    ).toContain("loop");
    expect(
      validateScene(
        [
          { cmd: "label", name: "x" },
          { cmd: "wait", ms: 10 },
          { cmd: "if", flag: "odette-store-seen", goto: "x" },
          { cmd: "end" },
        ],
        "odette",
      ),
    ).toEqual([]);
  });
  it("checks jump targets and unused labels", () => {
    expect(bad([{ cmd: "jump", to: "nope" }, { cmd: "end" }])).toContain(
      'no label "nope"',
    );
    expect(bad([{ cmd: "label", name: "u" }, { cmd: "end" }])).toContain(
      "never used",
    );
  });
  it("needs two answers and unreachable code is flagged", () => {
    expect(
      bad([
        { cmd: "label", name: "a" },
        { cmd: "choose", answers: [{ line: "odette_2_ans1", goto: "a" }] },
        { cmd: "end" },
      ]),
    ).toContain("two answers");
    expect(
      bad([{ cmd: "end" }, { cmd: "say", who: "odette", line: "odette_2_a" }]),
    ).toContain("unreachable");
  });
  it("checks people, lines, emotes, flags, gifts and mail", () => {
    const msg = bad([
      { cmd: "say", who: "nobody", line: "missing" },
      { cmd: "emote", who: "odette", emote: "dance" },
      { cmd: "setFlag", flag: "nope" },
      { cmd: "give", item: "no-such-item" },
      { cmd: "give", recipe: "no-such-dish" },
      { cmd: "unlockMail", letter: "no-such-letter" },
      { cmd: "end" },
    ]);
    for (const part of [
      "unknown person",
      "unknown line",
      "unknown emote",
      "unknown flag",
      "unknown item",
      "unknown recipe",
      "unknown letter",
    ])
      expect(msg).toContain(part);
  });
});

describe("recipe mail", () => {
  // Dish letters at heart steps; the tea sapling letter (a crafting recipe after a
  // heart event, note 97) is tested in teabush.test.ts.
  const recipeLetters = LETTERS.filter(
    (l) => l.attachment?.recipe && l.trigger.kind === "hearts",
  );

  it("has letters at 5 and 10 hearts whose recipes exist and are letter-sourced", () => {
    expect(recipeLetters.length).toBeGreaterThanOrEqual(4);
    for (const l of recipeLetters) {
      expect(l.trigger.kind).toBe("hearts");
      const d = dishById(l.attachment!.recipe!);
      expect(d, l.id).toBeDefined();
      expect(d!.sources).toEqual([{ kind: "letter", letter: l.id }]);
    }
    expect(DISHES.length).toBeGreaterThan(9);
  });

  it("queues at the heart step, delivers next morning and teaches the recipe on opening", () => {
    const g = newGame();
    const dish = dishById("market-pie")!;
    expect(deliverAll(g, 5)).toBe(0);
    setHearts(g, "odette", 4);
    expect(deliverAll(g, 5)).toBe(0);
    setHearts(g, "odette", 5);
    deliverAll(g, 5);
    expect(g.mail.entry("odette-recipe-5")?.due).toBe(5);
    expect(g.mail.entry("odette-recipe-10")).toBeUndefined();
    expect(dishKnown(g, dish)).toBe(false);
    expect(knownDishes(g)).not.toContain(dish);
    const r = openLetter(g, "odette-recipe-5");
    expect(r.ok && r.gift).toEqual(["A recipe: Market pie"]);
    expect(dishKnown(g, dish)).toBe(true);
    expect(dishKnown(g, dishById("harvest-hotpot")!)).toBe(false);
  });

  it("keeps the recipe through a save and sends the letter once", () => {
    const g = newGame();
    setHearts(g, "hattie", 10);
    deliverAll(g, 7);
    openLetter(g, "hattie-recipe-5");
    openLetter(g, "hattie-recipe-10");
    const back = deserialize(serialize(g))!;
    expect(dishKnown(back, dishById("inn-custard")!)).toBe(true);
    expect(dishKnown(back, dishById("innkeepers-roast")!)).toBe(true);
    expect(deliverAll(back, 9)).toBe(0);
  });

  it("is not taught by a letter that is only delivered", () => {
    const g = newGame();
    setHearts(g, "odette", 5);
    deliverAll(g, 7);
    expect(dishKnown(g, dishById("market-pie")!)).toBe(false);
  });
});

describe("event-taught dishes (#873)", () => {
  it("every dish with an event source names a real event that gives it", async () => {
    const { DISHES } = await import("../src/core/dishes");
    for (const d of DISHES)
      for (const s of d.sources)
        if (s.kind === "event") {
          const e = HEART_EVENTS.find((x) => x.id === s.event);
          expect(e, d.id).toBeDefined();
          expect(
            e!.scene.some((c) => c.cmd === "give" && c.recipe === d.id),
            d.id,
          ).toBe(true);
        }
  });
});
