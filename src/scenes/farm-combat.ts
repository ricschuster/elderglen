import { audio } from "../audio/engine";
import Phaser from "phaser";
import { isAreaMap } from "../core/areas";
import { creatureSpawnsOf } from "../core/mapcreatures";
import { heldAt } from "../core/toolbar";
import { pendingChoice } from "../core/professions";
import { rodById, waterAhead } from "../core/fishing";
import { isPierCast, pierCastProblem } from "../core/marketpier";
import { itemLabel } from "../core/items";
import { sortDepth } from "./depth";
import { creatureTexture } from "./art-creatures";
import { isFarmMap } from "../core/farmtypes";
import {
  FACING_STEP,
  facingFrom,
  move,
  tileOf,
  type Vec,
} from "../core/movement";
import { partsFor, schemeById, type Parts } from "../core/controlschemes";
import { swingArc, type SwingArc } from "../core/swingfx";
import { autoSwings, autoWeaponSlot, mayAutoEquip } from "../core/autoattack";
import { loadDeviceSettings } from "./storage";
import {
  cooldownFor,
  healthShown,
  hitDamageFor,
  isWeapon,
  swingTargets,
  weaponById,
  type WeaponDef,
} from "../core/combat";
import {
  creatureById,
  creatureMax,
  floorHasCreatures,
  hurtCreature,
  splitOff,
  stepCreature,
  swingDamage,
  type Creature,
} from "../core/creatures";
import { oilCalms } from "../core/elixirs";
import { effectById } from "../core/effects";
import {
  type LitBomb,
  blastCreatures,
  blastPlayer,
  blastRocks,
  bombById,
  tickBombs,
} from "../core/bombs";
import { dangerHit } from "../core/danger";
import { mineFloorOf } from "../core/mines";
import { LOCAL_PLAYER } from "../core/players";
import { nearestPlayer } from "../core/roomplay";
import { viewOf } from "../core/roommaps";
import { HostSession } from "../net/session";
import {
  defeatCreature,
  defeatMessage,
  removeCreature,
} from "../core/creature-defeat";
import { PLAYER } from "./farm-consts";
import { CREATURE_BODY } from "./farm-consts";
import type { FarmScene } from "./FarmScene";

// Combat, bombs and creature drawing of the farm scene, moved out of
// FarmScene.ts (note 106, step 7). Each function takes the scene first.

/** True while the held item is a weapon. */
export function weaponHeld(farm: FarmScene): boolean {
  const h = heldAt(farm.state, farm.selected);
  return h.kind === "item" && isWeapon(h.id);
}

/** The control parts showing now, given the scheme and the held item (note 27). */
export function updateParts(farm: FarmScene): Parts {
  const id = farm.scheme;
  const parts = partsFor(id, weaponHeld(farm));
  if (farm.controls.profile === "touch") {
    farm.hud.setButtons(parts.useButton, parts.actionButton, false);
    farm.controls.setParts?.(parts);
  }
  return parts;
}

/**
 * The attack schemes (note 27). Auto-attack swings at the nearest creature
 * in reach; the attack stick faces and swings the way it is pushed. The
 * weapon's own cooldown paces both.
 */
