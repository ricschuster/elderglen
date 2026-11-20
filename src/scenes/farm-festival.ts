import { lanternTile } from "../core/feastexchange";
import { festivalPropsOn } from "../core/festivalprops";
import Phaser from "phaser";
import {
  awardHuntPrize,
  finishHunt,
  huntEndLine,
  huntLine,
  pickUp as pickUpPacket,
  tickHunt,
} from "../core/seedhunt";
import { cakeProblem } from "../core/cakeday";
import {
  buyLantern,
  lanternBuyProblem,
  launchLantern,
  launchProblem,
} from "../core/lanterns";
import {
  PARADE_FESTIVAL,
  PARADE_MAP,
  finishParade,
  joinParade,
  paradeJoin,
  playerMarchAt,
} from "../core/parade";
import { dateOf } from "../core/calendar";
import {
  festivalOfMap,
  festivalDayToday,
  festivalSignLine,
  festivalToday,
  isFestivalMap,
  sightLine,
} from "../core/festivals";
import { openChest } from "../core/maze";
import {
  PIER_LINES,
  buyPermit,
  floatLantern,
  floatProblem,
  permitProblem,
} from "../core/marketpier";
import { DEPTH, sortDepth } from "./depth";
import { tileOf } from "../core/movement";
import { hallRestored } from "../core/bundles";
import { hatById } from "../core/hats";
import { DEV_SPEED, PLAYER } from "./farm-consts";
import { TICK_MINUTES, TICK_MS } from "./farm-consts";
import type { FarmScene } from "./FarmScene";

// Festival activities and the parade of the farm scene, moved out of
// FarmScene.ts (note 106, step 7). Each function takes the scene first.

/** The game minute, run on between clock ticks on a festival day so the march moves a tile a minute. */
export function festivalMinutes(farm: FarmScene): number {
  const clock = farm.state.day.clock;
  const smooth = !!festivalToday(clock.day) && !isFestivalMap(farm.mapId);
  return smooth
    ? clock.minutes +
        Math.min(1, (farm.time.now - farm.tickAt) / (TICK_MS / DEV_SPEED)) *
          TICK_MINUTES
    : clock.minutes;
}

/**
 * The Hat Parade, the player's part (note 82): a hatted player on the square
 * between 14:00 and 14:30 falls in at the tail and the script walks them out
 * to the turn and back with input off. Returns true while the script holds them.
 */
export function updateParade(farm: FarmScene, dt: number): boolean {
  const clock = farm.state.day.clock;
  if (
    farm.mapId !== PARADE_MAP ||
    festivalDayToday(clock.day)?.id !== PARADE_FESTIVAL
  ) {
    farm.marching = false;
    return false;
  }
  const ts = farm.map.tileSize;
  let join = paradeJoin(farm.state);
  if (!join && !farm.leaving) {
    const at = tileOf(farm.pos, PLAYER, ts);
    if (!joinParade(farm.state, farm.mapId, at.x, at.y)) {
      join = paradeJoin(farm.state);
      farm.villagerStamp = -1;
      farm.message = "The march forms. You fall in at the tail of the line.";
      farm.render();
    }
  }
  if (!join) return false;
  const at = playerMarchAt(join, festivalMinutes(farm));
  if (at.state === "done") {
    if (farm.marching) {
      farm.marching = false;
      farm.message = finishParade(farm.state);
      farm.render();
    }
    return false;
  }
  farm.marching = true;
  const k = Math.min(1, dt * 8);
  const goal = { x: (at.tile[0] + 0.5) * ts, y: (at.tile[1] + 1) * ts - 2 };
  farm.pos = {
    x: farm.pos.x + (goal.x - farm.pos.x) * k,
    y: farm.pos.y + (goal.y - farm.pos.y) * k,
  };
  return true;
}

/**
 * A service on a festival map: the display table and counters open their
 * panel, the way home asks first, villagers and decorations speak, and the
 * hedge chest and cart finish the maze.
 */
export function festivalAction(
  farm: FarmScene,
  service: { id: string; kind: string },
): void {
  if (service.kind === "cake-table") return cakeTable(farm);
  if (service.id === "lantern-stall") return lanternStall(farm);
  const f =
    festivalOfMap(farm.mapId) ?? festivalDayToday(farm.state.day.clock.day);
  if (!f) return;
  switch (service.kind) {
    case "showing":
      return farm.open("festival", { mode: "panel", panel: "showing" });
    case "festival-counter":
      return farm.open("festival", { mode: "panel", panel: "counter" });
    case "festival-leave":
      return farm.open("festival", { mode: "leave" });
    case "hedge-chest":
      farm.message = openChest(farm.state);
      return farm.render();
    case "hedge-cart":
      return farm.travel(farm.mapId, "door");
    case "sight":
      farm.message =
        sightLine(f, service.id, dateOf(farm.state.day.clock.day).year) ?? "";
      return farm.render();
  }
}

/** The Night Market pier keeper sells the evening's fishing permit (note 14, placeholder price). */
export function pierKeeper(farm: FarmScene): void {
  const problem = permitProblem(farm.state);
  farm.message = problem ?? (buyPermit(farm.state) ? PIER_LINES.sold : "");
  farm.render();
}

