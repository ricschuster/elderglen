import type Phaser from "phaser";
import walkerData from "../content/walkers.json";
import { hallRestored } from "../core/bundles";
import { isFestivalMap, festivalToday } from "../core/festivals";
import { lanternOn } from "../core/feastexchange";
import { stackOffsets, taggedIds } from "../core/labels";
import { tileOf } from "../core/movement";
import { paradeJoinedAt } from "../core/parade";
import { villagersOn, type Present } from "../core/townfolk";
import { TILES_PER_MINUTE } from "../core/walkers";
import { villagerKey } from "./art-people";
import { sortDepth } from "./depth";
import { DEV_SPEED, PLAYER, TICK_MINUTES, TICK_MS } from "./farm-consts";
import type { FarmScene } from "./FarmScene";

// The villager sprites and their walking (note 79 decisions 1, 9, 10, 11).
// The schedule (`src/core/walkers.ts`) says where a person is at a game minute;
// this file draws it each frame, smoothly, and keeps each person's `lag`: game
// minutes behind the schedule, grown while the player talks to them or a tile
// ahead is blocked, then paid back by walking a little faster.

export interface VillagerSprite {
  box: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Text;
  /** The tile a marcher is gliding to, so the glide starts once per tile. */
  goal?: string;
}

/** Game minutes per real second (the clock runs 10 minutes per tick). */
const MIN_PER_SEC = (TICK_MINUTES / (TICK_MS / 1000)) * DEV_SPEED;

export class WalkState {
  /** Game minutes each person is behind their schedule. */
  lag: Record<string, number> = {};
  /** Real seconds a person has waited on a blocked tile. */
  waited: Record<string, number> = {};
  /** Scene time (ms) until which a person is paused for a talk. */
  heldUntil = new Map<string, number>();
  /**
   * People whose sprite a scripted animation moves (the feast reveal): the
   * walker does not place or pause them. Add an id to take a sprite over,
   * delete it to hand it back.
   */
  busy = new Set<string>();

  /** Pause a person for a moment because the player talked to them. */
  hold(id: string, now: number): void {
    this.heldUntil.set(id, now + walkerData.talkHoldSeconds * 1000);
  }
}

/** The game minute, run on between clock ticks so a walker moves smoothly. */
function frameMinutes(farm: FarmScene, smooth: boolean): number {
  const clock = farm.state.day.clock;
  if (!smooth || isFestivalMap(farm.mapId)) return clock.minutes;
  return (
    clock.minutes +
    Math.min(1, (farm.time.now - farm.tickAt) / (TICK_MS / DEV_SPEED)) *
      TICK_MINUTES
  );
}

/** Update each walker's lag from last frame's list: held for a talk, waiting on a blocker, or catching up. */
function updateLags(farm: FarmScene, dt: number): void {
  const ws = farm.walkers;
  const ts = farm.map.tileSize;
  const me = tileOf(farm.pos, PLAYER, ts);
  const maxWait = walkerData.waitSeconds;
  const lagStep = dt * MIN_PER_SEC;
  for (const p of farm.villagers) {
    if (ws.busy.has(p.id)) continue;
    if (!p.ahead) {
      // Standing: nothing to catch up on.
      delete ws.lag[p.id];
      delete ws.waited[p.id];
      continue;
    }
    let lag = ws.lag[p.id] ?? 0;
    const held = (ws.heldUntil.get(p.id) ?? 0) > farm.time.now;
    const a = p.ahead;
    const blocked =
      (a.x === me.x && a.y === me.y) ||
      farm.villagers.some(
        (o) => o.id !== p.id && o.x === a.x && o.y === a.y && !o.marching,
      );
    if (held) lag += lagStep;
    else if (blocked) {
      lag += lagStep;
      const w = (ws.waited[p.id] ?? 0) + dt;
      if (w >= maxWait) {
        // Waited long enough: step around, two tiles on.
        lag = Math.max(0, lag - 2 / TILES_PER_MINUTE);
        ws.waited[p.id] = 0;
      } else ws.waited[p.id] = w;
    } else {
      ws.waited[p.id] = 0;
      lag = Math.max(0, lag - lagStep * walkerData.catchUp);
    }
    if (lag > walkerData.maxLagMinutes) lag = 0;
    if (lag > 0) ws.lag[p.id] = lag;
    else delete ws.lag[p.id];
  }
}

