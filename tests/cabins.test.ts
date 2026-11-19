import { describe, expect, it } from "vitest";
import {
  CABIN_PRICE,
  MAX_CABINS,
  buyCabin,
  cabinOf,
  defaultCabinSite,
  demolishCabin,
  freeCabins,
  joinNeedsCabin,
  newCabinBook,
  placementFailure,
} from "../src/core/cabins";

const open = () => false;
const area = { x: 0, y: 0, w: 40, h: 10 };

describe("cabin placement", () => {
  it("places freely on clear ground", () => {
    expect(
      placementFailure(newCabinBook("converted"), { x: 3, y: 3 }, open),
    ).toBeNull();
  });
  it("refuses blocked tiles and overlaps", () => {
    const book = newCabinBook("converted");
    expect(
      placementFailure(book, { x: 0, y: 0 }, (x, y) => x === 2 && y === 2),
    ).toBe("blocked");
    const b = buyCabin(book, 500, { x: 0, y: 0 }, open);
    expect(b.ok && placementFailure(b.book, { x: 3, y: 2 }, open)).toBe(
      "overlap",
    );
    expect(b.ok && placementFailure(b.book, { x: 4, y: 0 }, open)).toBeNull();
  });
  it("finds the first default site and skips existing cabins", () => {
    const b = buyCabin(newCabinBook("converted"), 500, { x: 0, y: 0 }, open);
    expect(b.ok && defaultCabinSite(b.book, area, open)).toEqual({
      x: 4,
      y: 0,
    });
    expect(
      defaultCabinSite(
        newCabinBook("converted"),
        { x: 0, y: 0, w: 3, h: 3 },
        open,
      ),
    ).toBeNull();
  });
});

describe("buying", () => {
  it("costs 100 gold and leaves a free cabin", () => {
    const r = buyCabin(newCabinBook("converted"), 250, { x: 0, y: 0 }, open);
    expect(r.ok && r.gold).toBe(250 - CABIN_PRICE);
    expect(r.ok && freeCabins(r.book)).toHaveLength(1);
  });
  it("refuses without gold and past the cap", () => {
    expect(
      buyCabin(newCabinBook("converted"), 99, { x: 0, y: 0 }, open),
    ).toEqual({
      ok: false,
      reason: "unaffordable",
    });
    let book = newCabinBook("converted");
    for (let i = 0; i < MAX_CABINS; i++) {
      const r = buyCabin(book, 1000, { x: i * 4, y: 0 }, open);
      if (r.ok) book = r.book;
    }
    expect(book.cabins).toHaveLength(MAX_CABINS);
    expect(buyCabin(book, 1000, { x: 0, y: 5 }, open)).toEqual({
      ok: false,
      reason: "cap",
    });
  });
});

describe("join needs a cabin", () => {
  it("builds a free cabin per joiner in a game started as multiplayer", () => {
    let book = newCabinBook("multiplayer-start");
    for (const k of ["a", "b"]) {
      const r = joinNeedsCabin(book, k, area, open);
      expect(r.kind).toBe("assigned");
      if (r.kind === "assigned") {
        book = r.book;
        expect(r.cabin.free).toBe(true);
      }
    }
    expect(book.cabins).toHaveLength(2);
    expect(cabinOf(book, "b")).toBeDefined();
  });
  it("stops at the cap", () => {
    let book = newCabinBook("multiplayer-start");
    for (let i = 0; i < MAX_CABINS; i++) {
      const r = joinNeedsCabin(book, `k${i}`, area, open);
      if (r.kind === "assigned") book = r.book;
    }
    expect(joinNeedsCabin(book, "late", area, open)).toEqual({
      kind: "refused",
      reason: "full",
    });
  });
  it("refuses a converted game with no free cabin, then accepts after a purchase", () => {
    const book = newCabinBook("converted");
    expect(joinNeedsCabin(book, "g", area, open)).toEqual({
      kind: "refused",
      reason: "no-free-cabin",
    });
    const bought = buyCabin(book, 100, { x: 0, y: 0 }, open);
    if (!bought.ok) throw new Error("buy failed");
    const r = joinNeedsCabin(bought.book, "g", area, open);
    expect(r.kind).toBe("assigned");
    if (r.kind === "assigned") expect(r.cabin.free).toBe(false);
  });
  it("gives a returning key the same cabin", () => {
    const first = joinNeedsCabin(
      newCabinBook("multiplayer-start"),
      "g",
      area,
      open,
    );
    if (first.kind !== "assigned") throw new Error("expected assigned");
    const again = joinNeedsCabin(first.book, "g", area, open);
    expect(again.kind).toBe("returning");
    expect(again.kind === "returning" && again.cabin.id).toBe(first.cabin.id);
  });
});

describe("demolish", () => {
  it("reports the evicted occupant", () => {
    const j = joinNeedsCabin(
      newCabinBook("multiplayer-start"),
      "g",
      area,
      open,
    );
    if (j.kind !== "assigned") throw new Error("expected assigned");
    const d = demolishCabin(j.book, j.cabin.id);
    expect(d?.evictedKey).toBe("g");
    expect(d?.book.cabins).toHaveLength(0);
    expect(demolishCabin(j.book, 99)).toBeNull();
  });
});