/** Float a lantern from the pier tip: a short cosmetic scene, a line and a small luck buff until morning. */
export function pierFloat(farm: FarmScene): void {
  const problem = floatProblem(farm.state);
  if (problem) {
    farm.message = problem;
    return farm.render();
  }
  const line = floatLantern(farm.state);
  if (line) driftLantern(farm);
  farm.message = line ?? "";
  farm.render();
}

/** Lamplight Evening stall: buys a paper lantern (placeholder price). */
export function lanternStall(farm: FarmScene): void {
  const problem = lanternBuyProblem(farm.state);
  farm.message =
    problem ??
    (buyLantern(farm.state)
      ? "You buy a paper lantern. Set it afloat from the shore."
      : "");
  farm.render();
}

/** True when the player stands on, or faces, a tile of the launch line (Beach, Lamplight Evening). */
export function onLaunchLine(
  farm: FarmScene,
  front: { x: number; y: number },
): boolean {
  const line = farm.map.regions.find((r) => r.id === "launch-line");
  if (!line) return false;
  const here = tileOf(farm.pos, PLAYER, farm.map.tileSize);
  const inside = (t: { x: number; y: number }) =>
    t.x >= line.x &&
    t.x < line.x + line.w &&
    t.y >= line.y &&
    t.y < line.y + line.h;
  return inside(here) || inside(front);
}

/** A glowing dot that drifts away from the player over the water and fades, for the lantern launch. */
export function driftLantern(farm: FarmScene): void {
  const ts = farm.map.tileSize;
  const dot = farm.add
    .circle(farm.pos.x + ts / 2, farm.pos.y, 5, 0xffc860, 1)
    .setDepth(850);
  farm.uiCamera.ignore(dot);
  farm.tweens.add({
    targets: dot,
    x: dot.x + Phaser.Math.Between(-3, 3) * ts,
    y: dot.y - 5 * ts,
    alpha: 0,
    duration: 5000,
    ease: "Sine.easeIn",
    onComplete: () => dot.destroy(),
  });
}

/** Sets the held lantern afloat and lets it drift off. */
export function launchLanternAt(farm: FarmScene): void {
  const problem = launchProblem(farm.state);
  if (problem) {
    farm.message = problem;
    return farm.render();
  }
  const r = launchLantern(farm.state);
  if (r) driftLantern(farm);
  farm.message = r
    ? `Your lantern drifts out with the rest. They like you a little more.${r.keepsake ? " You keep a small lantern." : ""}`
    : "";
  farm.render();
}

/** Cake Day table: opens the dish picker, or says why there is nothing to do. */
export function cakeTable(farm: FarmScene): void {
  const problem = cakeProblem(farm.state, "");
  if (
    problem === "There is no cake table today." ||
    problem === "Your dish is already on the table."
  ) {
    farm.message = problem;
    return farm.render();
  }
  farm.open("cake");
}

/** The Seedswap hunt: clock, pick-up by walking, packet markers and the end (placeholder). */
export function updateHunt(farm: FarmScene, dt: number): void {
  const s = farm.hunt;
  if (!s) return;
  const ts = farm.map.tileSize;
  const f = festivalDayToday(farm.state.day.clock.day);
  if (!farm.huntGfx) {
    farm.huntGfx = farm.add.graphics().setDepth(850);
    farm.uiCamera.ignore(farm.huntGfx);
    const { width } = farm.scale.gameSize;
    farm.huntText = farm.add
      .text(width / 2, 48, "", { fontSize: "18px", color: "#ffffff" })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2000);
    farm.cameras.main.ignore(farm.huntText);
  }
  const here = tileOf(farm.pos, PLAYER, ts);
  pickUpPacket(s, here.x, here.y);
  tickHunt(s, dt);
  farm.huntGfx.clear().fillStyle(0xf0d040, 1);
  for (const t of s.packets)
    farm.huntGfx.fillRect(t[0] * ts + 4, t[1] * ts + 4, ts - 8, ts - 8);
  farm.huntText?.setText(huntLine(s));
  if (s.status === "running" || !f) return;
  farm.message = huntEndLine(f, s) ?? "";
  const won = awardHuntPrize(farm.state, s);
  if (won)
    farm.message +=
      ` ${won.hat ? `You get the ${hatById(won.hat)?.name ?? "hat"}.` : ""}${won.packet ? " You get a rare seed packet." : ""}`.replace(
        / +/g,
        " ",
      );
  finishHunt(farm.state, f, s);
  farm.huntGfx.destroy();
  farm.huntText?.destroy();
  farm.huntGfx = farm.huntText = farm.hunt = undefined;
  farm.render();
}