export function updateAttack(farm: FarmScene, parts: Parts): void {
  if (farm.controls.profile !== "touch") return;
  if (farm.leaving || farm.marching || farm.state.animals.mounted) return;
  const floor = fightState(farm);
  if (!floor || farm.state.combat.noCreatures) return;
  const h = heldAt(farm.state, farm.selected);
  let weapon =
    h.kind === "item" && isWeapon(h.id) ? weaponById(h.id) : undefined;
  const ts = farm.map.tileSize;
  const push = parts.aimStick ? farm.controls.aim?.() : undefined;
  let dir: Vec | undefined = push;
  // Auto-attack with a tool or nothing held equips a weapon from the pack
  // when a creature is in reach (note 27, Stardew's rule).
  if (
    !weapon &&
    !dir &&
    schemeById(farm.scheme).autoAttack &&
    mayAutoEquip(farm.state, farm.selected)
  ) {
    const slot = autoWeaponSlot(farm.state, farm.lastWeapon);
    const w = slot === undefined ? undefined : farm.state.inventory.slot(slot);
    const cand = w ? weaponById(w.id) : undefined;
    if (
      slot !== undefined &&
      cand &&
      floor.creatures.some(
        (c) =>
          Math.hypot(c.x - farm.pos.x, c.y - farm.pos.y) <= cand.reach * ts,
      )
    ) {
      farm.select(slot);
      weapon = cand;
    }
  }
  if (!weapon) return;
  if (!dir && schemeById(farm.scheme).autoAttack && autoSwings(weapon.id)) {
    let best = Infinity;
    for (const c of floor.creatures) {
      const dx = c.x - farm.pos.x;
      const dy = c.y - farm.pos.y;
      const d = Math.hypot(dx, dy);
      if (d <= weapon.reach * ts && d < best) {
        best = d;
        dir = { x: dx, y: dy };
      }
    }
  }
  if (!dir || farm.time.now < farm.swingReady) return;
  farm.facing = facingFrom(dir, farm.facing);
  if (weapon.family === "sling") {
    const len = Math.hypot(dir.x, dir.y) || 1;
    farm.tapShot = {
      x: farm.pos.x + (dir.x / len) * 64,
      y: farm.pos.y - 6 + (dir.y / len) * 64,
      until: farm.time.now + 300,
    };
  }
  swing(farm, weapon);
}

/** Use a rod: it needs water in front of the player within the rod's range (note 21). */
export function cast(farm: FarmScene, rodId: string): void {
  const rod = rodById(rodId)!;
  const here = tileOf(farm.pos, PLAYER, farm.map.tileSize);
  const step = FACING_STEP[farm.facing];
  // Any outdoor map with water can be fished: Hearthwell's river arm (the
  // Night Market pier, note 14) is one; its water kind drives the fish table.
  const water =
    isFarmMap(farm.mapId) ||
    isAreaMap(farm.mapId) ||
    mineFloorOf(farm.mapId) !== undefined ||
    !farm.map.indoors
      ? waterAhead(farm.map, here.x, here.y, step.x, step.y, rod.range)
      : [];
  if (water.length === 0) {
    farm.message = "Face the water to fish.";
    return farm.render();
  }
  const first = water[0]!;
  const kind = farm.map.waterKindAt(
    here.x + step.x * first,
    here.y + step.y * first,
  );
  const ice = farm.iceFor(here.x + step.x * first, here.y + step.y * first);
  if (ice === "shut") {
    farm.message = "The lake opens at noon.";
    return farm.render();
  }
  // The Night Market pier needs a permit and closes at 23:00 (note 14).
  const pierProblem = pierCastProblem(farm.state, here.x, here.y);
  if (pierProblem) {
    farm.message = pierProblem;
    return farm.render();
  }
  const pier = isPierCast(farm.state, here.x, here.y);
  farm.open("fishing", { rod: rodId, water, at: here, kind, ice, pier });
}

/** Tick the fuses, blink the lit bombs and set off the ones that are due. */
export function updateBombs(farm: FarmScene, dt: number): void {
  farm.bombFx.clear();
  const ts0 = farm.map.tileSize;
  // A guest's bombs are the host's: blink until its blast message, or a few seconds past the fuse.
  farm.guestLit = farm.guestLit.filter((b) => farm.time.now < b.until + 2000);
  for (const b of farm.guestLit) {
    const on = Math.floor(farm.time.now / 120) % 2 === 0;
    farm.bombFx.fillStyle(on ? 0xffffff : 0xff6a3a, on ? 0.7 : 0.45);
    farm.bombFx.fillRect(b.x * ts0 + 2, b.y * ts0 + 2, ts0 - 4, ts0 - 4);
  }
  if (farm.litBombs.length === 0) return;
  const ts = farm.map.tileSize;
  for (const b of farm.litBombs) {
    const on = Math.floor(farm.time.now / 120) % 2 === 0;
    farm.bombFx.fillStyle(on ? 0xffffff : 0xff6a3a, on ? 0.7 : 0.45);
    farm.bombFx.fillRect(b.x * ts + 2, b.y * ts + 2, ts - 4, ts - 4);
  }
  for (const b of tickBombs(farm.litBombs, dt)) detonate(farm, b, false);
}

