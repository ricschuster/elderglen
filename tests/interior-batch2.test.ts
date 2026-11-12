import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";

// The rebuilt library, hatter and forest farmstead (note 86, #857): sizes, a 2 wide
// door back to the lot by the same entry name, and the gated bedroom doors.
const PLANS = {
  library: { size: [35, 30], lot: "hearthwell", gates: ["librarian"] },
  hatter: { size: [27, 27], lot: "hearthwell", gates: ["barnaby", "cordelia"] },
  "forest-farmstead": { size: [32, 22], lot: "forest", gates: ["keeper"] },
} as const;

describe.each(Object.entries(PLANS))("the rebuilt %s", (id, plan) => {
  const m = maps.get(id);
  it("has its size and a 2 wide door to its lot", () => {
    expect([m.width, m.height]).toEqual(plan.size);
    const door = m.exits.find((e) => e.id === "door")!;
    expect([door.w, door.h, door.map]).toEqual([2, 1, plan.lot]);
    expect(door.entry).toBe(`from_${id.replace("forest-", "")}`);
  });
  it("carries a friendship gate on each bedroom door", () => {
    const gates = mapFiles[id]!.layers.flatMap((l) => l.objects ?? []).filter(
      (o) => (o.class ?? o.type) === "gate",
    );
    expect(
      gates
        .map((g) => g.properties?.find((p) => p.name === "gate")?.value)
        .sort(),
    ).toEqual(plan.gates.map((n) => `friendship:${n}:2`));
  });
});
