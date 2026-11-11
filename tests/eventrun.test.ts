import { describe, expect, it } from "vitest";
import {
  SceneRun,
  eventAtTile,
  placesAt,
  warningText,
  type RunWorld,
} from "../src/core/eventrun";
import {
  HEART_EVENTS,
  completeEvent,
  eventById,
  type Cmd,
} from "../src/core/heartevents";
import { HEART } from "../src/core/friendship";
import { newGame } from "../src/core/save";

const world = (flags: string[] = [], hearts = 0): RunWorld => ({
  flag: (f) => flags.includes(f),
  hearts: () => hearts,
});

const setHearts = (g: ReturnType<typeof newGame>, id: string, n: number) => {
  g.friendship.load({
    ...g.friendship.save(),
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

/** Names of the commands a run shows, taking `answer` at any choice. */
const trace = (run: SceneRun, answer = 0): string[] => {
  const out: string[] = [];
  for (let i = 0; i < 200 && !run.finished; i++) {
    const c = run.current()!;
    out.push(c.cmd);
    if (c.cmd === "choose") run.choose(answer);
    else run.advance();
  }
  return out;
};

describe("SceneRun", () => {
  const scene: Cmd[] = [
    { cmd: "say", who: "player", line: "a" },
    {
      cmd: "choose",
      answers: [
        { line: "x", goto: "one" },
        { line: "y", goto: "two" },
      ],
    },
    { cmd: "label", name: "one" },
    { cmd: "wait", ms: 10 },
    { cmd: "jump", to: "done" },
    { cmd: "label", name: "two" },
    { cmd: "hold", ms: 10 },
    { cmd: "label", name: "done" },
    { cmd: "setFlag", flag: "odette-store-seen" },
    { cmd: "end" },
  ];

  it("starts on the first command", () => {
    const r = new SceneRun(scene, world());
    expect(r.current()?.cmd).toBe("say");
    expect(r.finished).toBe(false);
  });
  it("follows a choice and jumps, ending at end", () => {
    expect(trace(new SceneRun(scene, world()), 0)).toEqual([
      "say",
      "choose",
      "wait",
      "setFlag",
    ]);
    expect(trace(new SceneRun(scene, world()), 1)).toEqual([
      "say",
      "choose",
      "hold",
      "setFlag",
    ]);
  });
  it("ignores a bad choice index and advance on a choose is a step, not a pick", () => {
    const r = new SceneRun(scene, world());
    r.advance();
    r.choose(5);
    expect(r.current()?.cmd).toBe("choose");
  });
  it("reads if on a flag or hearts", () => {
    const s: Cmd[] = [
      { cmd: "if", flag: "odette-store-seen", goto: "yes" },
      { cmd: "say", who: "player", line: "no" },
      { cmd: "end" },
      { cmd: "label", name: "yes" },
      { cmd: "wait", ms: 1 },
      { cmd: "end" },
    ];
    expect(trace(new SceneRun(s, world([])))).toEqual(["say"]);
    expect(trace(new SceneRun(s, world(["odette-store-seen"])))).toEqual([
      "wait",
    ]);
    const h: Cmd[] = [
      { cmd: "if", hearts: { who: "odette", atLeast: 3 }, goto: "y" },
      { cmd: "say", who: "player", line: "no" },
      { cmd: "end" },
      { cmd: "label", name: "y" },
      { cmd: "wait", ms: 1 },
      { cmd: "end" },
    ];
    expect(trace(new SceneRun(h, world([], 2)))).toEqual(["say"]);
    expect(trace(new SceneRun(h, world([], 3)))).toEqual(["wait"]);
  });
  it("skip ends the run at once", () => {
    const r = new SceneRun(scene, world());
    r.skip();
    expect(r.finished).toBe(true);
    expect(r.wasSkipped).toBe(true);
    expect(r.current()).toBeUndefined();
    r.advance();
    expect(r.finished).toBe(true);
  });
  it("a scene that runs off the end, or only flow, finishes", () => {
    expect(new SceneRun([], world()).finished).toBe(true);
    expect(new SceneRun([{ cmd: "label", name: "a" }], world()).finished).toBe(
      true,
    );
    // A spinning loop is bounded, not a hang.
    const spin: Cmd[] = [
      { cmd: "label", name: "a" },
      { cmd: "jump", to: "a" },
    ];
    expect(new SceneRun(spin, world()).finished).toBe(true);
  });
  it("replay strips the Result group, a first run keeps it", () => {
    const e = HEART_EVENTS[0]!;
    const first = trace(SceneRun.of(e, false, world()));
    const again = trace(SceneRun.of(e, true, world()));
    const results = ["give", "setFlag", "rise", "unlockMail"];
    expect(first.some((c) => results.includes(c))).toBe(true);
    expect(again.some((c) => results.includes(c))).toBe(false);
  });
  it("every shipped event runs to its end on every answer", () => {
    for (const e of HEART_EVENTS)
      for (const a of [0, 1]) {
        const run = SceneRun.of(e, false, world());
        trace(run, a);
        expect(run.finished).toBe(true);
        expect(run.wasSkipped).toBe(false);
      }
  });
});

describe("eventAtTile", () => {
  const ctx = { day: 3, weather: "sunny" as const };
  it("finds the store event beside the store door once hearts are met", () => {
    const g = newGame();
    const e = eventById("odette-store-2")!;
    expect(placesAt("hearthwell", 23, 25)).toContain(e.place);
    expect(eventAtTile(g, "hearthwell", 22, 24, ctx)).toBeUndefined();
    setHearts(g, "odette", 2);
    expect(eventAtTile(g, "hearthwell", 22, 24, ctx)?.id).toBe(e.id);
    expect(eventAtTile(g, "hearthwell", 5, 5, ctx)).toBeUndefined();
  });
  it("not now: a declined event is not offered again, and is not recorded", () => {
    const g = newGame();
    setHearts(g, "odette", 2);
    expect(
      eventAtTile(g, "hearthwell", 22, 24, ctx, ["odette-store-2"]),
    ).toBeUndefined();
    expect(g.heartEvents.seen("odette-store-2")).toBe(false);
    expect(eventAtTile(g, "hearthwell", 22, 24, ctx)).toBeDefined();
  });
  it("is seen only on completion, then never again", () => {
    const g = newGame();
    setHearts(g, "odette", 2);
    const e = eventAtTile(g, "hearthwell", 22, 24, ctx)!;
    expect(g.heartEvents.seen(e.id)).toBe(false);
    completeEvent(g, e, 3);
    expect(g.heartEvents.seen(e.id)).toBe(true);
    expect(
      eventAtTile(g, "hearthwell", 22, 24, { ...ctx, day: 4 }),
    ).toBeUndefined();
  });
  it("none on the day an event already ran", () => {
    const g = newGame();
    setHearts(g, "odette", 2);
    setHearts(g, "hattie", 2);
    const e = eventAtTile(g, "hearthwell", 22, 24, ctx)!;
    completeEvent(g, e, 3);
    expect(eventAtTile(g, "hearthwell", 22, 24, ctx)).toBeUndefined();
  });
  it("the warning names the person", () => {
    expect(warningText(eventById("odette-store-2")!)).toContain("Odette");
  });
});
