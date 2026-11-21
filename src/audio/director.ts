/**
 * The audio director: one timer that reads which scenes are running and what the farm scene reports,
 * and keeps the music, the ambient layers and the menu open and close sounds right. This is why most
 * scenes need no audio code (note 107). The choices themselves are pure rules in `src/core/audio.ts`.
 */
import type Phaser from "phaser";
import {
  chooseAmbient,
  chooseMusic,
  festivalForAudio,
  type AudioInfo,
} from "../core/audio";
import { dateOf } from "../core/calendar";
import type { Weather } from "../core/weather";
import { audio } from "./engine";

/** What the farm scene tells the director about the world, read each tick. */
export interface FarmProbe {
  day: number;
  minutes: number;
  weather: Weather;
  mapId: string;
  floor?: number;
}

let probe: (() => FarmProbe) | undefined;

/** The farm scene calls this on create and clears it on shutdown. */
export function setFarmProbe(p: (() => FarmProbe) | undefined): void {
  probe = p;
}

/** Scenes whose arrival or departure is not a "menu" and so makes no open or close sound. */
const QUIET_SCENES = new Set([
  "farm",
  "title",
  "options",
  "lobby",
  "farm-choice",
  "name",
  "heart-event",
  "wedding",
  "fishing",
  "end",
  "report",
  "bed",
  "shipping",
  "debug",
]);

/** Scenes that may show while no farm exists (the title flow). */
const TITLE_FLOW = new Set([
  "title",
  "options",
  "lobby",
  "farm-choice",
  "name",
]);

/** Scenes whose music overrides the farm's even while the farm is alive. */
const STORY_SCENES = new Set(["heart-event", "wedding", "fishing", "end"]);

/** Work out the audio situation from the running scene keys and the farm probe. Pure given its inputs. */
export function situation(
  active: string[],
  farmAlive: boolean,
  read: FarmProbe | undefined,
): AudioInfo | undefined {
  let scene = active.find((k) => STORY_SCENES.has(k));
  if (!scene && !farmAlive) scene = active.find((k) => TITLE_FLOW.has(k));
  if (!scene && farmAlive) scene = "farm";
  if (!scene) return undefined;
  const w = read;
  if (!w)
    return {
      scene,
      season: "spring",
      minutes: 12 * 60,
      weather: "sunny",
      mapId: "farm",
    };
  return {
    scene,
    season: dateOf(w.day).season,
    minutes: w.minutes,
    weather: w.weather,
    mapId: w.mapId,
    floor: w.floor,
    festival: festivalForAudio(w.day, w.mapId, w.minutes),
  };
}

let prevOverlays = new Set<string>();

function tick(game: Phaser.Game): void {
  const manager = game.scene;
  const active = manager.getScenes(true).map((s) => s.scene.key);
  const farm = manager.getScene("farm");
  const farmAlive =
    !!farm &&
    (manager.isActive("farm") ||
      manager.isPaused("farm") ||
      manager.isSleeping("farm"));
  let read: FarmProbe | undefined;
  try {
    read = farmAlive ? probe?.() : undefined;
  } catch {
    read = undefined;
  }
  const info = situation(active, farmAlive, read);
  if (info) {
    const id = chooseMusic(info);
    audio.setMusic(id, id === "bundle" || info.scene !== "farm");
    audio.setAmbient(chooseAmbient(info));
  }
  const overlays = new Set(active.filter((k) => !QUIET_SCENES.has(k)));
  for (const k of overlays) if (!prevOverlays.has(k)) audio.sfx("ui.open");
  for (const k of prevOverlays) if (!overlays.has(k)) audio.sfx("ui.close");
  prevOverlays = overlays;
}

/** Start the director for a game. Returns a function that stops it. */
export function startDirector(game: Phaser.Game, everyMs = 250): () => void {
  const id = window.setInterval(() => {
    try {
      tick(game);
    } catch (e) {
      audio.errors.push(`director: ${String(e)}`);
    }
  }, everyMs);
  return () => window.clearInterval(id);
}
