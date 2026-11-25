import { describe, expect, it } from "vitest";
import { LOCAL_PLAYER, savePlayer, syncPlayer } from "../src/core/players";
import { applyScreenIntent } from "../src/core/screenintents";
import { deserialize, newGame, serialize } from "../src/core/save";
import { meet } from "../src/core/townfolk";
import { asPlayer } from "../src/core/asplayer";
import { HEART, TALK_POINTS } from "../src/core/friendship";

/** Friendship per player (note 53): each player's hearts, talks, gifts and heart events are their own. */
function mk() {
  const g = newGame("standard", "separate");
  g.players.add("g2", 0);
  return g;
}
const WHO = "dorrie";
const ids = (g: ReturnType<typeof mk>) => ({
  host: g.players.get(LOCAL_PLAYER).friendship,
  guest: g.players.get("g2").friendship,
});

describe("friendship for each player", () => {
  it("points the local view at the local player and asPlayer at the sender", () => {
    const g = mk();
    const { host, guest } = ids(g);
    expect(g.friendship).toBe(host);
    expect(g.heartEvents).toBe(g.players.get(LOCAL_PLAYER).heartEvents);
    asPlayer(g, "g2", () => expect(g.friendship).toBe(guest));
    expect(g.friendship).toBe(host);
  });

  it("keeps the daily talk apart", () => {
    const g = mk();
    const { host, guest } = ids(g);
    const day = g.day.clock.day;
    host.talk(WHO, day);
    expect(host.points(WHO)).toBe(TALK_POINTS);
    expect(host.talkedOn(WHO, day)).toBe(true);
    expect(guest.points(WHO)).toBe(0);
    expect(guest.met(WHO)).toBe(false);
    // The guest can still talk the same day.
    expect(guest.talk(WHO, day).ok).toBe(true);
    expect(guest.talk(WHO, day).ok).toBe(false);
  });

  it("a guest's gift through the meet intent leaves the host's points alone", () => {
    const g = mk();
    const { host, guest } = ids(g);
    const day = g.day.clock.day;
    guest.meet(WHO);
    host.meet(WHO);
    const before = host.points(WHO);
    g.players.get("g2").inventory.add("parsnip", 1);
    expect(
      applyScreenIntent(g, "g2", { kind: "meet", id: WHO, held: "parsnip" }),
    ).toBeUndefined();
    expect(guest.giftedOn(WHO, day)).toBe(true);
    expect(g.players.get("g2").inventory.count("parsnip")).toBe(0);
    expect(host.points(WHO)).toBe(before);
    expect(host.giftedOn(WHO, day)).toBe(false);
    expect(applyScreenIntent(g, "g2", { kind: "meet", id: "nobody" })).toBe(
      "bad meet",
    );
  });

  it("counts the weekly gift cap per player", () => {
    const g = mk();
    const { host, guest } = ids(g);
    const day = g.day.clock.day;
    host.meet(WHO);
    guest.meet(WHO);
    host.gift(WHO, "parsnip", day);
    host.gift(WHO, "parsnip", day + 1);
    expect(host.weekGifts(WHO, day + 1)).toBe(2);
    expect(host.canGift(WHO, day + 2)).toBe(false);
    expect(guest.weekGifts(WHO, day + 2)).toBe(0);
    expect(guest.canGift(WHO, day + 2)).toBe(true);
  });

  it("the new day pays each player's weekly bonus from their own gifts", () => {
    const g = mk();
    const { host, guest } = ids(g);
    const day = g.day.clock.day;
    host.meet(WHO);
    guest.meet(WHO);
    host.gift(WHO, "parsnip", day);
    host.gift(WHO, "parsnip", day + 1);
    guest.gift(WHO, "parsnip", day);
    const h = host.points(WHO);
    const gu = guest.points(WHO);
    for (const p of g.players.each()) p.friendship.startDay(day + 7);
    expect(host.points(WHO)).toBeGreaterThan(h);
    expect(guest.points(WHO)).toBe(gu);
  });

  it("keeps heart events seen apart", () => {
    const g = mk();
    const host = g.players.get(LOCAL_PLAYER).heartEvents;
    const guest = g.players.get("g2").heartEvents;
    host.mark("some-event", 3);
    expect(host.seen("some-event")).toBe(true);
    expect(guest.seen("some-event")).toBe(false);
    expect(guest.lastDay).toBe(0);
  });

  it("a guest talks to the host's spouse as to any friend", () => {
    const g = mk();
    g.players.get("g2").friendship.meet(WHO);
    const r = asPlayer(g, "g2", () => meet(g, WHO, undefined));
    expect(r.message).not.toBe("");
    expect(g.players.get("g2").friendship.points(WHO)).toBe(TALK_POINTS);
    expect(g.players.get(LOCAL_PLAYER).friendship.points(WHO)).toBe(0);
  });

  it("round-trips in a save: host flat, guest in the record", () => {
    const g = mk();
    const { host, guest } = ids(g);
    host.meet(WHO);
    host.award(WHO, 2 * HEART);
    guest.meet(WHO);
    guest.award(WHO, HEART);
    g.players.get("g2").heartEvents.mark("ev-g", 5);
    g.players.get(LOCAL_PLAYER).heartEvents.mark("ev-h", 4);
    const back = deserialize(serialize(g))!;
    expect(back.friendship).toBe(back.players.get(LOCAL_PLAYER).friendship);
    expect(back.friendship.points(WHO)).toBe(2 * HEART);
    expect(back.players.get("g2").friendship.points(WHO)).toBe(HEART);
    expect(back.heartEvents.seen("ev-h")).toBe(true);
    expect(back.heartEvents.seen("ev-g")).toBe(false);
    expect(back.players.get("g2").heartEvents.seen("ev-g")).toBe(true);
  });

  it("reads an old save's single friendship as the host's", () => {
    const g = newGame("standard", "separate");
    g.players.add("g2", 0);
    g.friendship.meet(WHO);
    g.friendship.award(WHO, 3 * HEART);
    g.heartEvents.mark("ev-h", 4);
    const data = JSON.parse(serialize(g));
    for (const p of data.players) {
      delete p.friendship;
      delete p.heartEvents;
    }
    const back = deserialize(JSON.stringify(data))!;
    expect(back.friendship.points(WHO)).toBe(3 * HEART);
    expect(back.heartEvents.seen("ev-h")).toBe(true);
    expect(back.players.get("g2").friendship.points(WHO)).toBe(0);
  });

  it("syncs a guest's record to their copy without touching the host", () => {
    const host = mk();
    host.players.get("g2").friendship.meet(WHO);
    host.players.get("g2").friendship.award(WHO, HEART);
    host.friendship.meet(WHO);
    const copy = mk();
    copy.friendship.meet(WHO);
    copy.friendship.award(WHO, 2 * HEART);
    expect(syncPlayer(copy.players, savePlayer(host.players.get("g2")))).toBe(
      true,
    );
    expect(copy.players.get("g2").friendship.points(WHO)).toBe(HEART);
    expect(copy.friendship.points(WHO)).toBe(2 * HEART);
  });
});
