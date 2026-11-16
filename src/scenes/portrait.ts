import Phaser from "phaser";
import { portraitOrigin, PORTRAIT_CROP } from "../core/portrait";
import { paintPeople, villagerKey } from "./art-people";

/**
 * A crude villager portrait (note 102): the head and shoulders of the
 * villager's sprite, scaled up with nearest-neighbour filtering, in a frame.
 * Unmet people get a flat dark silhouette. Returns every object it made so
 * the caller can track and destroy them.
 */
export function addPortrait(
  scene: Phaser.Scene,
  id: string,
  x: number,
  y: number,
  boxPx: number,
  met: boolean,
): Phaser.GameObjects.GameObject[] {
  const key = villagerKey(id);
  // Textures are global, but the farm scene may not have painted them yet.
  if (!scene.textures.exists(key)) paintPeople(scene);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  const bg = scene.add
    .rectangle(x, y, boxPx, boxPx, met ? 0x2c3b34 : 0x262626)
    .setOrigin(0)
    .setStrokeStyle(2, met ? 0xffe9a0 : 0x666666, 0.9);
  const o = portraitOrigin(x, y, boxPx);
  const img = scene.add
    .image(o.x, o.y, key)
    .setOrigin(0)
    .setScale(o.scale)
    .setCrop(
      PORTRAIT_CROP.x,
      PORTRAIT_CROP.y,
      PORTRAIT_CROP.w,
      PORTRAIT_CROP.h,
    );
  if (!met) img.setTint(0x3c3c3c).setTintMode(Phaser.TintModes.FILL);
  return [bg, img];
}
