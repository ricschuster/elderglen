import type { Outcome } from "./actions";
import { GEODE_SHARE, geodeDrop, geodeKindForFloor } from "./geodes";
import {
  COAL,
  COPPER_ORE,
  GOLD_ORE,
  HEARTHSILVER_ORE,
  IRON_ORE,
  QUARTZ,
  STONE,
} from "./ore";
import { swingCost } from "./upgrades";
import type { GameState } from "./save";
import { swingsToBreak, type RockKind, type Rocks } from "./rocks";

/** Energy for a pickaxe swing at tier 0 (note 22). The mining level saves some, as farming does for the hoe. */
export const PICKAXE_ENERGY = 2;

/** Mining XP for breaking a rock of each kind. Ours, placeholders ("a few XP, ore gives more"). */
export const ROCK_XP: Record<RockKind, number> = {
  stone: 2,
  copper: 5,
  coal: 4,
  quartz: 3,
  geode: 4,
  iron: 7,
  gold: 10,
  hearthsilver: 14,
};

/** A node gives 1 ore, and this chance plus a bit a level that it gives 2 or 3 (note 22, placeholder). */
export const EXTRA_ORE_BASE = 0.25;
export const EXTRA_ORE_PER_LEVEL = 0.03;
/** Prospectors get one more ore from a node this often. */
export const PROSPECTOR_CHANCE = 0.25;

export interface Drop {
  id: string;
  count: number;
}

/** What a broken rock gives. Pure, given the rolls. */
export function drops(
  kind: RockKind,
  miningLevel: number,
  prospector: boolean,
  random: () => number,
  floor?: number,
): Drop {
  if (kind === "stone") return { id: STONE, count: random() < 0.5 ? 1 : 2 };
  if (kind === "geode") return { id: geodeDrop(floor, random), count: 1 };
  if (kind === "quartz") return { id: QUARTZ, count: 1 };
  if (kind === "coal") return { id: COAL, count: 1 + (random() < 0.3 ? 1 : 0) };
  if (kind === "hearthsilver") {
    // Hearthsilver gives 1 to 2 ore a node (note 22); Prospector adds one.
    let n = random() < 0.5 ? 1 : 2;
    if (prospector && random() < PROSPECTOR_CHANCE) n += 1;
    return { id: HEARTHSILVER_ORE, count: n };
  }
  let count = 1;
  if (random() < EXTRA_ORE_BASE + EXTRA_ORE_PER_LEVEL * miningLevel)
    count = random() < 0.5 ? 2 : 3;
  if (prospector && random() < PROSPECTOR_CHANCE) count += 1;
  return {
    id: kind === "iron" ? IRON_ORE : kind === "gold" ? GOLD_ORE : COPPER_ORE,
    count,
  };
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

/**
 * Swing the pickaxe at a rock. `floor` is the mine floor the player is on, or
 * undefined on the farm, where the rocks are `g.rocks`. A rock breaks after
 * its swings (`swingsToBreak`), gives its drop, and on a mine floor may
 * reveal the ladder. A full backpack refuses the breaking swing, so nothing is
 * ever lost.
 */
export function mine(
  g: GameState,
  x: number,
  y: number,
  floor: number | undefined,
  random: () => number = Math.random,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const day = g.day.clock.day;
  const rocks: Rocks =
    floor === undefined ? g.rocks : g.mines.visit(floor, day).rocks;
  const rock = rocks.at(x, y);
  if (!rock) return fail("nothing to mine");
  const breaks = rock.hits + 1 >= swingsToBreak(rock.kind, g.toolTiers.pickaxe);
  const drop = breaks
    ? drops(
        rock.kind,
        g.skills.level("mining"),
        g.skills.has("prospector"),
        random,
        floor,
      )
    : undefined;
  if (drop && g.inventory.room(drop.id) < drop.count)
    return fail("backpack full");
  g.day.act(
    swingCost(PICKAXE_ENERGY, g.toolTiers.pickaxe, g.skills.level("mining")),
    0,
  );
  if (!drop) {
    rock.hits += 1;
    return { ok: true };
  }
  rocks.remove(x, y);
  g.inventory.add(drop.id, drop.count);
  // Rockhounds also turn up a geode in plain rock, as often as the nodes do (note 22).
  if (
    floor !== undefined &&
    rock.kind === "stone" &&
    g.skills.has("rockhound") &&
    random() < GEODE_SHARE
  )
    g.inventory.add(geodeKindForFloor(floor));
  const ladder =
    floor !== undefined && g.mines.rockBroken(floor, day, x, y, random);
  const level = g.skills.gain("mining", ROCK_XP[rock.kind]);
  return {
    ok: true,
    item: drop.id,
    ladder,
    levelUp: level ? { skill: "mining", level } : undefined,
  };
}
