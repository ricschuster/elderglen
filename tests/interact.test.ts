import { describe, expect, it } from "vitest";
import { HAY, SILO_SITES } from "../src/core/animals";
import {
  resolveAction,
  resolveUse,
  type ActionContext,
  useSiloIntent,
  type UseContext,
} from "../src/core/interact";
import { CAVE_MAP } from "../src/core/cave";
import { LEVER_KIND } from "../src/core/danger";
import { maps } from "../src/content/maps";
import { START } from "../src/core/maps";
import { LOCAL_PLAYER } from "../src/core/players";
import { POT_ITEM } from "../src/core/pots";
import { GameRoomWorld } from "../src/core/roomworld";
import { newGame } from "../src/core/save";
import { WEAPONS } from "../src/core/combat";
import { RODS } from "../src/core/fishing";
import type { Held } from "../src/core/toolbar";

const site = SILO_SITES["farm"]!;

describe("useSiloIntent", () => {
  it("ignores tiles that are not the silo, or a silo not yet built", () => {
    const g = newGame();
    expect(useSiloIntent(g, "farm", site.x, site.y, 0)).toBeUndefined();
    g.animals.silo = true;
    expect(useSiloIntent(g, "farm", 0, 0, 0)).toBeUndefined();
    expect(useSiloIntent(g, "cellar", site.x, site.y, 0)).toBeUndefined();
  });

  it("reads the fill level when no hay is held", () => {
    const g = newGame();
    g.animals.silo = true;
    expect(useSiloIntent(g, "farm", site.x, site.y, 0)).toMatch(
      /^The silo holds 0 of \d+ hay/,
    );
  });

  it("tips held hay in and reports the count", () => {
    const g = newGame();
    g.animals.silo = true;
    g.inventory.add(HAY);
    g.inventory.add(HAY);
    const slot = Array.from({ length: g.inventory.size }, (_, i) => i).find(
      (i) => g.inventory.slot(i)?.id === HAY,
    )!;
    const msg = useSiloIntent(g, "farm", site.x, site.y, slot);
    expect(msg).toMatch(/^2 hay into the silo \(2\//);
    expect(g.animals.hay).toBe(2);
    expect(g.inventory.count(HAY)).toBe(0);
  });
});

const farm = maps.get(START.map);
const delta = maps.get("delta");
const tile = farm.tillableTiles()[0]!;

const ctx = (over: Partial<UseContext> = {}): UseContext => ({
  mapId: "farm",
  map: farm,
  facing: "right",
  rockAt: () => false,
  litBombAt: () => false,
  personAt: () => false,
  ...over,
});
const item = (id: string, count = 1): Held => ({ kind: "item", id, count });
const tool = (t: "hoe" | "can" | "axe" | "pickaxe" | "scythe"): Held => ({
  kind: "tool",
  tool: t,
});
const empty: Held = { kind: "empty" };
const use = (
  g: ReturnType<typeof newGame>,
  held: Held,
  c = ctx(),
  at: { x: number; y: number } = tile,
) => resolveUse(g, LOCAL_PLAYER, c, held, at);

describe("resolveUse: what stands in the way", () => {
  it("swings a held weapon and leaves the swing to the scene", () => {
    const g = newGame();
    const w = WEAPONS[0]!;
    expect(use(g, item(w.id))).toEqual({ kind: "swing", weapon: w });
  });

  it("does nothing on a service tile or where a villager stands", () => {
    const g = newGame();
    const shop = Object.create(farm) as typeof farm;
    shop.serviceAt = () => ({ kind: "shop", id: "x" }) as never;
    expect(use(g, tool("hoe"), ctx({ map: shop }))).toEqual({ kind: "none" });
    expect(use(g, tool("hoe"), ctx({ personAt: () => true }))).toEqual({
      kind: "none",
    });
    expect(g.farm.plotAt(tile.x, tile.y)).toBeUndefined();
  });

  it("answers at the silo with a line", () => {
    const g = newGame();
    g.animals.silo = true;
    const at = { x: site.x, y: site.y };
    const r = use(g, empty, ctx(), at);
    expect(r.kind).toBe("message");
    g.inventory.add(HAY, 3);
    const tipped = use(g, item(HAY), ctx(), at);
    expect(tipped).toMatchObject({ kind: "message" });
    expect(g.animals.hay).toBe(3);
  });
});

describe("resolveUse: tools on soil", () => {
  it("tills with the hoe, with its sound, and charges the player", () => {
    const g = newGame();
    const before = g.day.energy.current;
    const r = use(g, tool("hoe"));
    expect(r).toMatchObject({ kind: "tool", cue: "tool.hoe" });
    expect(r.kind === "tool" && r.result.ok).toBe(true);
    expect(g.farm.plotAt(tile.x, tile.y)).toBeDefined();
    expect(g.day.energy.current).toBeLessThan(before);
  });

  it("plants a seed in tilled soil and waters it with the can", () => {
    const g = newGame();
    g.inventory.add("parsnip-seed", 2);
    use(g, tool("hoe"));
    const planted = use(g, item("parsnip-seed"));
    expect(planted).toMatchObject({ kind: "tool" });
    expect(g.farm.plotAt(tile.x, tile.y)?.crop).toBeDefined();
    const watered = use(g, tool("can"));
    expect(watered).toMatchObject({ kind: "tool", cue: "tool.water" });
    expect(g.farm.plotAt(tile.x, tile.y)?.wateredToday).toBe(true);
  });

  it("is refused with the reason when the hoe meets hard ground", () => {
    const g = newGame();
    const r = use(g, tool("hoe"), ctx(), { x: 0, y: 0 });
    expect(r.kind).toBe("tool");
    expect(r.kind === "tool" && r.result.ok).toBe(false);
  });

  it("fills the can on water", () => {
    const g = newGame();
    const water = (() => {
      for (let y = 0; y < farm.height; y++)
        for (let x = 0; x < farm.width; x++)
          if (farm.isWater(x, y)) return { x, y };
      throw new Error("no water on the farm");
    })();
    const r = use(g, tool("can"), ctx(), water);
    expect(r).toMatchObject({ kind: "tool", cue: "tool.fill" });
  });

  it("answers an empty hand with a refusal, no sound", () => {
    const g = newGame();
    expect(use(g, empty)).toMatchObject({
      kind: "tool",
      result: { ok: false, reason: "nothing held" },
    });
  });
});

describe("resolveUse: axe and pickaxe", () => {
  it("the axe takes a placed chest up and the pickaxe too", () => {
    for (const t of ["axe", "pickaxe"] as const) {
      const g = newGame();
      g.inventory.add("chest");
      expect(use(g, item("chest"))).toMatchObject({
        kind: "report",
        result: { ok: true },
      });
      expect(g.chests.at("farm", tile.x, tile.y)).toBeDefined();
      expect(use(g, tool(t))).toMatchObject({
        kind: "report",
        result: { ok: true },
      });
      expect(g.chests.at("farm", tile.x, tile.y)).toBeUndefined();
    }
  });

  it("an item-filled chest is pushed one tile along the facing instead", () => {
    const g = newGame();
    g.inventory.add("chest");
    use(g, item("chest"));
    const chest = g.chests.get("farm", tile.x, tile.y)!;
    chest.items.add("parsnip", 1);
    const next = farm
      .tillableTiles()
      .find((t) => t.x === tile.x + 1 && t.y === tile.y);
    const r = use(g, tool("axe"), ctx({ facing: "right" }));
    expect(r.kind).toBe("report");
    if (next) expect(g.chests.at("farm", next.x, next.y)).toBeDefined();
    else expect(r.kind === "report" && r.result.ok).toBe(false);
  });
});

describe("resolveUse: rod and ponds", () => {
  it("a held rod casts", () => {
    const g = newGame();
    const rod = RODS[0]!;
    expect(use(g, item(rod.id))).toEqual({ kind: "cast", rod: rod.id });
  });
});

describe("resolveUse: placing and lifting", () => {
  it("stands a torch down and any held thing lifts it", () => {
    const g = newGame();
    g.inventory.add("torch");
    expect(use(g, item("torch"))).toMatchObject({
      kind: "report",
      result: { ok: true },
    });
    expect(use(g, empty)).toMatchObject({
      kind: "report",
      result: { ok: true },
    });
    expect(g.inventory.count("torch")).toBe(1);
  });

  it("places a pot on water, baits it and lifts it with the axe", () => {
    const g = newGame();
    g.inventory.add(POT_ITEM, 2);
    g.inventory.add("plain-bait", 2);
    const c = ctx({ mapId: "delta", map: delta });
    const at = { x: 63, y: 10 };
    expect(use(g, item(POT_ITEM), c, at)).toMatchObject({
      kind: "report",
      result: { ok: true },
    });
    expect(g.pots.get("delta", 63, 10)).toBeDefined();
    expect(use(g, item("plain-bait"), c, at)).toMatchObject({
      kind: "report",
      result: { ok: true },
    });
    expect(use(g, tool("axe"), c, at)).toMatchObject({
      kind: "report",
      result: { ok: true },
    });
    expect(g.pots.get("delta", 63, 10)).toBeUndefined();
  });

  it("lights a bomb and hands the fuse back, unless a rock or another bomb is there", () => {
    const g = newGame();
    g.inventory.add("cherry-bomb", 2);
    const blocked = use(g, item("cherry-bomb"), ctx({ rockAt: () => true }));
    expect(blocked).toMatchObject({ kind: "report", result: { ok: false } });
    const lit = use(g, item("cherry-bomb"));
    expect(lit).toMatchObject({ kind: "report", result: { ok: true } });
    expect(lit.kind === "report" && lit.bomb).toMatchObject({
      x: tile.x,
      y: tile.y,
    });
    expect(g.inventory.count("cherry-bomb")).toBe(1);
  });

  it("stands a farm decoration down and lifts it by hand", () => {
    const g = newGame();
    g.inventory.add("ornamental-hay-bale");
    expect(use(g, item("ornamental-hay-bale"))).toMatchObject({
      kind: "report",
      result: { ok: true },
    });
    expect(use(g, empty)).toMatchObject({
      kind: "report",
      result: { ok: true },
    });
    expect(g.inventory.count("ornamental-hay-bale")).toBe(1);
  });

  it("stands a lightning rod down on clear farm ground", () => {
    const g = newGame();
    g.inventory.add("lightning-rod");
    expect(use(g, item("lightning-rod"))).toMatchObject({
      kind: "report",
      result: { ok: true },
    });
    expect(g.inventory.count("lightning-rod")).toBe(0);
  });

  it("lifts a placed lightning rod by hand", () => {
    const g = newGame();
    g.inventory.add("lightning-rod");
    use(g, item("lightning-rod"));
    expect(g.inventory.count("lightning-rod")).toBe(0);
    expect(use(g, empty)).toMatchObject({
      kind: "report",
      result: { ok: true },
    });
    expect(g.inventory.count("lightning-rod")).toBe(1);
  });
});

describe("resolveUse: as another player", () => {
  it("spends the sender's energy and tills with their hoe, not the host's", () => {
    const w = new GameRoomWorld(newGame("standard", "separate"), {
      random: () => 0.9,
    });
    w.admit("p2", "Ann");
    w.addPlayer("p2", "Ann");
    const hostEnergy = w.g.players.get(LOCAL_PLAYER).energy.current;
    const ann = w.g.players.get("p2").energy.current;
    const r = resolveUse(w.g, "p2", ctx(), tool("hoe"), tile);
    expect(r).toMatchObject({ kind: "tool", result: { ok: true } });
    expect(w.g.players.get("p2").energy.current).toBeLessThan(ann);
    expect(w.g.players.get(LOCAL_PLAYER).energy.current).toBe(hostEnergy);
    expect(w.g.players.localId).toBe(LOCAL_PLAYER);
  });
});

/** Any slot holds this crop, at any quality. */
const packHas = (inv: ReturnType<typeof newGame>["inventory"], id: string) =>
  Array.from({ length: inv.size }, (_, i) => inv.slot(i)?.id ?? "").some((x) =>
    x.includes(id),
  );
const actCtx = (over: Partial<ActionContext> = {}): ActionContext => ({
  ...ctx(),
  ladderAt: () => false,
  ...over,
});
/** A farm map that has one service at every tile. */
const withService = (kind: string, id = "x") => {
  const m = Object.create(farm) as typeof farm;
  m.serviceAt = () => ({ kind, id }) as never;
  return m;
};
const act = (
  g: ReturnType<typeof newGame>,
  held: Held = empty,
  c: ActionContext = actCtx(),
  at: { x: number; y: number } = tile,
) => resolveAction(g, LOCAL_PLAYER, c, held, at);

describe("resolveAction: services", () => {
  it("opens the shop screens with the stock they sell", () => {
    const g = newGame();
    for (const [kind, stock] of [
      ["fisher-shop", "fisher"],
      ["pin-stall", "pin"],
    ] as const)
      expect(act(g, empty, actCtx({ map: withService(kind) }))).toEqual({
        kind: "open",
        scene: "shop",
        data: { stock },
      });
  });

  it("opens plain screens by service kind, with the hall room as data", () => {
    const g = newGame();
    expect(act(g, empty, actCtx({ map: withService("keeper") }))).toEqual({
      kind: "open",
      scene: "keeper",
    });
    expect(act(g, empty, actCtx({ map: withService("trainer") }))).toEqual({
      kind: "open",
      scene: "trainer",
    });
    expect(act(g, empty, actCtx({ map: withService("ore-bin") }))).toEqual({
      kind: "open",
      scene: "bin",
      data: { oreOnly: true },
    });
    expect(
      act(g, empty, actCtx({ map: withService("hall", "pantry") })),
    ).toEqual({ kind: "open", scene: "hall", data: { room: "pantry" } });
  });

  it("answers a message service with its line", () => {
    const g = newGame();
    const r = act(g, empty, actCtx({ map: withService("dummy") }));
    expect(r).toMatchObject({ kind: "message" });
    const camp = act(g, empty, actCtx({ map: withService("camp") }));
    expect(camp).toMatchObject({ kind: "message" });
  });

  it("hands scene-owned services back by tag", () => {
    const g = newGame();
    expect(act(g, empty, actCtx({ map: withService("tide-bridge") }))).toEqual({
      kind: "mend-bridge",
    });
    expect(act(g, empty, actCtx({ map: withService("stairs") }))).toEqual({
      kind: "stairs",
    });
    expect(act(g, empty, actCtx({ map: withService("stonekeeper") }))).toEqual({
      kind: "stonekeeper",
    });
  });

  it("the lever flips the mine's danger and needs a floor", () => {
    const g = newGame();
    const m = withService(LEVER_KIND);
    expect(act(g, empty, actCtx({ map: m }))).toMatchObject({
      kind: "open",
      scene: LEVER_KIND,
    });
    const r = act(g, empty, actCtx({ map: m, floor: 1 }));
    expect(r).toMatchObject({ kind: "message", cue: "mine.stairs" });
  });

  it("the furnace says nothing is here until it is gifted", () => {
    const g = newGame();
    const c = actCtx({ map: withService("furnace") });
    expect(act(g, empty, c)).toEqual({
      kind: "message",
      text: "Nothing is here yet.",
    });
    g.furnace.gifted = true;
    expect(act(g, empty, c)).toEqual({ kind: "open", scene: "furnace" });
  });

  it("in the cave a bare tile goes to the cave, and a ladder tile descends", () => {
    const g = newGame();
    expect(act(g, empty, actCtx({ mapId: CAVE_MAP }))).toEqual({
      kind: "cave",
    });
    expect(act(g, empty, actCtx({ ladderAt: () => true }))).toEqual({
      kind: "descend",
    });
  });
});

describe("resolveAction: things on the ground", () => {
  it("opens a placed chest with its sound", () => {
    const g = newGame();
    g.inventory.add("chest");
    use(g, item("chest"));
    expect(act(g)).toEqual({
      kind: "open",
      scene: "chest",
      data: { mapId: "farm", x: tile.x, y: tile.y },
      cue: "chest.open",
    });
  });

  it("collects from a pot on the water", () => {
    const g = newGame();
    g.inventory.add(POT_ITEM);
    const c = actCtx({ mapId: "delta", map: delta });
    const at = { x: 63, y: 10 };
    use(g, item(POT_ITEM), c, at);
    expect(act(g, empty, c, at)).toMatchObject({ kind: "report" });
  });

  it("harvests a ripe crop with the harvest sound", () => {
    const g = newGame();
    g.farm.till(tile.x, tile.y);
    g.farm.plant(tile.x, tile.y, "parsnip", "spring");
    for (let i = 0; i < 8; i++) {
      g.farm.water(tile.x, tile.y);
      g.farm.endDay("spring");
    }
    const r = act(g);
    expect(r).toMatchObject({ kind: "act", cue: "crop.harvest" });
    expect(packHas(g.inventory, "parsnip")).toBe(true);
  });

  it("does nothing on a bare tile, and eats held food instead", () => {
    const g = newGame();
    expect(act(g)).toEqual({ kind: "none" });
    expect(act(g, item("parsnip"))).toEqual({ kind: "eat" });
    expect(act(g, item("parsnip-seed"))).toEqual({ kind: "none" });
  });

  it("opens the house workbench, and a bare piece is picked up", () => {
    const g = newGame();
    const house = maps.get("house");
    const spot = (() => {
      for (let y = 0; y < house.height; y++)
        for (let x = 0; x < house.width; x++) {
          const t = newGame();
          t.inventory.add("oak-chair");
          if (
            use(t, item("oak-chair"), ctx({ mapId: "house", map: house }), {
              x,
              y,
            }).kind === "report" &&
            t.furniture.at("house", x, y)
          )
            return { x, y };
        }
      throw new Error("no spot");
    })();
    g.inventory.add("oak-chair");
    const c = actCtx({ mapId: "house", map: house });
    use(g, item("oak-chair"), c, spot);
    expect(act(g, empty, c, spot)).toMatchObject({ kind: "report" });
    expect(g.furniture.at("house", spot.x, spot.y)).toBeUndefined();
  });
});

describe("resolveAction: as another player", () => {
  it("harvests into the sender's pack", () => {
    const w = new GameRoomWorld(newGame("standard", "separate"), {
      random: () => 0.9,
    });
    w.admit("p2", "Ann");
    w.addPlayer("p2", "Ann");
    const g = w.g;
    g.farm.till(tile.x, tile.y);
    g.farm.plant(tile.x, tile.y, "parsnip", "spring");
    for (let i = 0; i < 8; i++) {
      g.farm.water(tile.x, tile.y);
      g.farm.endDay("spring");
    }
    const before = packHas(g.players.get(LOCAL_PLAYER).inventory, "parsnip");
    const r = resolveAction(g, "p2", actCtx(), empty, tile);
    expect(r).toMatchObject({ kind: "act" });
    expect(packHas(g.players.get("p2").inventory, "parsnip")).toBe(true);
    expect(packHas(g.players.get(LOCAL_PLAYER).inventory, "parsnip")).toBe(
      before,
    );
  });
});
