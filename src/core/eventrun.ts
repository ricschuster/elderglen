import { dueEvents, playable, type Cmd, type HeartEvent } from "./heartevents";
import type { GameState } from "./save";
import { areaRect } from "./map";
import { villagerById } from "./villagers";
import type { Weather } from "./weather";
import stageData from "../content/heart-event-stages.json";
import { mapFiles } from "../content/maps";

/**
 * The heart event runner's pure half (`docs/design/62_heart_events.md`, #600
 * slice 2): which event starts on a map, and the command
 * sequencer. The scene (`HeartEventScene`) draws what the sequencer hands it.
 */

/** One stage-table row: the map a place plays on and its trigger area (note 62, point 6). */
interface StageRow {
  map: string;
  area: string;
}
const STAGE_ROWS = stageData.places as Record<string, StageRow>;

/** Whether a tile is inside a place's area on this map: the whole map for an interior, else the zone. */
export function inArea(
  place: string,
  mapId: string,
  x: number,
  y: number,
): boolean {
  const row = STAGE_ROWS[place];
  if (!row || row.map !== mapId) return false;
  if (row.area === "interior") return true;
  const json = mapFiles[mapId];
  const r = json ? areaRect(json, row.area) : undefined;
  return !!r && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

/** Place ids (`hw:store`) whose area holds the tile, on this map. */
export function placesAt(mapId: string, x: number, y: number): string[] {
  return Object.keys(STAGE_ROWS).filter((p) => inArea(p, mapId, x, y));
}

/**
 * The event that starts when the player is in an area, if any: the tile is inside the event's
 * area, and `dueEvents` agrees (window, hearts, conditions, one a day). The scene calls this on
 * entering an area (and when the clock moves on inside one), not every frame.
 */
export function eventAtTile(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
  ctx: { day: number; weather: Weather; minute?: number },
): HeartEvent | undefined {
  for (const place of placesAt(mapId, x, y)) {
    const e = dueEvents(g, { ...ctx, place })[0];
    if (e) return e;
  }
  return undefined;
}

/** Display name of a scene actor. */
export const actorName = (who: string): string =>
  who === "player" ? "You" : (villagerById(who)?.name ?? who);

/** What the sequencer needs to read to decide an `if`. */
export interface RunWorld {
  flag(f: string): boolean;
  hearts(who: string): number;
}

/**
 * Steps through a scene's command list. `current()` is the next command that
 * needs showing; flow commands (`label`, `jump`, `if`, `end`) are resolved
 * inside. The scene calls `advance()` when it has finished showing the
 * current command (a line read, a wait over, a fade done), or `choose(i)` for
 * a `choose`. `skip()` ends the run at once.
 */
export class SceneRun {
  private index = 0;
  private ended = false;
  private skipped = false;
  private readonly labels = new Map<string, number>();

  constructor(
    private readonly cmds: readonly Cmd[],
    private readonly world: RunWorld,
  ) {
    cmds.forEach((c, i) => {
      if (c.cmd === "label") this.labels.set(c.name, i);
    });
    this.settle();
  }

  /** Build the run for an event; on replay the Result group is stripped. */
  static of(e: HeartEvent, replay: boolean, world: RunWorld): SceneRun {
    return new SceneRun(playable(e, replay), world);
  }

  /** The command to show now, or undefined when the scene is over. */
  current(): Cmd | undefined {
    return this.ended ? undefined : this.cmds[this.index];
  }

  get finished(): boolean {
    return this.ended;
  }
  get wasSkipped(): boolean {
    return this.skipped;
  }
  /** Command index, for tests and logs. */
  get position(): number {
    return this.index;
  }

  advance(): void {
    if (this.ended) return;
    this.index += 1;
    this.settle();
  }

  /** Take answer `i` of the current `choose`. A bad index does nothing. */
  choose(i: number): void {
    const c = this.current();
    if (c?.cmd !== "choose") return;
    const a = c.answers[i];
    if (!a) return;
    this.goto(a.goto);
  }

  skip(): void {
    this.ended = true;
    this.skipped = true;
  }

  private goto(label: string): void {
    const t = this.labels.get(label);
    if (t === undefined) {
      this.ended = true;
      return;
    }
    this.index = t;
    this.settle();
  }

  /** Resolve flow commands until one that needs showing, or the end. */
  private settle(): void {
    // Bounded, so a bad scene cannot spin the game (the validator forbids it).
    for (let guard = 0; guard < 10_000; guard++) {
      const c = this.cmds[this.index];
      if (!c || c.cmd === "end") {
        this.ended = true;
        return;
      }
      if (c.cmd === "label") {
        this.index += 1;
      } else if (c.cmd === "jump") {
        const t = this.labels.get(c.to);
        if (t === undefined) {
          this.ended = true;
          return;
        }
        this.index = t;
      } else if (c.cmd === "if") {
        const yes =
          (c.flag !== undefined && this.world.flag(c.flag)) ||
          (c.hearts !== undefined &&
            this.world.hearts(c.hearts.who) >= c.hearts.atLeast);
        if (yes) {
          const t = this.labels.get(c.goto);
          if (t === undefined) {
            this.ended = true;
            return;
          }
          this.index = t;
        } else this.index += 1;
      } else return;
    }
    this.ended = true;
  }
}

/** The run's world, read from the game state. */
export const worldOf = (g: GameState): RunWorld => ({
  flag: (f) => g.heartEvents.hasFlag(f),
  hearts: (who) => g.friendship.hearts(who),
});
