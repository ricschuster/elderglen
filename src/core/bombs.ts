import bombData from "../content/bombs.json";
import { isClear } from "./actions";
import type { Creature } from "./creatures";
import { creatureTile, hurtCreature } from "./creatures";
import { canStand } from "./furniture";
import type { Health } from "./combat";
import type { FarmMap } from "./map";
import { drops } from "./mining";
import { noteGathered } from "./quests";
import type { RockKind, Rocks } from "./rocks";
import { mayPlaceOn, placeTag } from "./placeables";
import type { GameState } from "./save";
import { SPAWN_TABLES } from "./spawns";

/**
 * Bombs (`docs/design/89_placement_system.md`, "Bombs"). A bomb is a placeable
 * that is lit, not saved and not lifted: it goes off after a short fuse. The
 * blast is a circle of tiles (tile distance, no line of sight). It breaks rock
 * and ore nodes the player's Mining level already allows, hurts every monster
 * and the player in the circle (never lethal to the player), and touches
 * nothing else. No Mining experience. Radius, damage and prices are
 * placeholders from memory of Stardew (SC-150). Pure rules.
 */
export interface BombDef {
  id: string;
  name: string;
  /** Blast radius in tiles. */
  radius: number;
  /** Damage to each monster in the circle. */
  monsterDamage: number;
  /** Damage to the player, as a percent of maximum health. */
  playerPercent: number;
  /** Forge price in gold. */
  price: number;
}

export const BOMBS = bombData as readonly BombDef[];

/** Seconds from lighting to the blast (placeholder). */
export const FUSE_SECONDS = 1.5;

export const bombById = (id: string | undefined): BombDef | undefined =>
  BOMBS.find((b) => b.id === id);

export const isBomb = (id: string | undefined): boolean =>
  bombById(id) !== undefined;

/** A bomb that is lit and counting down. Never saved. */
export interface LitBomb {
  x: number;
  y: number;
  id: string;
  /** Seconds left on the fuse. */
  fuse: number;
}

const no = (reason: string) => ({ ok: false as const, reason });

/**
 * Light a bomb from the backpack on the faced tile. The map must allow it (the
 * place table: not in Hearthwell, indoors or in camps) and the tile must be
 * clear ground on the farm or open floor elsewhere. Free. Returns the lit bomb
 * on success, and the caller keeps it on a list and ticks it with `tickBombs`.
 */
export function placeBomb(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
  id: string,
  occupied: (x: number, y: number) => boolean = () => false,
): { ok: true; bomb: LitBomb } | { ok: false; reason: string } {
  if (!isBomb(id)) return no("not a bomb");
  if (g.inventory.count(id) < 1) return no("no bomb");
  const tag = placeTag(map, mapId);
  const free =
    tag === "farm" ? isClear(g, map, x, y) : canStand(g, map, mapId, x, y);
  if (!mayPlaceOn(id, tag) || !free || occupied(x, y))
    return no("cannot place here");
  g.inventory.remove(id);
  return { ok: true, bomb: { x, y, id, fuse: FUSE_SECONDS } };
}

/** Count the fuses down by `dt` seconds. Returns the bombs now due, removed from the list. */
export function tickBombs(lit: LitBomb[], dt: number): LitBomb[] {
  const due: LitBomb[] = [];
  for (const b of lit) {
    b.fuse -= dt;
    if (b.fuse <= 0) due.push(b);
  }
  for (const b of due) lit.splice(lit.indexOf(b), 1);
  return due;
}

/** True when a tile is inside a blast centred on (cx, cy). Tile distance, as lights use. */
export const inBlast = (
  cx: number,
  cy: number,
  radius: number,
  x: number,
  y: number,
): boolean => Math.hypot(cx - x, cy - y) <= radius;

/**
 * The Mining level a rock kind needs before it spawns, read from the nightly
 * spawn tables (note 78: iron 2, gold 5, Hearthsilver 8). A bomb keeps the same
 * gate: it breaks a node only where the player's level already allows it.
 */
export function rockMinLevel(kind: RockKind): number {
  const spawnKind =
    kind === "stone" ? "rock" : kind === "hard" ? "hard-rock" : kind;
  let level = 0;
  for (const table of Object.values(SPAWN_TABLES))
    for (const k of table.kinds)
      if (k.kind === spawnKind) level = Math.max(level, k.minLevel ?? 0);
  return level;
}

export interface BlastRocks {
  /** Rocks broken. */
  broken: number;
  /** What they gave, summed by item. */
  items: Record<string, number>;
  /** A ladder was revealed under a broken rock. */
  ladder: boolean;
}

/**
 * Break every rock in the circle that the Mining level allows, with the drops a
 * pickaxe swing would give and no experience. A drop that does not fit the
 * backpack leaves that rock standing. On a mine floor a broken rock may reveal
 * the ladder.
 */
export function blastRocks(
  g: GameState,
  rocks: Rocks,
  floor: number | undefined,
  bomb: LitBomb,
  random: () => number = Math.random,
): BlastRocks {
  const def = bombById(bomb.id);
  const out: BlastRocks = { broken: 0, items: {}, ladder: false };
  if (!def) return out;
  const level = g.skills.level("mining");
  for (const rock of [...rocks.each()]) {
    if (!inBlast(bomb.x, bomb.y, def.radius, rock.x, rock.y)) continue;
    if (rockMinLevel(rock.kind) > level) continue;
    const drop = drops(
      rock.kind,
      level,
      g.skills.has("prospector"),
      random,
      floor,
    );
    if (g.inventory.room(drop.id) < drop.count) continue;
    rocks.remove(rock.x, rock.y);
    g.inventory.add(drop.id, drop.count);
    noteGathered(g, drop.id, drop.count);
    out.broken += 1;
    out.items[drop.id] = (out.items[drop.id] ?? 0) + drop.count;
    if (
      floor !== undefined &&
      g.mines.rockBroken(
        floor,
        g.day.clock.day,
        rock.x,
        rock.y,
        random,
        g.combat.noCreatures,
      )
    )
      out.ladder = true;
  }
  return out;
}

/**
 * Hurt every monster whose tile is in the circle. Returns those beaten, which
 * the caller removes and rewards as for a weapon kill.
 */
export function blastCreatures(
  creatures: readonly Creature[],
  bomb: LitBomb,
  tileSize = 16,
): Creature[] {
  const def = bombById(bomb.id);
  if (!def) return [];
  const beaten: Creature[] = [];
  for (const c of creatures) {
    const t = creatureTile(c, tileSize);
    if (!inBlast(bomb.x, bomb.y, def.radius, t.x, t.y)) continue;
    if (hurtCreature(c, def.monsterDamage)) beaten.push(c);
  }
  return beaten;
}

/**
 * Hurt the player if their tile is in the circle: a share of maximum health,
 * never lethal (it stops at 1). Grace does not apply, since the player lit it.
 * Returns the health lost.
 */
export function blastPlayer(
  health: Health,
  bomb: LitBomb,
  at: { x: number; y: number },
): number {
  const def = bombById(bomb.id);
  if (!def || !inBlast(bomb.x, bomb.y, def.radius, at.x, at.y)) return 0;
  const share = Math.max(1, Math.round((health.max * def.playerPercent) / 100));
  const lost = Math.max(0, Math.min(share, health.current - 1));
  health.current -= lost;
  return lost;
}