/** The host's bomb went off on a guest's map: the boom, the shake and the blast circle (no rules here). */
export function guestBlast(
  farm: FarmScene,
  m: { x: number; y: number; id: string },
): void {
  const def = bombById(m.id);
  if (!def) return;
  const ts = farm.map.tileSize;
  audio.sfx("bomb.boom");
  farm.cameras.main.shake(200, 0.01);
  farm.swingFx.clear().fillStyle(0xffb040, 0.5);
  farm.swingFx.fillCircle(
    (m.x + 0.5) * ts,
    (m.y + 0.5) * ts,
    (def.radius + 0.5) * ts,
  );
  farm.time.delayedCall(220, () => farm.swingFx.clear());
}

/** Every lit bomb goes off at once (leaving the map or the day ending). */
export function detonateAll(farm: FarmScene, quiet: boolean): void {
  const lit = farm.litBombs;
  farm.litBombs = [];
  for (const b of lit) detonate(farm, b, quiet);
}

/**
 * A bomb goes off (note 89): rocks the Mining level allows break with their
 * usual drops, monsters and the player inside the circle are hurt, and
 * nothing else is touched. `quiet` skips the screen and the kill rewards,
 * for a bomb that goes off as the map is left.
 */
export function detonate(farm: FarmScene, b: LitBomb, quiet: boolean): void {
  const def = bombById(b.id);
  if (!def) return;
  const g = farm.state;
  const ts = farm.map.tileSize;
  const rocks = farm.rocks();
  const broken = rocks ? blastRocks(g, rocks, farm.floor, b) : undefined;
  const floor = fightState(farm);
  const dead = floor ? blastCreatures(floor.creatures, b, ts) : [];
  const lost = blastPlayer(g.combat.health, b, {
    x: Math.floor(farm.pos.x / ts),
    y: Math.floor((farm.pos.y - 1) / ts),
  });
  if (quiet) {
    if (floor)
      floor.creatures = floor.creatures.filter(
        (c) => !dead.some((d) => d.uid === c.uid),
      );
    return;
  }
  audio.sfx("bomb.boom");
  for (const c of dead) beaten(farm, c);
  farm.cameras.main.shake(200, 0.01);
  farm.swingFx.clear().fillStyle(0xffb040, 0.5);
  farm.swingFx.fillCircle(
    (b.x + 0.5) * ts,
    (b.y + 0.5) * ts,
    (def.radius + 0.5) * ts,
  );
  farm.time.delayedCall(220, () => farm.swingFx.clear());
  const got = Object.entries(broken?.items ?? {})
    .map(([id, n]) => `${n} ${itemLabel(id)}`)
    .join(", ");
  farm.message =
    `${def.name} goes off.` +
    (got ? ` Got ${got}.` : "") +
    (broken?.ladder ? " A ladder is revealed!" : "") +
    (lost > 0 ? ` It hurts you for ${lost}.` : "");
  if (lost > 0)
    floatText(farm, farm.pos.x, farm.pos.y - 14, `-${lost}`, "#ff8080");
  farm.render();
}

