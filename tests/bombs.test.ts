import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  BOMBS,
  FUSE_SECONDS,
  blastCreatures,
  blastPlayer,
  blastRocks,
  bombById,
  inBlast,
  placeBomb,
  rockMinLevel,
  tickBombs,
  type LitBomb,
} from "../src/core/bombs";
import { newCreature } from "../src/core/creatures";
import { itemById } from "../src/core/items";
import { START } from "../src/core/maps";
import { mineMapId } from "../src/core/mines";
import { mayPlaceOn, placeableById } from "../src/core/placeables";
import { Rocks } from "../src/core/rocks";
import { newGame } from "../src/core/save";
import { buy } from "../src/core/shop";

const farm = maps.get(START.map);
const tile = farm.tillableTiles()[0]!;
const lit = (id: string, x = 5, y = 5): LitBomb => ({
  x,
  y,
  id,
  fuse: FUSE_SECONDS,
});

describe("the bomb table", () => {
  it("has radius 1, 2, 3 and Forge prices 450, 1000, 1600", () => {
    expect(BOMBS.map((b) => [b.id, b.radius, b.price])).toEqual([
      ["cherry-bomb", 1, 450],
      ["bomb", 2, 1000],
      ["mega-bomb", 3, 1600],
    ]);
    for (const b of BOMBS) {
      expect(itemById(b.id)?.buyPrice).toBe(b.price);
      expect(placeableById(b.id)).toMatchObject({
        kind: "bomb",
        pickUp: "none",
      });
    }
  });

  it("may be placed on the farm, mine floors and the wilds, not indoors, in camps or in the village", () => {
    for (const tag of ["farm", "mine", "wild"] as const)
      expect(mayPlaceOn("bomb", tag)).toBe(true);
    for (const tag of ["greenhouse", "house", "cellar", "camp"] as const)
      expect(mayPlaceOn("bomb", tag)).toBe(false);
    expect(mayPlaceOn("bomb", undefined)).toBe(false);
  });

  it("can be bought with gold", () => {
    const g = newGame();
    g.money = 1000;
    expect(buy(g.inventory, g, "bomb")).toBe(true);
    expect(g.money).toBe(0);
    expect(buy(g.inventory, g, "mega-bomb")).toBe(false);
  });
});

describe("lighting a bomb", () => {
  it("uses up the item and starts a 1.5 second fuse", () => {
    const g = newGame();
    g.inventory.add("bomb", 1);
    const r = placeBomb(g, farm, "farm", tile.x, tile.y, "bomb");
    expect(r.ok && r.bomb.fuse).toBe(1.5);
    expect(g.inventory.count("bomb")).toBe(0);
    expect(g.placed.count).toBe(0);
  });

  it("is refused without the item, in a camp or indoors", () => {
    const g = newGame();
    expect(placeBomb(g, farm, "farm", tile.x, tile.y, "bomb").ok).toBe(false);
    g.inventory.add("bomb", 1);
    const camp = maps.get("mine");
    expect(placeBomb(g, camp, mineMapId(10), 3, 3, "bomb").ok).toBe(false);
    expect(g.inventory.count("bomb")).toBe(1);
    expect(placeBomb(g, farm, "greenhouse", tile.x, tile.y, "bomb").ok).toBe(
      false,
    );
  });

  it("is refused in Hearthwell", () => {
    const g = newGame();
    g.inventory.add("bomb", 1);
    const village = maps.get("hearthwell");
    expect(placeBomb(g, village, "hearthwell", 3, 3, "bomb").ok).toBe(false);
  });

  it("counts down and comes due once", () => {
    const list = [lit("bomb")];
    expect(tickBombs(list, 1)).toEqual([]);
    expect(tickBombs(list, 0.6)).toHaveLength(1);
    expect(list).toHaveLength(0);
  });
});

describe("the blast", () => {
  it("is a circle of tile distance", () => {
    expect(inBlast(5, 5, 2, 7, 5)).toBe(true);
    expect(inBlast(5, 5, 2, 7, 6)).toBe(false);
    expect(inBlast(5, 5, 1, 6, 6)).toBe(false);
  });

  it("breaks rocks in the circle with their drops and gives no experience", () => {
    const g = newGame();
    const rocks = new Rocks([
      { x: 5, y: 6 },
      { x: 7, y: 5 },
      { x: 9, y: 9 },
    ]);
    const xp = g.skills.xpOf("mining");
    const r = blastRocks(g, rocks, undefined, lit("bomb"), () => 0);
    expect(r.broken).toBe(2);
    expect(rocks.at(9, 9)).toBeDefined();
    expect(g.inventory.count("stone")).toBeGreaterThan(0);
    expect(g.skills.xpOf("mining")).toBe(xp);
  });

  it("keeps the ore gates: an ore above the Mining level stays", () => {
    expect(rockMinLevel("iron")).toBe(2);
    expect(rockMinLevel("gold")).toBe(5);
    expect(rockMinLevel("stone")).toBe(0);
    const g = newGame();
    const rocks = new Rocks([
      { x: 5, y: 5, kind: "iron" },
      { x: 6, y: 5, kind: "copper" },
    ]);
    blastRocks(g, rocks, undefined, lit("mega-bomb"), () => 0);
    expect(rocks.at(5, 5)).toBeDefined();
    expect(rocks.at(6, 5)).toBeUndefined();
  });

  it("leaves a rock standing when its drop does not fit the pack", () => {
    const g = newGame();
    for (let i = 0; i < 200; i++) g.inventory.add(`junk-${i}`, 1);
    const rocks = new Rocks([{ x: 5, y: 5 }]);
    const r = blastRocks(g, rocks, undefined, lit("cherry-bomb"), () => 0);
    expect(r.broken + rocks.count).toBe(1);
  });

  it("hurts monsters in the circle by the bomb's damage", () => {
    const near = newCreature(1, "gloop", 5 * 16 + 8, 5 * 16 + 8);
    const far = newCreature(2, "gloop", 12 * 16, 12 * 16);
    const hp = near.hp;
    const beaten = blastCreatures([near, far], lit("cherry-bomb"));
    expect(near.hp).toBe(hp - bombById("cherry-bomb")!.monsterDamage);
    expect(far.hp).toBe(hp);
    expect(beaten.length).toBe(near.hp <= 0 ? 1 : 0);
    expect(blastCreatures([far], lit("mega-bomb"))).toEqual([]);
  });

  it("hurts the player by a share of maximum health, never to death", () => {
    const g = newGame();
    const h = g.combat.health;
    const max = h.max;
    expect(blastPlayer(h, lit("bomb"), { x: 5, y: 5 })).toBe(
      Math.round(max * 0.2),
    );
    expect(blastPlayer(h, lit("bomb"), { x: 20, y: 20 })).toBe(0);
    for (let i = 0; i < 10; i++)
      blastPlayer(h, lit("mega-bomb"), { x: 5, y: 5 });
    expect(h.current).toBe(1);
  });
});
