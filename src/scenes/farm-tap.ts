import Phaser from "phaser";
import { presentAt } from "../core/townfolk";
import { findTool, heldAt } from "../core/toolbar";
import { itemById } from "../core/items";
import { facingFrom, tileOf, type Vec } from "../core/movement";
import { isLongPress } from "../core/tipanchor";
import { tapIsAction } from "../core/controlschemes";
import { planTap, planUse, type TapPlan } from "../core/pathing";
import { tapPick, tapUse } from "../core/tapuse";
import { isTapperItem } from "../core/tapper";
import { swapsOnTap } from "../core/chests";
import { DEV_SPEED, PLAYER, SPEED } from "./farm-consts";
import type { FarmScene } from "./FarmScene";

// Tap-to-move and tap input of the farm scene, moved out of FarmScene.ts
// (note 106, step 6). Each function takes the scene as its first argument.

/** The tile under a screen point, in the world. */
export function tileAtPointer(farm: FarmScene, p: Phaser.Input.Pointer): Vec {
  const ts = farm.map.tileSize;
  const w = farm.cameras.main.getWorldPoint(p.x, p.y);
  return { x: Math.floor(w.x / ts), y: Math.floor(w.y / ts) };
}

/** Something a tap can act on: a thing that blocks the way, or a door. */
export function tapObject(farm: FarmScene, x: number, y: number): boolean {
  if (farm.map.isBlocked(x, y) && !farm.map.serviceAt(x, y)) return false;
  return true;
}

/** Plan a tap on a tile, or undefined when there is no route (red target). */
export function planAt(farm: FarmScene, tap: Vec): TapPlan | undefined {
  const ts = farm.map.tileSize;
  const plan = planTap(
    {
      width: farm.map.width,
      height: farm.map.height,
      blocked: (x, y) => farm.tileBlocked(x, y),
    },
    tileOf(farm.pos, PLAYER, ts),
    tap,
    (x, y) => tapObject(farm, x, y),
  );
  if (plan && !plan.act && farm.map.exitAt(tap.x, tap.y)) plan.act = tap;
  return plan;
}

/** Stop walking by route and forget what the last tap wanted. */
export function cancelTap(farm: FarmScene): void {
  farm.tapPath = [];
  farm.tapAct = undefined;
  farm.tapActUses = false;
  farm.tapSwinging = false;
  farm.tapStuckMs = 0;
}

/**
 * Tap-to-move (note 27): tap a spot and the farmer walks there by the
 * shortest route; tap an object and the farmer walks beside it and acts,
 * with the right tool for a tree or rock. A tap on the tile beside the
 * farmer faces it and uses the held tool, for careful tilling and placing.
 * Holding a finger down makes the farmer follow it.
 */
