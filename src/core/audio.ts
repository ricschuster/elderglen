/**
 * Audio rules (`docs/design/107_audio.md`, ADR 0017): which music and ambient layers play, the mixer
 * maths, sound variation, and the mapping from game outcomes to effect ids. Pure code, free of Phaser
 * and the DOM; the WebAudio playback lives in `src/audio/`. Every number is a placeholder.
 */
import rules from "../content/audio-rules.json";
import manifest from "../content/audio-manifest.json";
import { cropOfSeed } from "./items";
import type { Season } from "./calendar";
import type { Weather } from "./weather";
import { darkness } from "./clock";
import { festivalDayToday, festivalOfMap } from "./festivals";
import { marketOpen } from "./nightmarket";
import { MIXED_SEED } from "./weeds";

export type Bus = "music" | "sfx" | "ambient";

/** The mixer settings, saved with the other device settings. Volumes are 0 to 100. */
export interface AudioSettings {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
}

export const DEFAULT_AUDIO: AudioSettings = {
  muted: false,
  ...rules.defaults,
};

export const clampVolume = (v: unknown, fallback = 60): number =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(100, Math.max(0, Math.round(v / 10) * 10))
    : fallback;

/** A slider position to a linear gain. A square curve keeps the low end usable. */
export const volumeGain = (percent: number): number =>
  Math.pow(Math.min(100, Math.max(0, percent)) / 100, 2);

/** The gain of a bus for these settings (mute silences every bus). */
export function busGain(s: AudioSettings, bus: Bus): number {
  if (s.muted) return 0;
  const v =
    bus === "music"
      ? s.musicVolume
      : bus === "sfx"
        ? s.sfxVolume
        : s.ambientVolume;
  return volumeGain(v);
}

export const AUDIO_TIMING = {
  crossfadeMs: rules.crossfadeMs,
  stingerFadeMs: rules.stingerFadeMs,
  ambientFadeMs: rules.ambientFadeMs,
  duckAmount: rules.duck.amount,
  duckMs: rules.duck.ms,
};

// ---- the manifest (generated) ---------------------------------------------------------------

export interface SfxDef {
  files: string[];
  gain: number;
  pitch: number;
  gainJitter: number;
  cooldownMs: number;
}
export interface LoopDef {
  file: string;
  gain: number;
  loopStart: number;
  loopEnd: number;
}
export interface MusicDef {
  file: string;
  gain: number;
  loop: boolean;
  loopStart?: number;
  loopEnd?: number;
  source: string;
}

export const SFX = manifest.sfx as Record<string, SfxDef>;
export const AMBIENT = manifest.ambient as Record<string, LoopDef>;
export const MUSIC = manifest.music as Record<string, MusicDef>;

export const isSfx = (id: string): boolean => id in SFX;
export const isMusic = (id: string): boolean => id in MUSIC;

/** Music id for a name used by event data: aliases map to a slot, an unknown name is undefined. */
export function resolveMusic(id: string): string | undefined {
  const aliases = rules.aliases as Record<string, string>;
  const real = aliases[id] ?? id;
  return isMusic(real) ? real : undefined;
}

/** Every file the manifest names (for tests and the audition page). */
export function allAudioFiles(): string[] {
  return [
    ...Object.values(SFX).flatMap((s) => s.files),
    ...Object.values(AMBIENT).map((a) => a.file),
    ...Object.values(MUSIC).map((m) => m.file),
  ];
}

// ---- variation --------------------------------------------------------------------------------

/** Pick a variant index, never the same as the last one when there is a choice. */
export function pickVariant(
  count: number,
  last: number | undefined,
  rng: () => number,
): number {
  if (count <= 1) return 0;
  let i = Math.floor(rng() * count) % count;
  if (i === last) i = (i + 1 + Math.floor(rng() * (count - 1))) % count;
  return i;
}

/** Playback rate and gain multipliers for one play of a sound, from its jitter knobs. */
export function jitterOf(
  def: Pick<SfxDef, "pitch" | "gainJitter">,
  rng: () => number,
): { rate: number; gain: number } {
  const swing = () => rng() * 2 - 1;
  return {
    rate: Math.pow(2, (swing() * def.pitch * 12) / 12),
    gain: 1 + swing() * def.gainJitter,
  };
}

/** Per-id minimum gap between plays, so a held button or a crowd does not machine-gun a sound. */
export class Cooldowns {
  private last = new Map<string, number>();
  allow(id: string, nowMs: number, gapMs: number): boolean {
    const prev = this.last.get(id);
    if (prev !== undefined && nowMs - prev < gapMs) return false;
    this.last.set(id, nowMs);
    return true;
  }
}

/** True for a sound that ducks the music under it. */
export const ducks = (id: string): boolean =>
  (rules.duck.on as string[]).includes(id);

// ---- areas, music, ambience -------------------------------------------------------------------

export interface AreaClass {
  outdoors: boolean;
  music: string;
  surface: string;
  ambient: string[];
}
const CLASSES = rules.classes as Record<string, AreaClass>;
const AREAS = rules.areas as Record<string, string>;

/** The audio class of a map id (farm for an unknown map). */
export function areaClassName(mapId: string): string {
  return AREAS[mapId] ?? "farm";
}
export const areaOf = (mapId: string, floor?: number): AreaClass =>
  CLASSES[floor !== undefined ? "mines" : areaClassName(mapId)]!;

