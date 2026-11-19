import { giveItem, giveMoney } from "../core/debug";
import { itemById } from "../core/items";
import { MAX_SAVE_SLOTS } from "../core/slots";
import { applyStatePatch, type StatePatch } from "../core/statepatch";
import { useSlot } from "./storage";
import { buildStage, stageList } from "../core/stages";
import type { GameState } from "../core/save";
import type { Creature } from "../core/creatures";
import type { Exit } from "../core/map";
import type { Facing, Vec } from "../core/movement";

/** What the dev hooks need from the farm scene (note 106, step 2). */
export interface DebugContext {
  state: () => GameState;
  /** Restart the scene on a map and entry, as the scene's own restart does. */
  restart: (data: { map: string; entry: string }) => void;
  setState: (state: GameState) => void;
  render: () => void;
  mapId: () => string;
  entryName: () => string;
  startMap: string;
  startEntry: string;
  mapSize: () => { width: number; height: number };
  tileBlocked: (x: number, y: number) => boolean;
  cancelTap: () => void;
  /** Start walking the tap route to a tile; false when there is none. */
  walkTo: (x: number, y: number) => boolean;
  /** Everything `farmDebug` reports that lives in the scene. */
  snapshot: () => {
    pos: Vec;
    tile: Vec;
    facing: Facing;
    walking: boolean;
    selected: number;
    target: Vec;
    exit: Exit | undefined;
    zoom: number;
    message: string;
    creatures: Creature[];
  };
}

/** Dev builds only: the `window.farm*` hooks the playtest scripts drive. */
export function installDebugHooks(c: DebugContext): void {
  const w = window as unknown as Record<string, unknown>;
  w.farmGive = (id: string, n: number) => {
    const result = giveItem(c.state(), id, n);
    c.render();
    return result;
  };
  w.farmMoney = (n: number) => {
    giveMoney(c.state(), n);
    c.render();
  };
  // Dev hook for the playtest bot (#333): walk to a tile by the tap route, so
  // the bot does not time key holds. Returns false when there is no route.
  w.farmWalk = (x: number, y: number) => c.walkTo(x, y);
  // Dev hook for the playtest bot: jump to a chosen state in one call
  // (`core/statepatch.ts`), then restart the scene (at the entry it was
  // entered by) so the HUD and map match.
  w.farmState = (patch: StatePatch) => {
    const result = applyStatePatch(c.state(), patch);
    c.restart({
      map: patch.map ?? c.mapId(),
      entry: patch.map ? (patch.entry ?? "door") : c.entryName(),
    });
    return result;
  };
  // Dev hook (note 42, Stages): put a NEW game at a named stage, in the last
  // save slot so no real save is overwritten, and restart the scene.
  w.farmStages = () => stageList().map((s) => s.id);
  w.farmStage = (name: string) => {
    const r = buildStage(name);
    if (!r) return { problems: [`unknown stage ${name}`] };
    useSlot(MAX_SAVE_SLOTS);
    c.setState(r.state);
    // Always name the map: restart(undefined) would keep the current one
    // (a stage called inside the library would leave you there).
    c.restart(
      r.map
        ? { map: r.map, entry: r.entry ?? "door" }
        : { map: c.startMap, entry: c.startEntry },
    );
    return { problems: r.problems };
  };
  // Dev hook for the playtest bot: an item's display name, to find its row
  // in a shop list by label.
  w.farmItemName = (id: string) => itemById(id)?.name;
  // Dev hook for the playtest bot (#333): every tile the farmer cannot stand
  // on now (walls, trees, rocks, machines, furniture), as "x,y" strings.
  w.farmBlocked = () => {
    const out: string[] = [];
    const { width, height } = c.mapSize();
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (c.tileBlocked(x, y)) out.push(`${x},${y}`);
    return out;
  };
  w.farmDebug = () => {
    const s = c.state();
    const v = c.snapshot();
    return {
      pos: v.pos,
      tile: v.tile,
      facing: v.facing,
      walking: v.walking,
      selected: v.selected,
      target: v.target,
      map: c.mapId(),
      exit: v.exit?.id ?? null,
      zoom: v.zoom,
      energy: s.day.energy.current,
      plots: [...s.farm.each()].length,
      trees: s.trees.count,
      wood: s.inventory.count("wood"),
      seeds: s.inventory.count("parsnip-seed"),
      harvested: s.inventory.count("parsnip"),
      message: v.message,
      day: s.day.clock.day,
      money: s.money,
      houseTier: s.houseTier,
      houseBuild: s.houseBuild ?? null,
      mounted: s.animals.mounted,
      horse: s.animals.horse,
      health: s.combat.health.current,
      creatures: v.creatures.map((cr) => ({
        uid: cr.uid,
        kind: cr.kind,
        x: cr.x,
        y: cr.y,
        hp: cr.hp,
        state: cr.state,
      })),
    };
  };
}