export function initTapInput(farm: FarmScene): void {
  const mine = (
    p: Phaser.Input.Pointer,
    over?: Phaser.GameObjects.GameObject[],
  ): boolean =>
    !over?.length &&
    !farm.controls.claims?.(p) &&
    !farm.hud.covers(p.x, p.y) &&
    !farm.leaving &&
    !farm.marching;
  const aimAtTap = (p: Phaser.Input.Pointer, fresh: boolean): void => {
    // With a sling held on a mine floor a tap shoots at the spot, no walking.
    if (fresh && farm.floorState && farm.slingHeld()) {
      const w = farm.cameras.main.getWorldPoint(p.x, p.y);
      cancelTap(farm);
      farm.keyAim();
      farm.tapShot = { x: w.x, y: w.y, until: farm.time.now + 300 };
      farm.use();
      return;
    }
    const tap = tileAtPointer(farm, p);
    const here = tileOf(farm.pos, PLAYER, farm.map.tileSize);
    const dx = tap.x - here.x;
    const dy = tap.y - here.y;
    const beside = Math.abs(dx) + Math.abs(dy) === 1;
    const held = heldAt(farm.state, farm.selected);
    // A tap on the farmer's own tile gets off the horse, else eats the held
    // food (note 27, "Tap makes the Action button obsolete").
    if (fresh && dx === 0 && dy === 0) {
      if (farm.state.animals.mounted) {
        cancelTap(farm);
        return farm.getOff();
      }
      if (held.kind === "item" && itemById(held.id)?.energy !== undefined) {
        cancelTap(farm);
        return farm.eatHeld();
      }
    }
    // A ripe crop, forage or fruit, or the horse, is picked by hand first.
    const hand = tapHand(farm, tap);
    // One rule (note 27): a soil-work item is used where it fits and the tap
    // only walks where it does not. Other items keep the old rule.
    const fit = hand
      ? "other"
      : tapUse(farm.state, farm.map, held, tap.x, tap.y);
    const thing =
      hand || (tapObject(farm, tap.x, tap.y) && farm.tileBlocked(tap.x, tap.y));
    const exit = !!farm.map.exitAt(tap.x, tap.y);
    // A tapper goes on a tree, whose tile is blocked (note 92).
    const tapper = held.kind === "item" && isTapperItem(held.id);
    if (
      fit === "use" &&
      (tapper ||
        !farm.tileBlocked(tap.x, tap.y) ||
        farm.map.isWater(tap.x, tap.y))
    ) {
      // A drag uses each new tile beside the farmer at once.
      if (beside) {
        cancelTap(farm);
        farm.keyAim();
        farm.facing = facingFrom({ x: dx, y: dy }, farm.facing);
        farm.tapMark = { ...tap, bad: false, until: farm.time.now + 300 };
        farm.use();
        return;
      }
      const plan = planUse(
        {
          width: farm.map.width,
          height: farm.map.height,
          blocked: (x, y) => farm.tileBlocked(x, y),
        },
        here,
        tap,
      );
      if (!plan) {
        cancelTap(farm);
        farm.tapMark = { ...tap, bad: true, until: farm.time.now + 700 };
        return;
      }
      startRoute(farm, plan, tap, false);
      return;
    }
    if (fresh && beside && (fit === "other" || thing || exit)) {
      // A tap beside the farmer: face it and use the held tool.
      cancelTap(farm);
      farm.keyAim();
      farm.facing = facingFrom({ x: dx, y: dy }, farm.facing);
      farm.tapMark = { ...tap, bad: false, until: farm.time.now + 300 };
      if (thing) actOn(farm, tap);
      else if (exit) farm.action();
      else farm.use();
      return;
    }
    let plan = planAt(farm, tap);
    if (hand && !farm.tileBlocked(tap.x, tap.y)) {
      // Walk beside an open tile, then pick by hand (not use the held item).
      const beside = planUse(
        {
          width: farm.map.width,
          height: farm.map.height,
          blocked: (x, y) => farm.tileBlocked(x, y),
        },
        here,
        tap,
      );
      plan = beside && { ...beside, use: false };
    }
    if (!plan) {
      cancelTap(farm);
      farm.tapMark = { ...tap, bad: true, until: farm.time.now + 700 };
      return;
    }
    startRoute(farm, plan, tap, fit === "walk");
  };
  const onDown = (
    p: Phaser.Input.Pointer,
    over: Phaser.GameObjects.GameObject[],
  ): void => {
    if (!mine(p, over)) return;
    farm.tapDown = true;
    const t = tileAtPointer(farm, p);
    if (p.wasTouch && farm.state.chests.get(farm.mapId, t.x, t.y)) {
      // Wait: a held finger shows the chest tip, a quick tap opens it.
      pending = { p, at: farm.time.now, x: p.x, y: p.y };
      return;
    }
    aimAtTap(p, true);
  };
  const settle = (act: boolean): void => {
    const w = pending;
    pending = undefined;
    if (w && act) aimAtTap(w.p, true);
  };
  let last = "";
  let pending:
    { p: Phaser.Input.Pointer; at: number; x: number; y: number } | undefined;
  const onMove = (p: Phaser.Input.Pointer): void => {
    if (pending) {
      // A drag off the chest is a move, not a press.
      if (Math.hypot(p.x - pending.x, p.y - pending.y) > 12) settle(true);
      else return;
    }
    if (!farm.tapDown || !p.isDown || farm.hud.covers(p.x, p.y)) return;
    const t = tileAtPointer(farm, p);
    const k = `${t.x},${t.y}`;
    if (k === last) return;
    last = k;
    aimAtTap(p, false);
  };
  const onUp = (): void => {
    if (pending) settle(!isLongPress(farm.time.now - pending.at));
    farm.tapDown = false;
    last = "";
  };
  farm.input.on("pointerdown", onDown);
  farm.input.on("pointermove", onMove);
  farm.input.on("pointerup", onUp);
  farm.events.once("shutdown", () => {
    farm.input.off("pointerdown", onDown);
    farm.input.off("pointermove", onMove);
    farm.input.off("pointerup", onUp);
  });
}