/** What the director knows about the game right now. */
export interface AudioInfo {
  /** The scene in front: a Phaser scene key, `farm` when playing. */
  scene: string;
  season: Season;
  minutes: number;
  weather: Weather;
  mapId: string;
  /** The mine floor, when in the mines. */
  floor?: number;
  /** The festival sounding here and now, from `festivalForAudio`. */
  festival?: string;
}

/** The festival that should colour the music on this map now, if any. */
export function festivalForAudio(
  day: number,
  mapId: string,
  minutes: number,
): string | undefined {
  const f = festivalDayToday(day);
  const cls = areaClassName(mapId);
  if (f && (festivalOfMap(mapId) || cls === "village")) return f.id;
  if (cls === "village" && marketOpen(day, minutes)) return "night-market";
  return undefined;
}

const NIGHT_DARK = 0.6;

/** The music slot for a situation. First match wins: scene, festival, place, then night, rain, season. */
export function chooseMusic(info: AudioInfo): string {
  const sceneMusic = (rules.sceneMusic as Record<string, string>)[info.scene];
  if (sceneMusic) return sceneMusic;
  if (info.festival === "night-market") return "night-market";
  if (info.festival) return "festival";
  const cls = areaOf(info.mapId, info.floor);
  if (cls.music !== "season") return cls.music;
  if (darkness(info.season, info.minutes) >= NIGHT_DARK) return "night";
  if (info.weather === "rainy" || info.weather === "stormy") return "rain";
  return info.season === "fall" ? "fall" : info.season;
}

export interface AmbientLayer {
  id: string;
  level: number;
}

/** The ambient loops for a situation, each with a level from 0 to 1. Not played outside the farm scene. */
export function chooseAmbient(info: AudioInfo): AmbientLayer[] {
  if (info.scene !== "farm") return [];
  const cls = areaOf(info.mapId, info.floor);
  const L = rules.ambientLevels;
  const out: AmbientLayer[] = [];
  const raining = info.weather === "rainy" || info.weather === "stormy";
  const night = darkness(info.season, info.minutes) >= NIGHT_DARK;
  if (cls.outdoors) {
    if (!raining && !night && info.season !== "winter")
      out.push({ id: "birds", level: L.birds });
    if (!raining && night && info.season !== "winter")
      out.push({ id: "crickets", level: L.crickets });
    if (info.season === "winter" || info.weather === "stormy")
      out.push({
        id: "wind",
        level: info.weather === "stormy" ? L.windStorm : L.wind,
      });
  }
  if (raining)
    out.push({ id: "rain", level: cls.outdoors ? L.rain : L.rainIndoors });
  for (const id of cls.ambient) {
    if (out.some((o) => o.id === id)) continue;
    out.push({ id, level: (L as Record<string, number>)[id] ?? 1 });
  }
  return out;
}

/** The footstep effect id for a place. `water` and `tilled` come from the tile under the feet. */
export function footstepFor(
  mapId: string,
  floor: number | undefined,
  tile: { water?: boolean; tilled?: boolean } = {},
): string {
  if (tile.water) return "step.water";
  if (tile.tilled) return "step.dirt";
  const over = (rules.surfaceOverrides as Record<string, string>)[mapId];
  return `step.${over ?? areaOf(mapId, floor).surface}`;
}

// ---- outcomes to effects ----------------------------------------------------------------------

/** What `useHeld` returned, as far as sound cares. */
export interface UseOutcome {
  ok: boolean;
  reason?: string;
  item?: string;
  note?: string;
  ladder?: boolean;
  levelUp?: unknown;
}

export interface HeldLike {
  kind: "tool" | "item" | "empty";
  tool?: string;
  id?: string;
}

/** The effect for a tool or item use and its outcome, or undefined for silence. */
export function sfxForUse(
  held: HeldLike,
  out: UseOutcome,
  inMine: boolean,
): string | undefined {
  if (held.kind === "empty") return undefined;
  if (!out.ok) {
    if (held.kind === "tool") {
      return out.reason === "at the smithy" ? "ui.error" : "tool.swing";
    }
    return "ui.error";
  }
  if (held.kind === "tool") {
    switch (held.tool) {
      case "hoe":
        return "tool.hoe";
      case "can":
        return out.note?.startsWith("You fill") ? "tool.fill" : "tool.water";
      case "axe":
        return "tool.axe";
      case "pickaxe":
        return inMine && (out.item || out.ladder)
          ? out.ladder
            ? "mine.ladder"
            : "mine.rock"
          : "tool.pickaxe";
      case "scythe":
        return "tool.scythe";
      default:
        return "tool.swing";
    }
  }
  if (held.id && (cropOfSeed(held.id) || held.id === MIXED_SEED))
    return "crop.plant";
  return "world.place";
}

/** The effect for the Action button's result: a harvest, a forage pick, or a plain pickup. */
export function sfxForAct(
  out: UseOutcome,
  cropWasHere: boolean,
): string | undefined {
  if (!out.ok) return undefined;
  if (out.item) return cropWasHere ? "crop.harvest" : "forage.pick";
  return undefined;
}

/** The effect for a skill level up or other plain notice. */
export const LEVEL_UP = "ui.levelup";

/** The sound of walking through an exit: a door when a house, shop or cellar is on either side. */
export function doorSoundFor(from: string, to: string): string | undefined {
  const inside = (m: string) => {
    const c = areaClassName(m);
    return c === "interior" || c === "cellar";
  };
  if (inside(to) && !inside(from))
    return areaClassName(from) === "village" ? "door.shop" : "door.open";
  if (inside(from) && !inside(to)) return "door.close";
  if (inside(from) && inside(to)) return "door.open";
  return undefined;
}
