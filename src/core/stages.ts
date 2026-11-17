import stageData from "../content/stages.json";
import { dateOf } from "./calendar";
import { farmMapOf } from "./farmtypes";
import { applyStatePatch, type StatePatch } from "./statepatch";
import { startGame } from "./toolbar";
import { respawnAreaForage } from "./areas";
import type { GameState } from "./save";

/**
 * Named stages for the dev-only stage jumper (`docs/design/42_debug_menu.md`,
 * "Stages"): a state patch, optionally on top of a base stage, that puts a NEW
 * game at a known point. Data is `content/stages.json`. A stage never writes
 * onto a live game, and it goes through `applyStatePatch`, so nothing derived
 * is written. Not a game feature, and the dev hooks that use it are behind
 * `DEBUG_TOOLS` (src/core/debugtools.ts).
 */
export interface StageDef {
  id: string;
  /** The heading in the debug menu list. */
  group: string;
  label: string;
  /** A stage applied first (its own base too). */
  base?: string;
  patch: StatePatch;
}

/** Every stage. A function, not a constant, so a production build that never calls it drops the data. */
export const stageList = (): StageDef[] =>
  (stageData as { stages: StageDef[] }).stages;

export const stageById = (id: string): StageDef | undefined =>
  stageList().find((s) => s.id === id);

/** The patches to apply in order for a stage: its bases first. Empty for an unknown id or a base loop. */
export function stageSteps(id: string): StatePatch[] {
  const out: StatePatch[] = [];
  const seen = new Set<string>();
  for (let s = stageById(id); s; s = s.base ? stageById(s.base) : undefined) {
    if (seen.has(s.id)) return [];
    seen.add(s.id);
    out.unshift(s.patch);
  }
  return out;
}

export interface StageResult {
  state: GameState;
  /** The map to stand on, if a patch asked for one (default: the farm). */
  map?: string;
  entry?: string;
  problems: string[];
}

/** Build a stage: a new game with the stage's patches applied. `undefined` for an unknown name. */
export function buildStage(
  id: string,
  random: () => number = Math.random,
): StageResult | undefined {
  const steps = stageSteps(id);
  if (steps.length === 0) return undefined;
  const state = startGame(undefined, random);
  const problems: string[] = [];
  let map: string | undefined;
  let entry: string | undefined;
  for (const p of steps) {
    problems.push(...applyStatePatch(state, p).problems);
    if (p.map) {
      map = p.map;
      entry = p.entry;
    }
  }
  // The scene starts with forage for the day it opens on, as a new game does.
  state.forage.respawn(
    dateOf(state.day.clock.day).season,
    farmMapOf(state).forageSpots,
    random,
  );
  respawnAreaForage(state, random);
  return { state, map, entry, problems };
}
