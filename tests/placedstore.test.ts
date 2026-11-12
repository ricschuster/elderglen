import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { START } from "../src/core/maps";
import { placeChest } from "../src/core/chests";
import { placeMachine } from "../src/core/machines";
import { PlacedStore, collectPlaced } from "../src/core/placedstore";
import { deserialize, newGame, serialize } from "../src/core/save";

const farm = maps.get(START.map);

describe("PlacedStore", () => {
  it("keeps one placeable a tile and a list a map", () => {
    const s = new PlacedStore();
    expect(s.add("farm", { x: 1, y: 2, id: "sprinkler" })).toBe(true);
    expect(s.add("farm", { x: 1, y: 2, id: "chest" })).toBe(false);
    expect(s.add("house", { x: 1, y: 2, id: "chest" })).toBe(true);
    expect(s.count).toBe(2);
    expect(s.get("farm", 1, 2)?.id).toBe("sprinkler");
    expect(s.remove("farm", 1, 2)?.id).toBe("sprinkler");
    expect(s.get("farm", 1, 2)).toBeUndefined();
    expect(s.mapIds()).toEqual(["house"]);
  });

  it("round-trips through save and load, and drops broken rows", () => {
    const s = new PlacedStore();
    s.add("farm", { x: 3, y: 4, id: "keg", state: { job: { count: 1 } } });
    const raw = JSON.parse(JSON.stringify(s.save()));
    raw.farm.push({ x: "a", y: 1, id: "chest" }, { x: 1, y: 1 }, null);
    const t = new PlacedStore();
    t.load(raw);
    expect(t.save()).toEqual(s.save());
    t.load("junk");
    expect(t.count).toBe(0);
  });

  it("does not share state with what it was given", () => {
    const state = { n: 1 };
    const s = new PlacedStore();
    s.add("farm", { x: 0, y: 0, id: "keg", state });
    state.n = 2;
    expect(s.get("farm", 0, 0)?.state).toEqual({ n: 1 });
  });
});

describe("the bridge to the older lists", () => {
  const spots = farm.tillableTiles();

  function stocked() {
    const g = newGame();
    g.inventory.add("chest");
    g.inventory.add("keg");
    expect(
      placeChest(g, farm, "farm", spots[0]!.x, spots[0]!.y, "chest").ok,
    ).toBe(true);
    g.chests.get("farm", spots[0]!.x, spots[0]!.y)?.items.add("wood", 5);
    expect(placeMachine(g, farm, spots[1]!.x, spots[1]!.y, "keg").ok).toBe(
      true,
    );
    g.sprinklers.add(spots[2]!.x, spots[2]!.y, "sprinkler");
    g.greenhouseSprinklers.add(1, 1, "quality-sprinkler");
    return g;
  }

  it("collects every sprinkler, machine and chest with its own data", () => {
    const store = collectPlaced(stocked());
    expect(store.mapIds().sort()).toEqual(["farm", "greenhouse"]);
    expect(store.count).toBe(4);
    const chest = store.get("farm", spots[0]!.x, spots[0]!.y);
    expect(chest?.id).toBe("chest");
    expect(JSON.stringify(chest?.state)).toContain("wood");
    expect(store.get("greenhouse", 1, 1)?.id).toBe("quality-sprinkler");
  });

  it("survives a save and load, and an old save with the three lists still loads", () => {
    const g = stocked();
    const text = serialize(g);
    const saved = JSON.parse(text);
    expect(saved.machines).toBeUndefined();
    expect(saved.chests).toBeUndefined();
    expect(saved.mapItems.farm.sprinklers).toBeUndefined();
    const back = deserialize(text)!;
    expect(collectPlaced(back).save()).toEqual(collectPlaced(g).save());
    expect(
      back.chests.get("farm", spots[0]!.x, spots[0]!.y)?.items.count("wood"),
    ).toBe(5);
    expect(back.machines.at(spots[1]!.x, spots[1]!.y)).toBe("keg");

    // The same game, saved the way builds before the store wrote it.
    const old = { ...saved };
    old.machines = g.machines.save();
    old.chests = g.chests.save();
    old.mapItems = {
      farm: { sprinklers: g.sprinklers.save() },
      greenhouse: { sprinklers: g.greenhouseSprinklers.save() },
    };
    delete old.placed;
    const fromOld = deserialize(JSON.stringify(old))!;
    expect(collectPlaced(fromOld).save()).toEqual(collectPlaced(g).save());
  });

  it("keeps a machine's running job through a save", () => {
    const g = stocked();
    const job = { output: "wine", count: 1, doneAt: 900 };
    g.machines.get(spots[1]!.x, spots[1]!.y)!.job = job;
    const back = deserialize(serialize(g))!;
    expect(back.machines.get(spots[1]!.x, spots[1]!.y)?.job).toMatchObject(job);
  });
});
