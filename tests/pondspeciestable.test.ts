import { describe, expect, it } from "vitest";
import pondData from "../src/content/pond.json";
import { itemById } from "../src/core/items";
import { POND_SPECIES } from "../src/core/pondspecies";
import { FISH } from "../src/core/fishing";

type Row = {
  goods?: { item: string; minPop: number }[];
  reward?: { item: string; count: number };
};
const rows = pondData.species as Record<string, Row>;

describe("pond species table (note 93)", () => {
  it("has a row for every fish that is not common (the pond's unique fish is roe only, open)", () => {
    for (const f of FISH) {
      expect(!!rows[f.id], f.id).toBe(
        f.rarity !== "common" && f.rarity !== "unique",
      );
    }
  });

  it("only names species the pond can hold", () => {
    const ids = new Set(POND_SPECIES.map((s) => s.id));
    for (const id of Object.keys(rows)) expect(ids.has(id), id).toBe(true);
  });

  it("uses items that exist", () => {
    for (const [id, r] of Object.entries(rows)) {
      for (const g of r.goods ?? [])
        expect(itemById(g.item), `${id} ${g.item}`).toBeTruthy();
      if (r.reward)
        expect(itemById(r.reward.item), `${id} reward`).toBeTruthy();
    }
  });

  it("follows the tiers: rare fish two goods and a reward, legends none", () => {
    for (const f of FISH) {
      const r = rows[f.id];
      if (f.rarity === "uncommon") expect(r!.goods).toHaveLength(1);
      if (f.rarity === "rare") {
        expect(r!.goods!.map((g) => g.minPop)).toEqual([3, 7]);
        expect(r!.reward).toBeTruthy();
      }
      if (f.rarity === "legend") expect(r!.reward).toBeUndefined();
    }
  });

  it("gives algae soup to the glassy elver", () => {
    expect(rows["glassy-elver"]!.reward).toEqual({
      item: "algae-soup",
      count: 1,
    });
  });
});
