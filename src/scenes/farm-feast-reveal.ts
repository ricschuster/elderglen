import type Phaser from "phaser";
import { planReveal } from "../core/feastreveal";
import { sortDepth } from "./depth";
import { iconKey } from "./art";
import type { FarmScene } from "./FarmScene";

/**
 * Show the secret-giver reveal (notes 105 and 82, placeholder): the giver
 * walks from their seat to the tile in front of the recipient, pauses and
 * walks back, while the present icon floats up over the pair. Never blocks
 * input; an absent giver gets only the float.
 */
export function playFeastReveal(
  farm: FarmScene,
  recipientId: string,
  giverId: string,
  present: string,
): void {
  const ts = farm.map.tileSize;
  const to = farm.villagers.find((v) => v.id === recipientId);
  const seatV = farm.villagers.find((v) => v.id === giverId);
  const sprite = farm.villagerSprites.get(giverId);
  if (!to) return;
  floatPresent(farm, (to.x + 0.5) * ts, to.y * ts - 10, present);
  if (!seatV || !sprite || farm.walkers.busy.has(giverId)) return;
  const taken = new Set(farm.villagers.map((v) => `${v.x},${v.y}`));
  taken.add(`${Math.floor(farm.pos.x / ts)},${Math.floor(farm.pos.y / ts)}`);
  const plan = planReveal(
    { x: seatV.x, y: seatV.y },
    { x: to.x, y: to.y },
    (x, y) => !farm.map.isBlocked(x, y) && !taken.has(`${x},${y}`),
  );
  if (!plan) return;

  // The villager walker leaves a busy sprite alone until it is handed back.
  const busy = farm.walkers.busy;
  busy.add(giverId);
  // The scene restarts for a map change: hand the sprite back with it.
  farm.events.once("shutdown", () => busy.delete(giverId));
  const at = (t: { x: number; y: number }) => ({
    x: (t.x + 0.5) * ts,
    y: (t.y + 1) * ts - 1,
  });
  const follow = () => {
    sprite.box.setDepth(sortDepth(sprite.box.y));
    sprite.tag.setPosition(sprite.box.x, sprite.box.y - 13);
  };
  const alive = () => busy.has(giverId) && sprite.box.active;
  const walk = (
    leg: { to: { x: number; y: number }; duration: number },
    onComplete: () => void,
  ) =>
    farm.tweens.add({
      targets: sprite.box,
      ...at(leg.to),
      duration: leg.duration,
      onUpdate: follow,
      onComplete: () => {
        if (alive()) onComplete();
      },
    });
  walk(plan.there, () => {
    sprite.box.setFlipX(plan.facing === "left");
    farm.time.delayedCall(plan.pause, () => {
      if (!alive()) return;
      sprite.box.setFlipX(false);
      walk(plan.back, () => {
        busy.delete(giverId);
        follow();
      });
    });
  });
}

/** The present's icon, rising and fading over the recipient (like floatText). */
function floatPresent(
  farm: FarmScene,
  x: number,
  y: number,
  present: string,
): void {
  const key = iconKey(present);
  if (!key) return;
  const img: Phaser.GameObjects.Image = farm.add
    .image(x, y, key)
    .setOrigin(0.5)
    .setDepth(950);
  farm.uiCamera.ignore(img);
  farm.tweens.add({
    targets: img,
    y: y - 18,
    alpha: 0,
    duration: 1400,
    onComplete: () => img.destroy(),
  });
}