/** A strike falls: a white flash of the screen, and a bright block on each rod it hit (note 89). */
export function strikeFlash(
  farm: FarmScene,
  r: {
    strikes: number;
    hits: { x: number; y: number }[];
  },
) {
  if (r.strikes === 0 || farm.floor !== undefined) return;
  farm.cameras.main.flash(180, 255, 255, 255);
  audio.sfx("weather.thunder");
  if (!isFarmMap(farm.mapId)) return;
  const ts = farm.map.tileSize;
  farm.swingFx.clear().fillStyle(0xffffaa, 0.8);
  for (const h of r.hits) farm.swingFx.fillRect(h.x * ts, h.y * ts, ts, ts);
  farm.time.delayedCall(220, () => farm.swingFx.clear());
}

/** What holds the creatures here: a mine floor, or the day's creatures of a map with a spawn table. */
export function fightState(
  farm: FarmScene,
): { creatures: Creature[] } | undefined {
  if (farm.floorState) return farm.floorState;
  if (!creatureSpawnsOf(farm.mapId)) return undefined;
  const w = farm.state.areas[farm.mapId];
  if (!w) return undefined;
  w.creatures ??= [];
  return w as { creatures: Creature[] };
}

/** True where health can be lost, so the bar shows (note 22, decision 17). */
export function showHealth(farm: FarmScene): boolean {
  return healthShown(
    (farm.floor !== undefined && floorHasCreatures(farm.floor)) ||
      creatureSpawnsOf(farm.mapId) !== undefined,
    farm.state.combat.noCreatures,
  );
}

/** Read the combat settings from the device: assist and "no creatures". */
export function syncCombatSettings(farm: FarmScene): void {
  const s = loadDeviceSettings();
  farm.state.combat.assist = s.combatAssist;
  farm.state.combat.noCreatures = s.noCreatures;
  for (const block of farm.creatureSprites.values())
    block.setVisible(!s.noCreatures);
}

/** Step every creature on the floor, take hits and handle a knock out. */
export function updateCombat(farm: FarmScene, dt: number): void {
  const combat = farm.state.combat;
  const floor = fightState(farm);
  farm.creatureBars.clear();
  farm.player.setAlpha(
    combat.health.grace > 0 && Math.floor(farm.time.now / 90) % 2 ? 0.4 : 1,
  );
  combat.tickBuffs(dt);
  if (!floor || combat.noCreatures) return;
  combat.sync(farm.state.skills, farm.state.equipment.graceBonus());
  combat.health.tick(dt);
  const burn = combat.effects.tick(dt);
  if (burn > 0) {
    farm.burnDebt += burn;
    if (farm.burnDebt >= 1) {
      const whole = Math.floor(farm.burnDebt);
      farm.burnDebt -= whole;
      const lost = combat.health.drain(whole);
      if (lost > 0)
        floatText(farm, farm.pos.x, farm.pos.y - 14, `-${lost}`, "#ff9a40");
    }
  } else farm.burnDebt = 0;
  const ts = farm.map.tileSize;
  syncCreatureSprites(farm, floor.creatures);
  // Guests on this map are chased too: each creature goes for its nearest player (note 109 rule 7).
  const net = farm.net instanceof HostSession ? farm.net : undefined;
  // A guest who turned creatures off is not chased here (note 109, their own setting).
  const guests = (net?.remotes() ?? []).filter(
    (r) =>
      r.map === farm.mapId && !farm.state.players.get(r.id).combat.noCreatures,
  );
  const view = net ? viewOf(farm.state, farm.mapId) : undefined;
  for (const c of [...floor.creatures]) {
    const mine = { id: LOCAL_PLAYER, x: farm.pos.x, y: farm.pos.y };
    const chased =
      nearestPlayer(c, [mine, ...guests.map((r) => ({ ...r }))]) ?? mine;
    const result = stepCreature(c, dt, {
      player: chased,
      walk: (cr, dx, dy) =>
        move(
          { x: cr.x, y: cr.y },
          { x: dx, y: dy },
          CREATURE_BODY,
          ts,
          (x, y) => farm.tileBlockedNoHorse(x, y),
        ),
      random: Math.random,
      // The windup widens for the player the creature goes for, by that player's own Assist.
      assist:
        chased.id === LOCAL_PLAYER
          ? combat.assist
          : farm.state.players.get(chased.id).combat.assist,
      tileSize: ts,
      calm: oilCalms(farm.state, c.kind),
    });
    if (result.hit && chased.id !== LOCAL_PLAYER && net && view) {
      // A guest took the hit: their own record pays for it, on the host (note 109 rule 6).
      net.world.play.hurtPlayer(chased.id, c, result.hit, {
        dangerous: !!farm.floorState?.dangerous,
        view,
        list: floor,
      });
    } else if (result.hit) {
      // Dangerous mode: hits take two and a half times the health, before Assist (note 22).
      const lost = combat.health.hurt(
        dangerHit(result.hit, !!farm.floorState?.dangerous),
        combat.assist,
        farm.state.equipment.defense(),
      );
      if (lost > 0) {
        audio.sfx("player.hurt");
        farm.message = `${creatureById(c.kind)?.name ?? "It"} hits you for ${lost}.`;
        const inflicts = creatureById(c.kind)?.inflicts;
        if (inflicts && Math.random() < inflicts.chance) {
          const eq = farm.state.equipment;
          const r = combat.effects.inflict(inflicts.effect, Math.random, {
            immunity: eq.immunity(),
            slimeProof: eq.slimeProof(),
            halfLength: eq.halvesEffects(),
          });
          const name = effectById(inflicts.effect)?.name.toLowerCase();
          if (r === "afflicted") farm.message += ` You are ${name}.`;
          else if (r === "resisted") farm.message += ` You shrug off ${name}.`;
        }
        floatText(farm, farm.pos.x, farm.pos.y - 14, `-${lost}`, "#ff8080");
        // The thorns ring sends the damage back (note 37).
        if (farm.state.equipment.thorns() && hurtCreature(c, lost)) {
          beaten(farm, c);
          farm.render();
          continue;
        }
        farm.render();
      }
    }
    drawCreature(farm, c);
  }
  if (combat.health.down && !combat.defeatPending) knockedOut(farm);
}

