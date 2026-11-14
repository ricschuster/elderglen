import mazeData from "../content/maze.json";
import mazeEvenData from "../content/maze-even.json";
import lineData from "../content/hollow-eve-lines.json";
import { dateOf } from "./calendar";
import { hatById } from "./hats";
import { itemById } from "./items";
import type { GameState } from "./save";

/**
 * The Hollow Eve lantern maze (`docs/design/66_fall_winter_festivals_and_farm_cave.md`).
 * One hedge maze, the same every year, with no timer and nothing that hurts.
 * Stationary scares and a talker add a line when the player steps beside them,
 * and a chest sits at the end. The layout is data in `src/content/maze.json`.
 */
export interface MazeData {
  rows: string[];
  /** A hedge tile left open: the shorter way to the chest, never the only one. */
  gap: Cell;
  scares: Record<string, string>;
  talkers: Record<string, string>;
  chestHat: string;
  sack: { id: string; count: number }[];
}

export const MAZE = mazeData as MazeData;

/** The even-year maze (note 82, note 66 decision 3): larger, more scares, a better sack. */
export const MAZE_EVEN = mazeEvenData as MazeData;

/** The maze for a year: odd years the small one, even years the large one. */
export const mazeForYear = (year: number): MazeData =>
  year % 2 === 0 ? MAZE_EVEN : MAZE;

/**
 * The one line a villager says from a niche or a corner of the maze when
 * talked to (note 82; placeholder text, `src/content/hollow-eve-lines.json`).
 */
export const nicheLine = (villagerId: string): string | undefined =>
  (lineData.lines as Record<string, string>)[villagerId];

export interface Cell {
  x: number;
  y: number;
}

const find = (ch: string): Cell => {
  for (let y = 0; y < MAZE.rows.length; y++) {
    const x = MAZE.rows[y]!.indexOf(ch);
    if (x >= 0) return { x, y };
  }
  throw new Error(`maze has no ${ch}`);
};

export const mazeStart = (): Cell => find("S");
export const mazeChest = (): Cell => find("E");
export const mazeWidth = () => MAZE.rows[0]!.length;
export const mazeHeight = () => MAZE.rows.length;

export const cellAt = (x: number, y: number): string =>
  x === MAZE.gap.x && y === MAZE.gap.y ? "." : (MAZE.rows[y]?.[x] ?? "#");

/** True when the player can stand on a tile: anything but a wall or a scare. */
export const walkable = (x: number, y: number): boolean => {
  const c = cellAt(x, y);
  return c !== "#" && !(c in MAZE.scares) && !(c in MAZE.talkers);
};

/** A line for the scare or talker next to a tile, if any. Each is stationary and harmless. */
export function lineAt(x: number, y: number): string | undefined {
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const) {
    const c = cellAt(x + dx, y + dy);
    const line = MAZE.scares[c] ?? MAZE.talkers[c];
    if (line) return line;
  }
  return undefined;
}

/** Step one tile. Returns the new tile (the same if a wall blocks), or the old tile unchanged. */
export function step(from: Cell, dx: number, dy: number): Cell {
  const to = { x: from.x + dx, y: from.y + dy };
  return walkable(to.x, to.y) ? to : from;
}

export const atChest = (c: Cell) => {
  const e = mazeChest();
  return c.x === e.x && c.y === e.y;
};

const chestKey = (day: number) => `hollow-eve-chest:${dateOf(day).year}`;

export const chestOpened = (g: GameState) =>
  g.festivalsJoined.includes(chestKey(g.day.clock.day));

/**
 * Open the chest at the end. The first time it holds the hat, and each later
 * year a sack of forage and fall goods (about 500g in odd years, about 1000g
 * in even years, when the larger maze is walked). Once a year. Returns a
 * line for the player: what was found, or why not. A full pack leaves the
 * chest shut, so nothing is lost.
 */
export function openChest(g: GameState): string {
  if (chestOpened(g))
    return "The chest is empty. You have had this year's prize.";
  const maze = mazeForYear(dateOf(g.day.clock.day).year);
  if (
    g.wardrobe.has(maze.chestHat) &&
    maze.sack.some((s) => g.inventory.room(s.id) < s.count)
  )
    return "Your pack is too full for the sack. Make room and come back.";
  g.festivalsJoined.push(chestKey(g.day.clock.day));
  if (g.wardrobe.add(maze.chestHat))
    return `The chest holds a ${hatById(maze.chestHat)?.name ?? "hat"}.`;
  const parts: string[] = [];
  for (const { id, count } of maze.sack) {
    g.inventory.add(id, count);
    parts.push(`${count} ${itemById(id)?.name.toLowerCase() ?? id}`);
  }
  return `The chest holds a sack: ${parts.join(", ")}.`;
}

/** Sell value of the sack, for tuning. */
export const sackValue = (maze: MazeData = MAZE) =>
  maze.sack.reduce((n, s) => n + (itemById(s.id)?.sellPrice ?? 0) * s.count, 0);
