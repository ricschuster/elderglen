import { describe, expect, it } from "vitest";
import {
  FISH,
  bite,
  fishAvailable,
  potKindOf,
  type Conditions,
} from "../src/core/fishing";
import { maps } from "../src/content/maps";

const everything = (season: Conditions["season"]): Conditions[] =>
  [false, true].flatMap((raining) =>
    [6 * 60, 12 * 60, 18 * 60, 21 * 60].map((minutes) => ({
      season,
      minutes,
      raining,
      rod: "hearthwell-rod",
      waterRoomDone: true,
    })),
  );

describe("the farm pond is a lake (owner, 2026-11-10)", () => {
  it("is farm-pond water on both farm maps", () => {
    for (const id of ["farm", "farm-woodland"]) {
      const map = maps.get(id)!;
      const w = map.waterZones.length === 0 ? map.traits.waterKind : undefined;
      expect(w).toBe("farm-pond");
    }
  });

  it("never gives a river fish, the Valley King included", () => {
    const river = new Set(
      FISH.filter((f) => f.water === "river").map((f) => f.id),
    );
    expect(river.has("valley-king")).toBe(true);
    for (const season of ["spring", "summer", "fall", "winter"] as const)
      for (const c of everything(season))
        for (const f of fishAvailable("farm-pond", c))
          expect(river.has(f.id)).toBe(false);
  });

  it("gives lake fish, and no legend", () => {
    const seen = new Set<string>();
    for (const season of ["spring", "summer", "fall", "winter"] as const)
      for (const c of everything(season))
        for (const f of fishAvailable("farm-pond", c)) {
          seen.add(f.id);
          expect(f.rarity).not.toBe("legend");
        }
    expect(seen.has("carp")).toBe(true);
    expect(seen.has("perch")).toBe(true);
    expect(seen.has("grandmother-hush")).toBe(false);
  });

  it("still has a common fish for the tutorial cast", () => {
    const b = bite(
      "farm-pond",
      { season: "winter", minutes: 21 * 60, raining: false },
      () => 0,
      true,
    );
    expect(b.kind).toBe("fish");
  });

  it("is fresh water for pots", () => {
    expect(potKindOf("farm-pond")).toBe("fresh");
  });
});
