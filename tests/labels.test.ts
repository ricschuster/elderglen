import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import { exitLabel, serviceLabel } from "../src/core/labels";

describe("placeholder labels", () => {
  it("names every door and counter on every map", () => {
    for (const id of Object.keys(mapFiles)) {
      const map = maps.get(id);
      for (const e of map.exits)
        expect(exitLabel(e.id), `${id} exit ${e.id}`).toBeDefined();
      for (const s of map.services)
        expect(
          serviceLabel(s.kind, s.id),
          `${id} ${s.kind} ${s.id}`,
        ).toBeDefined();
    }
  });
});
