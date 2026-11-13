import { describe, expect, it } from "vitest";
import {
  FISH,
  ORDINARY_FISH,
  bite,
  fishAvailable,
  fishById,
  type Conditions,
} from "../src/core/fishing";

const dusk = (season: Conditions["season"]): Conditions => ({
  season,
  minutes: 18 * 60 + 30,
  raining: false,
  rod: "reed-pole",
  waterRoomDone: false,
});

describe("the Secret Woods pond fish (notes 73 and 21)", () => {
  it("has the Fernscale as the one unique fish, outside the ordinary roster", () => {
    const f = fishById("fernscale")!;
    expect(f.rarity).toBe("unique");
    expect(f.water).toBe("woods-pond");
    expect(FISH.filter((x) => x.rarity === "unique")).toHaveLength(1);
    expect(ORDINARY_FISH.some((x) => x.id === "fernscale")).toBe(false);
    expect(ORDINARY_FISH).toHaveLength(46);
    expect(FISH).toHaveLength(52);
  });

  it("holds two borrowed common fish by day and the Fernscale at dusk", () => {
    const noon = { ...dusk("spring"), minutes: 12 * 60 };
    const day = fishAvailable("woods-pond", noon).map((f) => f.id);
    expect(day.sort()).toEqual(["carp", "perch"]);
    const eve = fishAvailable("woods-pond", dusk("spring")).map((f) => f.id);
    expect(eve).toEqual(["fernscale"]);
  });

  it("keeps the Fernscale to its own pond", () => {
    for (const w of [
      "river",
      "forest-lake",
      "farm-pond",
      "cove",
      "sea",
    ] as const)
      expect(
        fishAvailable(w, dusk("spring")).some((f) => f.id === "fernscale"),
      ).toBe(false);
  });

  it("can bite the Fernscale, and a tutorial cast gives a common fish", () => {
    let n = 0;
    const seen = new Set<string>();
    const rnd = () => ((n = (n * 7919 + 13) % 1000), n / 1000);
    for (let i = 0; i < 300; i++) {
      const b = bite("woods-pond", dusk("summer"), rnd);
      if (b.kind === "fish") seen.add(b.fish.id);
    }
    expect(seen.has("fernscale")).toBe(true);
    const t = bite("woods-pond", dusk("summer"), () => 0.5, true);
    expect(t.kind === "fish" && t.fish.rarity).toBe("common");
  });
});