/**
 * Make the sprites match the creatures on the floor: a guest's kill or a split removes or adds one the host's own
 * loop did not (note 109).
 */
export function syncCreatureSprites(farm: FarmScene, list: Creature[]): void {
  for (const [uid, sprite] of farm.creatureSprites)
    if (!list.some((c) => c.uid === uid)) {
      sprite.destroy();
      farm.creatureSprites.delete(uid);
    }
  for (const c of list)
    if (!farm.creatureSprites.has(c.uid)) {
      const sprite = addCreatureSprite(farm, c);
      farm.uiCamera.ignore(sprite);
    }
}

/**
 * A guest's creatures are the host's (the `creatures` messages put them in the copy): draw them, step nothing
 * and take no hits here.
 */
export function guestCombatView(farm: FarmScene): void {
  farm.creatureBars.clear();
  const floor = fightState(farm);
  if (!floor) return;
  syncCreatureSprites(farm, floor.creatures);
  for (const c of floor.creatures) drawCreature(farm, c);
}

/** A guest's swing: the cooldown and the arc are drawn here, the hit is the host's (note 109). */
export function guestSwing(
  farm: FarmScene,
  net: { sendIntent(i: { kind: string; [k: string]: unknown }): number },
  weapon: WeaponDef,
): void {
  if (farm.time.now < farm.swingReady) return;
  farm.lastWeapon = weapon.id;
  audio.sfx("combat.swing");
  farm.swingReady =
    farm.time.now +
    cooldownFor(farm.state.skills, weapon.cooldown) *
      farm.state.combat.effects.swingFactor() *
      1000;
  const ts = farm.map.tileSize;
  // A sling shoots toward the pointer or the tapped spot, as for the host (the host aims the shot along it).
  const aim = weapon.family === "sling" ? shotAim(farm) : undefined;
  if (aim) farm.facing = facingFrom(aim, farm.facing);
  const mid = { x: farm.pos.x, y: farm.pos.y - 6 };
  const arc = swingArc(weapon.family, farm.facing);
  if (aim) {
    const len = weapon.reach * ts;
    const n = Math.hypot(aim.x, aim.y);
    farm.swingFx
      .clear()
      .lineStyle(3, 0xffffff, 0.35)
      .lineBetween(
        mid.x,
        mid.y,
        mid.x + (aim.x / n) * len,
        mid.y + (aim.y / n) * len,
      );
    farm.time.delayedCall(90, () => farm.swingFx.clear());
  } else if (arc) playSwingArc(farm, arc, mid, weapon.reach * ts * 0.8);
  // The training dummy takes the hit on the guest's own screen; nothing is shared (it never hits back).
  if (hitDummy(farm, weapon)) return;
  net.sendIntent({
    kind: "swing",
    map: farm.mapId,
    weapon: weapon.id,
    facing: farm.facing,
    x: farm.pos.x,
    y: farm.pos.y,
    ...(aim ? { ax: aim.x, ay: aim.y } : {}),
  });
}

