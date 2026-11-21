/**
 * Audio rules (`docs/design/107_audio.md`, ADR 0017): which music and ambient layers play, the mixer
 * maths, sound variation, and the mapping from game outcomes to effect ids. Pure code, free of Phaser
 * and the DOM; the WebAudio playback lives in `src/audio/`. Every number is a placeholder.
 */
import rules from "../content/audio-rules.json";
import manifest from "../content/audio-manifest.json";
import { cropOfSeed } from "./items";
import { GEODE_KINDS } from "./geodes";
import { isOre } from "./ore";
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

/** No effect may retrigger faster than this, whatever its def says. */
export const MIN_RETRIGGER_MS = 30;
/** Most effect voices sounding at once, and most of one id (a crowd cannot pile into a roar). */
export const MAX_VOICES = 24;
export const MAX_VOICES_PER_ID = 4;

/**
 * Decides whether an effect may start: the per-id gap (never below `MIN_RETRIGGER_MS`), the cap on
 * voices of that id and the cap on all voices. `start` takes a voice, `end` gives it back.
 */
export class VoiceGate {
  private last = new Map<string, number>();
  private live = new Map<string, number>();
  private total = 0;
  get voices(): number {
    return this.total;
  }
  start(id: string, nowMs: number, gapMs: number): boolean {
    const prev = this.last.get(id);
    if (prev !== undefined && nowMs - prev < Math.max(gapMs, MIN_RETRIGGER_MS))
      return false;
    if (this.total >= MAX_VOICES) return false;
    if ((this.live.get(id) ?? 0) >= MAX_VOICES_PER_ID) return false;
    this.last.set(id, nowMs);
    this.live.set(id, (this.live.get(id) ?? 0) + 1);
    this.total++;
    return true;
  }
  end(id: string): void {
    const n = this.live.get(id) ?? 0;
    if (n > 0) {
      this.live.set(id, n - 1);
      this.total--;
    }
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

/** What stood at the target tile before the use, for sounds the outcome alone cannot tell apart. */
export interface UseContext {
  /** A tree (not a stump) was in front. */
  treeHere?: boolean;
  /** A placed machine was in front. */
  machineHere?: boolean;
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
  ctx: UseContext = {},
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
        // The felling blow is the one that yields wood; earlier swings only bite.
        return ctx.treeHere && out.item ? "tree.fall" : "tool.axe";
      case "pickaxe":
        if (inMine && out.ladder) return "mine.ladder";
        if (inMine && out.item)
          return GEODE_KINDS.includes(out.item)
            ? "mine.geode"
            : isOre(out.item)
              ? "mine.ore"
              : "mine.rock";
        return "tool.pickaxe";
      case "scythe":
        return "tool.scythe";
      default:
        return "tool.swing";
    }
  }
  if (held.id && (cropOfSeed(held.id) || held.id === MIXED_SEED))
    return "crop.plant";
  if (ctx.machineHere && out.note) return "machine.start";
  return "world.place";
}

/** The call an animal makes, for feeding, petting and the morning. */
export const ANIMAL_CUES: Record<string, string> = {
  chicken: "animal.cluck",
  duck: "animal.chirp",
  rabbit: "animal.chirp",
  cow: "animal.moo",
  goat: "animal.baa",
  sheep: "animal.baa",
  pig: "animal.oink",
};
export const animalCue = (species: string): string =>
  ANIMAL_CUES[species] ?? "animal.cluck";

/** The in-game hours that ring the clock chime: noon, dusk and midnight. */
export const CHIME_MINUTES: readonly number[] = rules.chimeMinutes;

/** A snapshot of the world the director compares from one tick to the next. */
export interface WorldPulse {
  day: number;
  mapId: string;
  minutes: number;
  /** Items lying on the ground. */
  ground: number;
  /** Machines with a finished batch. */
  machinesDone: number;
}

/** The effects a change in the world earns: a chime as the clock passes the hour, a machine finishing, an item dropped. */
export function pulseCues(
  prev: WorldPulse | undefined,
  now: WorldPulse,
): string[] {
  if (!prev || prev.day !== now.day || prev.mapId !== now.mapId) return [];
  const out: string[] = [];
  if (
    now.minutes > prev.minutes &&
    CHIME_MINUTES.some((m) => prev.minutes < m && now.minutes >= m)
  )
    out.push("clock.chime");
  if (now.machinesDone > prev.machinesDone) out.push("machine.done");
  if (now.ground > prev.ground) out.push("item.drop");
  return out;
}

/** The sounds of the morning report: letters, achievements, sprinklers and the animals' calls. */
export function morningCues(r: {
  newMail: number;
  achievements: string[];
  sprinklers: number;
  eggs: number;
  barn: number;
}): string[] {
  const out: string[] = [];
  if (r.sprinklers > 0) out.push("sprinkler.run");
  if (r.eggs > 0) out.push("animal.cluck");
  if (r.barn > 0) out.push("animal.moo");
  if (r.newMail > 0) out.push("mail");
  if (r.achievements.length > 0) out.push("achievement");
  return out;
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