/**
 * Show the villagers the schedule puts on this map. Runs every frame: the list
 * (`farm.villagers`, for talking and taps) and the sprites follow the walkers
 * between tiles. `smooth` is false for a guest, whose clock follows the host.
 */
export function syncVillagers(
  farm: FarmScene,
  dt: number,
  smooth: boolean,
  world?: Phaser.GameObjects.GameObject[],
): void {
  const clock = farm.state.day.clock;
  const ws = farm.walkers;
  updateLags(farm, dt);
  const minutes = frameMinutes(farm, smooth);
  const list: Present[] = villagersOn(
    farm.state,
    farm.mapId,
    clock.day,
    minutes,
    {
      hallRestored: hallRestored(farm.state.hall),
      paradeJoinedAt: paradeJoinedAt(farm.state),
      lag: festivalToday(clock.day) ? {} : ws.lag,
    },
  );
  farm.villagers = list;
  const ts = farm.map.tileSize;
  const here = new Set(list.map((v) => v.id));
  for (const [id, s] of farm.villagerSprites)
    if (!here.has(id)) {
      s.box.destroy();
      s.tag.destroy();
      farm.villagerSprites.delete(id);
      delete ws.lag[id];
      delete ws.waited[id];
    }
  for (const v of list) {
    let s = farm.villagerSprites.get(v.id);
    if (!s) {
      const box = farm.add.image(0, 0, villagerKey(v.id)).setOrigin(0.5, 1);
      const tag = farm.add
        .text(0, 0, v.name, {
          fontSize: "8px",
          color: "#ffffff",
          backgroundColor: "#000000aa",
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setDepth(900);
      if (world) world.push(box, tag);
      else farm.uiCamera.ignore([box, tag]);
      s = { box, tag };
      farm.villagerSprites.set(v.id, s);
    }
    if (ws.busy.has(v.id)) continue;
    const px = ((v.fx ?? v.x) + 0.5) * ts;
    const py = ((v.fy ?? v.y) + 1) * ts - 1;
    if (v.facing) s.box.setFlipX(v.facing < 0);
    if (v.marching && s.box.x !== 0 && s.box.x !== px) {
      // A marcher glides to the next tile instead of jumping.
      const goal = `${px},${py}`;
      if (s.goal === goal) continue;
      const sprite = s;
      sprite.goal = goal;
      farm.tweens.killTweensOf([sprite.box, sprite.tag]);
      farm.tweens.add({
        targets: sprite.box,
        x: px,
        y: py,
        duration: 600,
        onUpdate: () => {
          sprite.box.setDepth(sortDepth(sprite.box.y));
          sprite.tag.setPosition(sprite.box.x, sprite.box.y - 13);
        },
      });
    } else {
      s.box.setPosition(px, py).setDepth(sortDepth(py));
      s.tag.setPosition(px, py - 13);
    }
  }
  placeVillagerTags(farm);
}

/**
 * Place the villager name tags (note 82, "Name tags"): a crowd names only the
 * nearest few people, the gift recipient and the last person talked to;
 * tags that still overlap, or sit on a door or counter label, stack upward.
 * Runs each frame, so tags follow walking sprites and the nearest are re-picked
 * as the player changes tile.
 */
export function placeVillagerTags(farm: FarmScene): void {
  const hall = hallRestored(farm.state.hall);
  const me = farm.hereTile();
  const always = new Set<string>(
    farm.villagers
      .filter((v) => lanternOn(farm.state, farm.mapId, hall, v.id))
      .map((v) => v.id),
  );
  if (farm.lastTalkedId) always.add(farm.lastTalkedId);
  const shown = taggedIds(farm.villagers, me, always);
  for (const [id, s] of farm.villagerSprites) s.tag.setVisible(shown.has(id));
  // Two villagers standing close would draw their names on top of each other.
  const settled = [...farm.villagerSprites.entries()].filter(
    ([id, s]) => shown.has(id) && !farm.tweens.isTweening(s.box),
  );
  const fixed = farm.labelTags.map((t) => ({
    x: t.x,
    y: t.y,
    text: t.o.text,
  }));
  const base = settled.map(([, s]) => ({
    x: s.box.x,
    y: s.box.y - 13,
    text: s.tag.text,
  }));
  const off = stackOffsets([...fixed, ...base]).slice(fixed.length);
  settled.forEach(([, s], i) =>
    s.tag.setPosition(base[i]!.x, base[i]!.y + off[i]!),
  );
}