/** The dummy in front, as far as the weapon reaches: the number and the line. True when it was hit. */
function hitDummy(farm: FarmScene, weapon: WeaponDef): boolean {
  const ts = farm.map.tileSize;
  const f = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
    farm.facing
  ];
  const here = tileOf(farm.pos, PLAYER, ts);
  for (let i = 1; i <= Math.max(1, Math.floor(weapon.reach)); i++) {
    const tx = here.x + f[0]! * i;
    const ty = here.y + f[1]! * i;
    if (farm.map.serviceAt(tx, ty)?.kind === "dummy") {
      floatText(farm, (tx + 0.5) * ts, ty * ts, `${weapon.damage}`, "#ffffff");
      audio.sfx("combat.hit");
      farm.message = `The dummy takes ${weapon.damage}. Swing again in ${weapon.cooldown} seconds.`;
      farm.render();
      return true;
    }
    if (farm.tileBlocked(tx, ty)) break;
  }
  return false;
}

/** One painted sprite for a creature, kept in `creatureSprites`. */
export function addCreatureSprite(
  farm: FarmScene,
  c: Creature,
): Phaser.GameObjects.Image {
  const block = farm.add
    .image(c.x, c.y, creatureTexture(farm, c.kind))
    .setOrigin(0.5, 1)
    .setScale(c.small ? 0.65 : 1)
    .setVisible(!farm.state.combat.noCreatures);
  farm.creatureSprites.set(c.uid, block);
  return block;
}

/** A thin health bar over a creature that has lost some (host and guests alike). */
function drawCreatureBar(farm: FarmScene, c: Creature): void {
  const max = creatureMax(c, farm.floorState?.dangerous === true);
  if (c.hp >= max || c.hp <= 0) return;
  const w = c.small ? 10 : 16;
  const x = c.x - w / 2;
  const y = c.y - (c.small ? 16 : 24);
  farm.creatureBars.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, w + 2, 4);
  farm.creatureBars.fillStyle(0xd84a4a, 1).fillRect(x, y, w * (c.hp / max), 2);
}