/** The Feast gift exchange lantern prop (note 105), on the Feast's map (the square or the hall). */
export function drawFeastLantern(farm: FarmScene): void {
  farm.lanternGfx?.destroy();
  farm.lanternGfx = undefined;
  const ts = farm.map.tileSize;
  const lit = lanternTile(
    farm.state,
    farm.mapId,
    hallRestored(farm.state.hall),
  );
  if (lit) {
    const cx = lit[0] * ts + ts / 2;
    const cy = lit[1] * ts + ts / 2;
    const g = farm.add.graphics().setDepth(DEPTH.above);
    farm.uiCamera.ignore(g);
    g.fillStyle(0xffd860, 0.3)
      .fillCircle(cx, cy, ts * 0.7)
      .fillStyle(0x7a5230, 1)
      .fillRect(cx - 1, lit[1] * ts, 2, ts / 2 - 4)
      .fillStyle(0xf0a030, 1)
      .fillRoundedRect(cx - 5, cy - 5, 10, 12, 3)
      .fillStyle(0xfff2a0, 1)
      .fillRect(cx - 2, cy - 2, 4, 6);
    farm.lanternGfx = g;
  }
}

/**
 * The Midwinter Feast props, drawn as placeholders while the festival is on
 * (note 82): the long table (blocks), a lantern on each table end and the
 * bonfire with its glow (neither blocks).
 */
export function drawFeastProps(farm: FarmScene): void {
  for (const o of farm.propsGfx) o.destroy();
  farm.propsGfx = [];
  const ts = farm.map.tileSize;
  const set = festivalPropsOn(
    farm.state.day.clock.day,
    farm.mapId,
    hallRestored(farm.state.hall),
  );
  if (!set) return;
  const t = farm.add.graphics();
  const g = farm.add.graphics().setDepth(DEPTH.above);
  farm.uiCamera.ignore([t, g]);
  const [x0, x1, y] = set.table ?? [0, -1, 0];
  // Sorted like a person standing on the table's row: the far side stands behind it.
  t.setDepth(sortDepth(y * ts + ts - 1));
  for (let x = x0; x <= x1; x++) {
    t.fillStyle(0x6b4423, 1)
      .fillRect(x * ts, y * ts + 3, ts, ts - 6)
      .fillStyle(0x9a6a3a, 1)
      .fillRect(x * ts, y * ts + 3, ts, 4)
      .fillStyle(0x3d2812, 1)
      .fillRect(x * ts, y * ts + ts - 5, ts, 2);
  }
  for (const [lx, ly] of set.lanterns) {
    const cx = lx * ts + ts / 2;
    const cy = ly * ts + ts / 2;
    g.fillStyle(0xffd860, 0.25)
      .fillCircle(cx, cy - 2, ts * 0.6)
      .fillStyle(0x3d2812, 1)
      .fillRect(cx - 1, cy - 2, 2, ts / 2)
      .fillStyle(0xf0a030, 1)
      .fillRoundedRect(cx - 3, cy - 7, 6, 8, 2)
      .fillStyle(0xfff2a0, 1)
      .fillRect(cx - 1, cy - 5, 2, 4);
  }
  if (set.bonfire) {
    const cx = set.bonfire[0] * ts + ts / 2;
    const cy = set.bonfire[1] * ts + ts / 2;
    g.fillStyle(0xff9a30, 0.18)
      .fillCircle(cx, cy, ts * 1.6)
      .fillStyle(0xffc050, 0.25)
      .fillCircle(cx, cy, ts)
      .fillStyle(0x5a3a1c, 1)
      .fillRect(cx - 6, cy + 3, 12, 3)
      .fillRect(cx - 4, cy + 1, 8, 3)
      .fillStyle(0xe8501a, 1)
      .fillTriangle(cx - 5, cy + 2, cx + 5, cy + 2, cx, cy - 8)
      .fillStyle(0xffd040, 1)
      .fillTriangle(cx - 2, cy + 2, cx + 2, cy + 2, cx, cy - 4);
  }
  farm.propsGfx = [t, g];
}

/** Placeholder props on a festival map: tables, booths, villagers and the chest. */
export function drawFestivalProps(farm: FarmScene): void {
  const ts = farm.map.tileSize;
  const colour: Record<string, number> = {
    showing: 0x8b5a2b,
    "festival-counter": 0xc0463a,
    "festival-leave": 0xf0e8d0,
    "hedge-chest": 0xe8c050,
    "hedge-cart": 0x7a5230,
  };
  for (const s of farm.map.services) {
    const c =
      s.kind === "sight"
        ? s.id.startsWith("scare")
          ? 0xe8802a
          : s.id.startsWith("sign")
            ? 0xf0c860
            : 0x4a9fd8
        : colour[s.kind];
    if (c === undefined) continue;
    farm.ground
      .fillStyle(c, 1)
      .fillRect(s.x * ts + 1, s.y * ts + 2, ts - 2, ts - 4);
    if (s.kind === "showing" && s.id === "judge")
      farm.ground
        .fillStyle(0x203a8a, 1)
        .fillRect(s.x * ts + 4, s.y * ts + 4, ts - 8, ts - 8);
  }
}

/** The farm sign: says where and when today's festival is. The player walks there (note 82 decision 11). */
export function openFestival(farm: FarmScene): void {
  const clock = farm.state.day.clock;
  farm.message = festivalSignLine(clock.day, clock.minutes);
  farm.render();
}
