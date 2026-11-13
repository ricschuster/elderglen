import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, met } from "../src/core/achievements";
import { FishLog } from "../src/core/fishing";
import { ALGAE_SOUP, itemById } from "../src/core/items";
import { giveQuestItem } from "../src/core/pond";
import {
  agedRoeOf,
  POND_SPECIES,
  roeOf,
  roeSpeciesOf,
} from "../src/core/pondspecies";
import {
  AGED_ROE_MINUTES,
  MINUTES_PER_DAY,
  processFor,
} from "../src/core/processing";
import { deserialize, newGame, serialize } from "../src/core/save";
import { potColourOf } from "../src/core/tailoring";
import { landFind } from "../src/core/waterfinds";

const fish = "carp";

describe("water finds and the catch total (note 93)", () => {
  it("count toward catch N fish but never the kinds or the roster", () => {
    const g = newGame();
    const total = ACHIEVEMENTS.find((a) => a.kind === "fishTotal")!;
    for (let i = 0; i < total.threshold - 1; i++)
      landFind(g, { x: 0, y: 0 }, "pondweed");
    expect(met(g, total)).toBe(false);
    landFind(g, { x: 0, y: 0 }, "seaweed");
    expect(met(g, total)).toBe(true);
    expect(g.fishing.kinds).toBe(0);
    const kinds = ACHIEVEMENTS.find((a) => a.kind === "fishKinds")!;
    expect(met(g, kinds)).toBe(false);
  });

  it("are saved and loaded, and old saves load with none", () => {
    const g = newGame();
    landFind(g, { x: 0, y: 0 }, "pondweed");
    const back = deserialize(serialize(g));
    expect(back!.fishing.total).toBe(1);
    const log = new FishLog();
    log.load({ caught: {} });
    expect(log.total).toBe(0);
  });
});

describe("aged roe (note 93)", () => {
  it("is made in the preserves jar from roe, in 4 days", () => {
    const p = processFor("preserves-jar", roeOf(fish))!;
    expect(p.output).toBe(agedRoeOf(fish));
    expect(p.minutes).toBe(4 * MINUTES_PER_DAY);
    expect(p.minutes).toBe(AGED_ROE_MINUTES);
    expect(p.use).toBe(1);
  });

  it("sells for twice the roe, for every species", () => {
    for (const s of POND_SPECIES) {
      const roe = itemById(roeOf(s.id))!;
      const aged = itemById(agedRoeOf(s.id))!;
      expect(aged.sellPrice).toBe(2 * roe.sellPrice);
    }
  });

  it("does not go in the jar again, and the keg takes neither", () => {
    expect(processFor("preserves-jar", agedRoeOf(fish))).toBeUndefined();
    expect(processFor("keg", roeOf(fish))).toBeUndefined();
  });

  it("keeps the colour of its fish in the pot", () => {
    const raw = potColourOf(fish);
    expect(raw).toBeDefined();
    expect(potColourOf(roeOf(fish))).toBe(raw);
    expect(potColourOf(agedRoeOf(fish))).toBe(raw);
  });

  it("reads species from both roe ids", () => {
    expect(roeSpeciesOf(roeOf(fish))).toBe(fish);
    expect(roeSpeciesOf(agedRoeOf(fish))).toBe(fish);
    expect(roeSpeciesOf("honey")).toBeUndefined();
  });
});

describe("algae soup (note 93)", () => {
  it("is an item with no cooking recipe", () => {
    expect(itemById(ALGAE_SOUP)?.energy).toBeGreaterThan(0);
  });

  it("giveQuestItem still works with no reward row", () => {
    const g = newGame();
    expect(giveQuestItem(g, 0, 0).ok).toBe(false);
  });
});