export function drawCreature(farm: FarmScene, c: Creature): void {
  const block = farm.creatureSprites.get(c.uid);
  if (!block) return;
  drawCreatureBar(farm, c);
  block.setPosition(c.x, c.y).setDepth(sortDepth(c.y));
  // The wind up is the warning: a swelling, blinking sprite (note 22).
  const winding = c.state === "windup";
  const base = c.small ? 0.65 : 1;
  block.setScale(winding ? base * 1.35 : base);
  if (winding && Math.floor(farm.time.now / 100) % 2) {
    block.setTint(0xff9a40).setTintMode(Phaser.TintModes.MULTIPLY);
  } else if (c.state === "stagger") {
    block.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  } else if (creatureById(c.kind)?.rare) {
    // A rare creature wears a gold sheen (placeholder tint).
    block.setTint(0xffd84a).setTintMode(Phaser.TintModes.MULTIPLY);
  } else block.clearTint();
  // A sleeping rock crab looks like a dull rock until the player comes near.
  const asleep = creatureById(c.kind)?.sleeper && c.state === "wander";
  block.setAlpha(c.state === "recover" ? 0.6 : asleep ? 0.55 : 1);
}

/** Health ran out: the day ends and the defeat rule runs overnight (note 22). */
export function knockedOut(farm: FarmScene): void {
  audio.sfx("player.die");
  farm.state.combat.defeatPending = true;
  farm.message = "";
  farm.endDay();
}

/** A short number that rises and fades in the world. */
export function floatText(
  farm: FarmScene,
  x: number,
  y: number,
  text: string,
  color: string,
): void {
  const t = farm.add
    .text(x, y, text, { fontSize: "10px", color })
    .setOrigin(0.5)
    .setDepth(950);
  farm.uiCamera.ignore(t);
  farm.tweens.add({
    targets: t,
    y: y - 14,
    alpha: 0,
    duration: 700,
    onComplete: () => t.destroy(),
  });
}

/** Draw a sweeping arc for a melee swing; it removes itself. Input is never blocked. */
function playSwingArc(
  farm: FarmScene,
  arc: SwingArc,
  mid: Vec,
  radius: number,
): void {
  const fx = farm.swingFx;
  farm.tweens.addCounter({
    from: 0,
    to: 1,
    duration: arc.ms,
    onUpdate: (tw) => {
      const t = tw.getValue() ?? 1;
      const lead = arc.from + (arc.to - arc.from) * t;
      const tail = arc.from + (arc.to - arc.from) * Math.max(0, t - 0.5) * 2;
      fx.clear().lineStyle(arc.width, arc.color, 0.8 * (1 - t * 0.6));
      fx.beginPath();
      fx.arc(mid.x, mid.y, radius, tail, lead, false);
      fx.strokePath();
    },
    onComplete: () => fx.clear(),
  });
}

/**
 * Swing the held weapon (note 22). The training dummy takes the hit and shows
 * the number. Otherwise every creature in reach is hit, and a beaten one drops
 * its goods and may reveal a ladder.
 */