/** True when a tap on the tile picks by hand: ripe crop, forage, fruit, or the horse. */
export function tapHand(farm: FarmScene, tile: Vec): boolean {
  if (presentAt(farm.villagers, tile.x, tile.y)) return true;
  if (tapPick(farm.state, farm.map, tile.x, tile.y)) return true;
  const spot = farm.horseSpot();
  return (
    !farm.state.animals.mounted &&
    !!spot &&
    spot.x === tile.x &&
    spot.y === tile.y
  );
}

/** Act on a tile beside the farmer: the axe for a tree, the pickaxe for a rock. */
export function actOn(farm: FarmScene, tile: Vec): void {
  // A big chest held and a smaller placed chest tapped: swap it in, as X does.
  const held = heldAt(farm.state, farm.selected);
  if (
    held.kind === "item" &&
    swapsOnTap(farm.state, farm.mapId, tile.x, tile.y, held.id)
  )
    return farm.use();
  if (tapHand(farm, tile)) return farm.action();
  const tree =
    (!farm.map.indoors && farm.state.trees.at(tile.x, tile.y)) ||
    farm.store.fruitTrees.at(tile.x, tile.y) ||
    farm.store.teaBushes.at(tile.x, tile.y);
  const rock = farm.rocks()?.at(tile.x, tile.y);
  if (tree || rock) {
    // Find the tool by what it is: the first one in the pack, wherever it sits.
    const at = findTool(farm.state.inventory, tree ? "axe" : "pickaxe");
    if (at < 0) return farm.action();
    farm.select(at);
    farm.tapSwinging = true;
    farm.heldMs = 0;
    farm.use();
  } else farm.action();
}

/** Follow a planned route and draw its target: white to use, grey to only walk. */
export function startRoute(
  farm: FarmScene,
  plan: TapPlan,
  tap: Vec,
  walkOnly: boolean,
): void {
  farm.tapPath = plan.path;
  farm.tapAct = plan.act;
  farm.tapActUses = !!plan.use;
  farm.tapSwinging = false;
  farm.tapStuckMs = 0;
  farm.tapMark = {
    ...tap,
    bad: false,
    walk: walkOnly && !plan.act,
    until: Infinity,
  };
  if (plan.path.length === 0 && plan.act) arrive(farm);
}

/** The farmer is where the route ended: face the target and act on it. */
export function arrive(farm: FarmScene): void {
  const act = farm.tapAct;
  const uses = farm.tapActUses;
  farm.tapAct = undefined;
  farm.tapActUses = false;
  farm.tapMark = undefined;
  if (!act) return;
  const here = tileOf(farm.pos, PLAYER, farm.map.tileSize);
  const dx = act.x - here.x;
  const dy = act.y - here.y;
  farm.keyAim();
  if (dx !== 0 || dy !== 0)
    farm.facing = facingFrom({ x: dx, y: dy }, farm.facing);
  if (dx === 0 && dy === 0) return void farm.action();
  if (uses) return farm.use();
  actOn(farm, act);
}

/** The push for this frame along the route, and the end of it on arrival. */
export function tapVector(farm: FarmScene, dt: number): Vec {
  const next = farm.tapPath[0];
  if (!next) return { x: 0, y: 0 };
  const ts = farm.map.tileSize;
  const tx = (next.x + 0.5) * ts;
  const ty = (next.y + 0.5) * ts + PLAYER.h / 2;
  const dx = tx - farm.pos.x;
  const dy = ty - farm.pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= Math.max(2, SPEED * dt * DEV_SPEED)) {
    farm.tapPath.shift();
    farm.tapStuckMs = 0;
    if (farm.tapPath.length === 0) arrive(farm);
    return { x: 0, y: 0 };
  }
  return { x: dx / dist, y: dy / dist };
}

/**
 * The tap-duration scheme (note 27): a touch on the right half, released under
 * 0.25 s, is Use; held longer it is Action. No drawn button.
 */
export function initTapDuration(farm: FarmScene): void {
  let down: { id: number; at: number } | undefined;
  const onDown = (p: Phaser.Input.Pointer): void => {
    const half = p.x > farm.scale.gameSize.width / 2;
    if (!half || farm.hud.covers(p.x, p.y) || farm.controls.claims?.(p)) return;
    down = { id: p.id, at: farm.time.now };
  };
  const onUp = (p: Phaser.Input.Pointer): void => {
    if (!down || down.id !== p.id) return;
    const ms = farm.time.now - down.at;
    down = undefined;
    if (tapIsAction(ms)) farm.action();
    else farm.use();
  };
  farm.input.on("pointerdown", onDown);
  farm.input.on("pointerup", onUp);
  farm.events.once("shutdown", () => {
    farm.input.off("pointerdown", onDown);
    farm.input.off("pointerup", onUp);
  });
}
