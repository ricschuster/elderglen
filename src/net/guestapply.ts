// The guest's copy of the farm follows the host (note 53, issue 976). Rule: no prediction. A guest
// sends an intent and waits for the host's `applied`, which goes to everyone, the sender included,
// so every intent (own or another player's) is applied exactly once. A `rejected` changes nothing
// locally (the scene shows the reason). Pure: no Phaser, no DOM.
import type { ServerMsg } from "../core/protocol";
import { applyMarriageIntent } from "../core/marriageintents";
import { applyFarmIntent } from "../core/roomintents";
import { applyScreenIntent } from "../core/screenintents";
import type { GameState } from "../core/save";
import { loadCreature } from "../core/creatures";
import { applyBedMove } from "../core/homes";
import { syncPlayer } from "../core/players";
import { floorOf, groundOfMap, viewOf } from "../core/roommaps";

/**
 * Apply one server message to the guest's farm copy. True when the farm changed.
 * The host already accepted the intent, so a refusal here means the copies drifted (for example a
 * random roll); the copy is left as it is and the next `farm` message replaces it.
 */
/** A map's ground, and a mine floor's rocks and ladder, as the host sent them (note 109). */
function applyMapState(
  g: GameState,
  m: Extract<ServerMsg, { t: "mapstate" }>,
): boolean {
  const v = viewOf(g, m.map);
  if (!v) return false;
  const ground = groundOfMap(g, v.id);
  if (!ground) return false;
  ground.load(m.ground);
  if (v.kind === "mine" && m.floor) {
    const f = floorOf(g, v.floor!);
    f.rocks.load(m.floor.rocks);
    f.ladder = m.floor.ladder ? { ...m.floor.ladder } : undefined;
  }
  return true;
}

/** The creatures of a floor or map as the host stepped them (note 109 rule 7). */
function applyCreatures(
  g: GameState,
  m: Extract<ServerMsg, { t: "creatures" }>,
): boolean {
  const v = viewOf(g, m.map);
  if (!v) return false;
  const rows = m.rows.flatMap((r) => loadCreature(r) ?? []);
  if (v.kind === "mine") floorOf(g, v.floor!).creatures = rows;
  else {
    const w = g.areas[v.id];
    if (!w) return false;
    w.creatures = rows;
    w.creaturesDay = g.day.clock.day;
  }
  return true;
}

export function applyServerMsg(
  g: GameState,
  m: ServerMsg,
  random: () => number = Math.random,
): boolean {
  if (m.t === "mapstate") return applyMapState(g, m);
  if (m.t === "creatures") return applyCreatures(g, m);
  if (m.t === "player") return syncPlayer(g.players, m.rec);
  if (m.t !== "applied") return false;
  if (!g.players.has(m.by)) return false;
  if (m.intent.kind === "bed-move")
    return applyBedMove(g, m.by, m.intent) === undefined;
  const mr = applyMarriageIntent(g, m.by, m.intent);
  if (mr !== null) return mr === undefined;
  const sr = applyScreenIntent(g, m.by, m.intent);
  if (sr !== null) return sr === undefined;
  const r = applyFarmIntent(g, m.by, m.intent, random);
  return r === undefined;
}