export function swing(farm: FarmScene, weapon: WeaponDef): void {
  if (farm.time.now < farm.swingReady) return;
  farm.lastWeapon = weapon.id;
  audio.sfx("combat.swing");
  farm.swingReady =
    farm.time.now +
    cooldownFor(farm.state.skills, weapon.cooldown) *
      farm.state.combat.effects.swingFactor() *
      1000;
  const ts = farm.map.tileSize;
  // The sling shoots toward the mouse pointer, or the tapped spot on touch
  // (note 22, SC-94). Everything else, and a sling with no aim, goes the faced way.
  const aim = weapon.family === "sling" ? shotAim(farm) : undefined;
  if (aim) farm.facing = facingFrom(aim, farm.facing);
  const aimLen = aim ? Math.hypot(aim.x, aim.y) : 0;
  const unit = aim ? { x: aim.x / aimLen, y: aim.y / aimLen } : undefined;
  const f = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
    farm.facing
  ];
  // A flash of the swing: a short line for a shot, an arc for a melee swing.
  const arc = swingArc(weapon.family, farm.facing);
  farm.swingFx.clear().fillStyle(0xffffff, 0.35);
  const mid = { x: farm.pos.x, y: farm.pos.y - 6 };
  const len =
    weapon.family === "sling" ? weapon.reach * ts : weapon.reach * ts * 0.8;
  if (unit) {
    farm.swingFx.lineStyle(3, 0xffffff, 0.35);
    farm.swingFx.lineBetween(
      mid.x,
      mid.y,
      mid.x + unit.x * len,
      mid.y + unit.y * len,
    );
  } else if (arc) {
    // Melee: sweep an arc in front of the player (placeholder art).
    farm.swingFx.clear();
    playSwingArc(farm, arc, mid, len);
  } else
    farm.swingFx.fillRect(
      mid.x + (f[0]! > 0 ? 0 : f[0]! < 0 ? -len : -len / 2),
      mid.y + (f[1]! > 0 ? 0 : f[1]! < 0 ? -len : -len / 2),
      f[0] !== 0 ? len : weapon.family === "sling" ? 3 : len,
      f[1] !== 0 ? len : weapon.family === "sling" ? 3 : len,
    );
  if (!arc) farm.time.delayedCall(90, () => farm.swingFx.clear());

  // The dummy: in front, as far as the weapon reaches.
  if (hitDummy(farm, weapon)) return;

  const floor = fightState(farm);
  if (!floor || farm.state.combat.noCreatures) return;
  const hits = swingTargets(
    weapon,
    farm.facing,
    farm.pos,
    floor.creatures,
    ts,
    aim,
  );
  for (const c of hits) {
    const hit = hitDamageFor(farm.state.skills, weapon.damage, Math.random);
    // The warrior ring's buff after a kill (note 37).
    const boosted = Math.round(
      hit.damage * farm.state.combat.killDamageFactor(),
    );
    const damage = swingDamage(c, boosted, weapon.family, farm.pos);
    // Placeholder pop: Lucky Strike shows "x2" beside the number.
    floatText(
      farm,
      c.x,
      c.y - 12,
      (damage < boosted ? `${damage} (armour)` : `${damage}`) +
        (hit.lucky ? " x2" : ""),
      hit.lucky ? "#ffd84a" : "#ffffff",
    );
    audio.sfx("combat.hit");
    if (hurtCreature(c, damage)) beaten(farm, c);
    else {
      audio.sfx("enemy.hurt");
      const next = 1 + floor.creatures.reduce((m, o) => Math.max(m, o.uid), 0);
      const small = splitOff(c, next);
      if (small) {
        floor.creatures.push(small);
        addCreatureSprite(farm, small);
        farm.uiCamera.ignore(farm.creatureSprites.get(small.uid)!);
      }
    }
  }
}

/**
 * The direction from the farmer to where a sling shot is aimed, or undefined
 * for the faced way: a fresh tap on touch, else the mouse pointer in mouse mode.
 */
export function shotAim(farm: FarmScene): Vec | undefined {
  let w: Vec | undefined;
  if (farm.tapShot && farm.time.now < farm.tapShot.until) w = farm.tapShot;
  else if (farm.mouseAim) {
    const p = farm.input.activePointer;
    w = farm.cameras.main.getWorldPoint(p.x, p.y);
  }
  farm.tapShot = undefined;
  if (!w) return undefined;
  const aim = { x: w.x - farm.pos.x, y: w.y - (farm.pos.y - 6) };
  return Math.hypot(aim.x, aim.y) < 1 ? undefined : aim;
}

/** A creature is beaten: its goods, the kill tally and a ladder roll. */
export function beaten(farm: FarmScene, c: Creature): void {
  audio.sfx("enemy.die");
  // No floor state (a stale or corrupt save): there is nothing to remove it from.
  removeCreature(fightState(farm), c.uid);
  farm.creatureSprites.get(c.uid)?.destroy();
  farm.creatureSprites.delete(c.uid);
  const r = defeatCreature(
    farm.state,
    c,
    farm.mapId,
    farm.floor,
    farm.map.tileSize,
    Math.random,
  );
  if (!r) return;
  farm.message = defeatMessage(r);
  farm.render();
  if (r.levelUp && pendingChoice(farm.state.skills)) farm.open("profession");
}
