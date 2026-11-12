import { describe, expect, it } from "vitest";
import "../src/core/save";
import { mapFiles, maps } from "../src/content/maps";
import {
  gateOpen,
  gateOwners,
  gateShutLine,
  parseGate,
} from "../src/core/gates";
import { Friendship } from "../src/core/friendship";
import { villagerById } from "../src/core/villagers";

describe("gate rules", () => {
  it("parses friendship gates and rejects the rest", () => {
    expect(parseGate("friendship:parents:2")).toEqual({
      slug: "parents",
      hearts: 2,
    });
    expect(parseGate("friendship:young-a:2")?.slug).toBe("young-a");
    expect(parseGate("mines-open")).toBeUndefined();
    expect(parseGate(undefined)).toBeUndefined();
  });

  it("opens at two hearts with the owner and not before", () => {
    const f = new Friendship();
    const rule = parseGate("friendship:child:2")!;
    expect(gateOpen("sawmill", rule, (id) => f.hearts(id))).toBe(false);
    f.talk("wren", 1);
    expect(gateOpen("sawmill", rule, (id) => f.hearts(id))).toBe(false);
    const open = gateOpen("sawmill", rule, (id) =>
      id === "wren" ? 2 : f.hearts(id),
    );
    expect(open).toBe(true);
  });

  it("a couple's door opens for either of them, and a stranger's does not", () => {
    const rule = parseGate("friendship:parents:2")!;
    expect(gateOpen("sawmill", rule, (id) => (id === "rufus" ? 2 : 0))).toBe(
      true,
    );
    expect(gateOpen("sawmill", rule, (id) => (id === "odette" ? 9 : 0))).toBe(
      false,
    );
  });

  it("shows a clear line naming the people", () => {
    const line = gateShutLine("sawmill", parseGate("friendship:parents:2")!);
    expect(line).toContain("Tilda");
    expect(line).toContain("Rufus");
    expect(line).toContain("2 hearts");
    expect(line).not.toContain("—");
  });

  it("every gate on every map has a known owner and valid villagers", () => {
    let count = 0;
    for (const id of Object.keys(mapFiles)) {
      const map = maps.get(id);
      for (const g of map?.gates ?? []) {
        count++;
        const rule = parseGate(g.rule);
        expect(rule, `${id}:${g.id}`).toBeDefined();
        const owners = gateOwners(id, rule!.slug);
        expect(owners.length, `${id}:${g.id} owners`).toBeGreaterThan(0);
        for (const o of owners) expect(villagerById(o), o).toBeDefined();
      }
    }
    expect(count).toBeGreaterThan(15);
  });

  it("a gate tile is found by position", () => {
    const store = maps.get("general-store")!;
    const g = store.gates.find((x) => x.id === "door-gated-parents")!;
    expect(store.gateAt(g.x, g.y)?.id).toBe("door-gated-parents");
    expect(store.gateAt(-1, -1)).toBeUndefined();
  });
});
