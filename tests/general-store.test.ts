import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";

// The rebuilt general store (note 86 pilot, #853): 31 by 31, a 2 wide door, and
// the two gated bedroom doors. Reachability is in interior-reach.test.ts.
const store = mapFiles["general-store"]!;
const objects = store.layers.flatMap((l) => l.objects ?? []);
const cls = (c: string) => objects.filter((o) => (o.class ?? o.type) === c);
const prop = (o: (typeof objects)[number], n: string) =>
  o.properties?.find((p) => p.name === n)?.value;

describe("the general store", () => {
  it("is 31 by 31 with ground, collision and marker layers", () => {
    const m = maps.get("general-store");
    expect([m.width, m.height]).toEqual([31, 31]);
    for (const n of ["ground", "collision", "markers"])
      expect(
        store.layers.some((l) => l.name === n),
        n,
      ).toBe(true);
  });

  it("has a 1 wide exit to its Hearthwell lot, entered by the same name", () => {
    const door = maps.get("general-store").exits.find((e) => e.id === "door")!;
    expect([door.w, door.h]).toEqual([1, 1]);
    expect([door.map, door.entry]).toEqual([
      "hearthwell",
      "from_general-store",
    ]);
  });

  it("has two gated bedroom doors carrying a friendship gate", () => {
    const gates = cls("gate");
    expect(gates.map((g) => g.name).sort()).toEqual([
      "door-gated-child",
      "door-gated-parents",
    ]);
    for (const g of gates)
      expect(String(prop(g, "gate"))).toMatch(/^friendship:(parents|child):2$/);
  });

  it("has a counter service on a solid tile with a shop kind", () => {
    const m = maps.get("general-store");
    expect(m.services.length).toBeGreaterThanOrEqual(2);
    for (const s of m.services) {
      expect(s.kind).toBe("shop");
      expect(m.isBlocked(s.x, s.y)).toBe(true);
    }
  });
});
