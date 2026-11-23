import {
  baseKind,
  creatureById,
  creatureTile,
  creatureXp,
  rollDrops,
  type Creature,
  type CreatureDef,
} from "./creatures";
import { DIAMOND, monsterDiamond } from "./gems";
import { itemById } from "./items";
import { dropGoods } from "./ground";
import { mapDrops } from "./mapcreatures";
import type { GameState } from "./save";

/** What came of beating a creature (note 106, step 4). */
export interface Defeat {
  name: string;
  /** The new combat level, or undefined when none was gained. */
  levelUp: number | undefined;
  /** Goods that went into the pack, as "2 slime". */
  got: string[];
  /** True when the kill revealed a mine ladder. */
  ladder: boolean;
}

/**
 * A creature is beaten: its goods, the kill tally, combat XP and a ladder
 * roll. `floor` is the mine floor it fell on, if any. Returns undefined for a
 * kind with no definition (nothing is paid out).
 */
export function defeatCreature(
  state: GameState,
  c: Creature,
  mapId: string,
  floor: number | undefined,
  tileSize: number,
  rng: () => number,
): Defeat | undefined {
  const def = creatureById(c.kind);
  if (!def) return undefined;
  // A rare creature counts toward its base creature's slayer goal (note 22).
  state.combat.noteKill(baseKind(c.kind));
  if (def.rare && !state.combat.rareFound.includes(c.kind))
    state.combat.rareFound.push(c.kind);
  const dangerous =
    floor !== undefined &&
    state.mines.today(floor, state.day.clock.day)?.dangerous === true;
  const levelUp = state.skills.gain("combat", creatureXp(c));
  const got: string[] = [];
  const bonus =
    floor !== undefined
      ? state.mines.killBonus(floor, state.day.clock.day)
      : { extraKill: false, extraDrop: false };
  if (bonus.extraKill) state.combat.noteKill(baseKind(c.kind));
  // Rings that answer a kill (note 37): vampire heals, savage and warrior start a buff.
  const eq = state.equipment;
  const heal = eq.healOnKill();
  if (heal > 0) state.combat.health.heal(heal);
  state.combat.startKillBuffs(eq.killSpeed(), eq.killDamage());
  // A map's spawn table adds drops to every creature beaten there (note 73: Mahogany Seed).
  const extra: CreatureDef = { ...def, drops: mapDrops(mapId) };
  const rolls = [
    ...rollDrops(def, rng, dangerous),
    ...rollDrops(extra, rng, dangerous),
    ...(bonus.extraDrop ? rollDrops(def, rng, dangerous) : []),
    // The burglar ring rolls the creature's own drops a second time (note 37).
    ...(eq.dropsTwice() ? rollDrops(def, rng, dangerous) : []),
    // A rare Diamond from any monster, once the bottom of the mines is reached (note 83).
    ...(monsterDiamond(state.mines.deepest, rng)
      ? [{ id: DIAMOND.id, count: 1 }]
      : []),
  ];
  const tile = creatureTile(c, tileSize);
  // Drops lie on the ground where the creature fell.
  for (const d of rolls) {
    dropGoods(state, floor, tile.x, tile.y, d.id, d.count);
    got.push(`${d.count} ${itemById(d.id)?.name.toLowerCase() ?? d.id}`);
  }
  const ladder =
    floor !== undefined
      ? state.mines.creatureBeaten(
          floor,
          state.day.clock.day,
          tile.x,
          tile.y,
          rng,
        )
      : false;
  return { name: def.name, levelUp, got, ladder };
}

/** The line shown after a creature is beaten. */
export function defeatMessage(r: Defeat): string {
  return `${r.name} beaten.${r.levelUp ? ` Combat is now level ${r.levelUp}.` : ""}${r.got.length ? ` Dropped ${r.got.join(", ")}.` : ""}${r.ladder ? " A ladder is revealed!" : ""}`;
}
