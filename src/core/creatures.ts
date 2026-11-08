import creatureData from "../content/creatures.json";
import type { Vec } from "./movement";

/**
 * The first creatures of the mines (`docs/design/22_mines.md`, "Creatures" and
 * "The rules of a fight"). Pure rules, free of Phaser: a creature is a point
 * with a small state machine, stepped by the scene each frame. Every attack has
 * a wind up the player can see, nothing is faster than walking, and a creature
 * that hits steps back and pauses. Content is `src/content/creatures.json`.
 */

export interface DropDef {
  id: string;
  chance: number;
  min: number;
  max: number;
}

export interface CreatureDef {
  id: string;
  name: string;
  /** "shuffler" walks at the player, "drifter" floats in slow loops. */
  behaviour: "shuffler" | "drifter";
  /** The mine bands (1 to 3) the creature lives in. */
  bands: number[];
  hp: number;
  /** Health a touch costs. */
  touch: number;
  /** Pixels a second. Walking is 80, so no creature outruns the player. */
  speed: number;
  /** Tiles at which it notices the player. */
  sight: number;
  /** Tiles at which it starts an attack. */
  reach: number;
  /** Seconds of wind up before a hit lands. */
  windup: number;
  /** Seconds of pause after a hit. */
  recover: number;
  drops: DropDef[];
}

export const CREATURES = creatureData as CreatureDef[];

export const creatureById = (id: string): CreatureDef | undefined =>
  CREATURES.find((c) => c.id === id);

/** Seconds a creature stays dazed after a hit from a weapon (placeholder). */
export const STAGGER = 0.4;
/** Tiles away that make a creature lose interest, and how long that takes in seconds (note 22). */
export const LOSE_TILES = 6;
export const LOSE_SECONDS = 3;
/** Share of a wind up that assist adds (note 22: assist widens telegraphs). */
export const ASSIST_WINDUP = 1.5;
/** Pixels a hit pushes the creature back, as a short step. */
const STEP_BACK = 14;

export type CreatureState =
  "wander" | "chase" | "windup" | "recover" | "stagger";

export interface Creature {
  uid: number;
  kind: string;
  /** Feet position in world pixels, like the player's. */
  x: number;
  y: number;
  hp: number;
  state: CreatureState;
  /** Seconds left in the state, where it has a timer. */
  t: number;
  /** Direction of the current wander, or the dust moth's loop angle. */
  angle: number;
  /** Seconds the player has been out of range (loses interest at `LOSE_SECONDS`). */
  away: number;
}

export interface CreatureSave {
  uid: number;
  kind: string;
  x: number;
  y: number;
  hp: number;
}

/** The creatures of a band, in the order they are listed in the data. */
export const creaturesOfBand = (band: number): CreatureDef[] =>
  CREATURES.filter((c) => c.bands.includes(band));

/** The mine band (1 to 3) a floor is in. Three bands of 40. */
export const bandNumber = (floor: number): number =>
  floor <= 40 ? 1 : floor <= 80 ? 2 : 3;

/** True on a floor that has creatures at all, so health shows there (note 22, decision 17). */
export const floorHasCreatures = (floor: number): boolean =>
  creaturesOfBand(bandNumber(floor)).length > 0;

export function newCreature(
  uid: number,
  kind: string,
  x: number,
  y: number,
): Creature {
  const def = creatureById(kind);
  return {
    uid,
    kind,
    x,
    y,
    hp: def?.hp ?? 1,
    state: "wander",
    t: 0,
    angle: 0,
    away: 0,
  };
}

export const saveCreature = (c: Creature): CreatureSave => ({
  uid: c.uid,
  kind: c.kind,
  x: c.x,
  y: c.y,
  hp: c.hp,
});

export function loadCreature(s: CreatureSave): Creature | undefined {
  const def = creatureById(s.kind);
  if (!def || !Number.isFinite(s.x) || !Number.isFinite(s.y)) return undefined;
  const c = newCreature(s.uid, s.kind, s.x, s.y);
  c.hp = Math.min(Math.max(Math.round(s.hp), 1), def.hp);
  return c;
}

/** How many creatures a floor holds: 2 to 5 in the first band (placeholder, note 22). */
export function creatureCount(band: number, random: () => number): number {
  const [lo, hi] = band === 1 ? [2, 5] : [4, 8];
  return lo + Math.floor(random() * (hi - lo + 1));
}

/**
 * Where creatures start on a floor: open tiles that hold no rock, wall, ladder
 * or the way up, at least `keepAway` tiles from the arrival. A creature never
 * spawns on a stair or a ladder (note 22). Positions are the tile's feet point.
 */
export function spawnCreatures(
  floor: number,
  random: () => number,
  open: (x: number, y: number) => boolean,
  width: number,
  height: number,
  arrive: Vec,
  tileSize = 16,
  keepAway = 6,
): Creature[] {
  const kinds = creaturesOfBand(bandNumber(floor));
  if (kinds.length === 0) return [];
  const out: Creature[] = [];
  const used = new Set<string>();
  const want = creatureCount(bandNumber(floor), random);
  for (let tries = 0; out.length < want && tries < 600; tries++) {
    const x = 1 + Math.floor(random() * (width - 2));
    const y = 1 + Math.floor(random() * (height - 2));
    if (!open(x, y) || used.has(`${x},${y}`)) continue;
    if (Math.max(Math.abs(x - arrive.x), Math.abs(y - arrive.y)) < keepAway)
      continue;
    used.add(`${x},${y}`);
    const kind = kinds[Math.floor(random() * kinds.length)]!;
    out.push(
      newCreature(
        out.length + 1,
        kind.id,
        (x + 0.5) * tileSize,
        (y + 1) * tileSize - 2,
      ),
    );
  }
  return out;
}

export interface StepWorld {
  player: Vec;
  /** The creature's feet box, used to walk without entering walls. */
  walk: (c: Creature, dx: number, dy: number) => Vec;
  /** A random number in 0..1. */
  random: () => number;
  assist: boolean;
  tileSize: number;
}

export interface StepResult {
  /** Health the player loses from a hit that landed this step, if any. */
  hit?: number;
}

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** Advance one creature by `dt` seconds. Mutates it. */
export function stepCreature(
  c: Creature,
  dt: number,
  w: StepWorld,
): StepResult {
  const def = creatureById(c.kind);
  if (!def) return {};
  const d = dist(c, w.player);
  const dir =
    d > 0
      ? { x: (w.player.x - c.x) / d, y: (w.player.y - c.y) / d }
      : { x: 0, y: 0 };
  const go = (vx: number, vy: number) => {
    const next = w.walk(c, vx * dt, vy * dt);
    c.x = next.x;
    c.y = next.y;
  };

  if (c.state === "stagger" || c.state === "recover") {
    c.t -= dt;
    if (c.state === "recover" && c.t > def.recover - 0.3)
      // A creature that hits steps back and pauses.
      go((-dir.x * STEP_BACK) / 0.3, (-dir.y * STEP_BACK) / 0.3);
    if (c.t <= 0) c.state = "wander";
    return {};
  }

  if (c.state === "windup") {
    c.t -= dt;
    if (c.t > 0) return {};
    // The hit lands only if the player is still close: walk away from a wind up.
    const near = d <= (def.reach + 0.3) * w.tileSize;
    c.state = "recover";
    c.t = def.recover;
    c.away = 0;
    return near ? { hit: def.touch } : {};
  }

  // Wander or chase.
  const sees = d <= def.sight * w.tileSize;
  if (c.state === "wander" && sees) c.state = "chase";
  if (c.state === "chase") {
    if (d > LOSE_TILES * w.tileSize) {
      c.away += dt;
      if (c.away >= LOSE_SECONDS) {
        c.state = "wander";
        c.away = 0;
      }
    } else c.away = 0;
  }

  if (c.state === "chase" && d <= def.reach * w.tileSize) {
    c.state = "windup";
    c.t = def.windup * (w.assist ? ASSIST_WINDUP : 1);
    return {};
  }

  if (def.behaviour === "shuffler") {
    if (c.state === "chase") go(dir.x * def.speed, dir.y * def.speed);
    else {
      c.t -= dt;
      if (c.t <= 0) {
        c.t = 1 + w.random() * 1.5;
        c.angle = w.random() * Math.PI * 2;
      }
      go(
        Math.cos(c.angle) * def.speed * 0.4,
        Math.sin(c.angle) * def.speed * 0.4,
      );
    }
  } else {
    // A drifter loops lazily and leans toward the player once it notices them.
    c.angle += 1.2 * dt;
    const lean = c.state === "chase" ? 0.5 : 0;
    go(
      (Math.cos(c.angle) * (1 - lean) + dir.x * lean) * def.speed,
      (Math.sin(c.angle) * (1 - lean) + dir.y * lean) * def.speed,
    );
  }
  return {};
}

/** Hit a creature for `damage`. Returns true if it is now beaten. A hit daze pauses it, which breaks any wind up. */
export function hurtCreature(c: Creature, damage: number): boolean {
  c.hp -= damage;
  if (c.hp <= 0) return true;
  c.state = "stagger";
  c.t = STAGGER;
  return false;
}

/** What a beaten creature leaves: each drop rolls its chance, then a count in its range. */
export function rollDrops(
  def: CreatureDef,
  random: () => number,
): { id: string; count: number }[] {
  const out: { id: string; count: number }[] = [];
  for (const d of def.drops) {
    if (random() >= d.chance) continue;
    out.push({
      id: d.id,
      count: d.min + Math.floor(random() * (d.max - d.min + 1)),
    });
  }
  return out;
}

/** The tile (x, y) a creature stands in. */
export const creatureTile = (c: Creature, tileSize = 16): Vec => ({
  x: Math.floor(c.x / tileSize),
  y: Math.floor((c.y - 1) / tileSize),
});
