/**
 * WebAudio playback for effects, ambient loops and music (note 107, ADR 0017). One engine for the whole
 * game: `audio` below. It never throws: without an AudioContext (tests, old WebViews) or before the
 * first user gesture it only records what it was asked to play, so the director and the playtests can
 * still check the events. Rules (what plays when) are in `src/core/audio.ts`.
 *
 * Buses: sfx, ambient and music each feed `master`; music also passes a duck gain so a stinger can
 * lower it for a moment. Files are fetched with XMLHttpRequest, which works from the Vite server, the
 * Capacitor WebView and the Electron `file:` page (fetch does not support `file:`).
 */
import {
  AMBIENT,
  AUDIO_TIMING,
  VoiceGate,
  DEFAULT_AUDIO,
  MUSIC,
  SFX,
  busGain,
  ducks,
  jitterOf,
  pickVariant,
  type AmbientLayer,
  type AudioSettings,
} from "../core/audio";

/** One recorded request, for the audition page and the playtests. */
export interface AudioEvent {
  t: number;
  kind: "sfx" | "music" | "ambient";
  id: string;
}

interface Playing {
  id: string;
  src: AudioBufferSourceNode;
  gain: GainNode;
}

const LOG_LIMIT = 400;

function xhrBytes(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("GET", url);
    x.responseType = "arraybuffer";
    x.onload = () =>
      x.status === 200 || x.status === 0
        ? resolve(x.response as ArrayBuffer)
        : reject(new Error(`HTTP ${x.status} for ${url}`));
    x.onerror = () => reject(new Error(`could not load ${url}`));
    x.send();
  });
}

/** XHR first (it reads `file:` pages in a wrapper), then fetch as a second try. */
function loadBytes(url: string): Promise<ArrayBuffer> {
  return xhrBytes(url).catch(async (first) => {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.arrayBuffer();
    } catch {
      throw first;
    }
  });
}

export class AudioEngine {
  settings: AudioSettings = { ...DEFAULT_AUDIO };
  /** Everything asked for, newest last (capped). */
  readonly events: AudioEvent[] = [];
  /** Loading or decoding failures, kept so a broken file is findable. */
  readonly errors: string[] = [];
  private ctx: AudioContext | undefined;
  private master: GainNode | undefined;
  private buses: Record<"music" | "sfx" | "ambient", GainNode> | undefined;
  private duckNode: GainNode | undefined;
  private buffers = new Map<string, Promise<AudioBuffer | undefined>>();
  private gate = new VoiceGate();
  private lastSfxAt = -1e9;
  private lastVariant = new Map<string, number>();
  private decoded = 0;
  private music: Playing | undefined;
  private ambient = new Map<string, Playing>();
  private wantMusic: string | undefined;
  private wantFast = false;
  private wantAmbient: AmbientLayer[] = [];
  private musicToken = 0;
  private unlocked = false;
  private hidden = false;
  private rng: () => number = Math.random;

  /** The music id the engine is playing or about to play. */
  get currentMusic(): string | undefined {
    return this.wantMusic;
  }
  get currentAmbient(): string[] {
    return this.wantAmbient.map((a) => a.id);
  }
  get isUnlocked(): boolean {
    return this.unlocked;
  }
  /** The AudioContext state, or `none` before the first gesture or without WebAudio. */
  get state(): string {
    return this.ctx?.state ?? "none";
  }
  /** How many audio files have been decoded so far (for the playtest). */
  get loaded(): number {
    return this.decoded;
  }

  private log(kind: AudioEvent["kind"], id: string): void {
    this.events.push({ t: Date.now(), kind, id });
    if (this.events.length > LOG_LIMIT) this.events.splice(0, 100);
  }

  /** Listen for the first gesture (autoplay policy) and for the tab being hidden. Safe to call twice. */
  attach(target: Window = window): void {
    const go = () => this.unlock();
    for (const e of ["pointerdown", "keydown", "touchend"])
      target.addEventListener(e, go, { passive: true });
    target.document.addEventListener("visibilitychange", () => {
      this.hidden = target.document.hidden;
      void this.syncRunState();
    });
  }

  private async syncRunState(): Promise<void> {
    if (!this.ctx) return;
    try {
      if (this.hidden && this.ctx.state === "running") await this.ctx.suspend();
      else if (!this.hidden && this.ctx.state === "suspended" && this.unlocked)
        await this.ctx.resume();
    } catch {
      // A refused resume is retried on the next gesture.
    }
  }

  /** Create or resume the context. Called from a user gesture. */
  unlock(): void {
    if (this.unlocked && this.ctx?.state === "running") return;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        const master = ctx.createGain();
        const duck = ctx.createGain();
        const buses = {
          music: ctx.createGain(),
          sfx: ctx.createGain(),
          ambient: ctx.createGain(),
        };
        buses.music.connect(duck).connect(master);
        buses.sfx.connect(master);
        buses.ambient.connect(master);
        master.connect(ctx.destination);
        this.ctx = ctx;
        this.master = master;
        this.duckNode = duck;
        this.buses = buses;
        this.applySettings(this.settings, true);
      }
      this.unlocked = true;
      if (this.ctx.state === "suspended" && !this.hidden)
        void this.ctx.resume().catch(() => {
          this.unlocked = false;
        });
      this.setMusic(this.wantMusic, this.wantFast);
      this.setAmbient(this.wantAmbient);
      this.preload();
    } catch (e) {
      this.errors.push(`unlock: ${String(e)}`);
    }
  }

  applySettings(s: AudioSettings, instant = false): void {
    this.settings = { ...s };
    if (!this.ctx || !this.buses) return;
    const t = this.ctx.currentTime;
    for (const bus of ["music", "sfx", "ambient"] as const) {
      const param = this.buses[bus].gain;
      const v = busGain(this.settings, bus);
      if (instant) param.setValueAtTime(v, t);
      else param.setTargetAtTime(v, t, 0.04);
    }
  }

  private buffer(file: string): Promise<AudioBuffer | undefined> {
    let p = this.buffers.get(file);
    if (!p) {
      const ctx = this.ctx;
      if (!ctx) return Promise.resolve(undefined);
      const url = new URL(`audio/${file}`, document.baseURI).href;
      p = loadBytes(url)
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => {
          this.decoded++;
          return buf;
        })
        .catch((e) => {
          this.errors.push(`${file}: ${String(e)}`);
          return undefined;
        });
      this.buffers.set(file, p);
    }
    return p;
  }

  /** Warm the effects in the background after the first gesture so the first hit is not late. */
  private preload(): void {
    const files = Object.values(SFX).flatMap((s) => s.files);
    let i = 0;
    const next = () => {
      if (i >= files.length) return;
      const batch = files.slice(i, (i += 6));
      void Promise.all(batch.map((f) => this.buffer(f))).then(() =>
        setTimeout(next, 30),
      );
    };
    setTimeout(next, 500);
  }

  /** Play an effect by id. Unknown ids are recorded and ignored. */
  sfx(id: string): void {
    const def = SFX[id];
    this.log("sfx", id);
    if (!def) {
      this.errors.push(`unknown sfx ${id}`);
      return;
    }
    if (!this.ctx || !this.unlocked || this.hidden || this.settings.muted)
      return;
    if (!this.gate.start(id, performance.now(), def.cooldownMs)) return;
    this.lastSfxAt = performance.now();
    const v = pickVariant(def.files.length, this.lastVariant.get(id), this.rng);
    this.lastVariant.set(id, v);
    const asked = performance.now();
    void this.buffer(def.files[v]!).then((buf) => {
      const ctx = this.ctx;
      if (!buf || !ctx || !this.buses || performance.now() - asked > 400) {
        this.gate.end(id);
        return;
      }
      const j = jitterOf(def, this.rng);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = j.rate;
      const g = ctx.createGain();
      g.gain.value = def.gain * j.gain;
      src.connect(g).connect(this.buses.sfx);
      src.onended = () => {
        this.gate.end(id);
        g.disconnect();
      };
      src.start();
    });
    if (ducks(id)) this.duck();
  }

  /** True when no effect has started in the last `ms` (the HUD uses it to skip a duplicate cue). */
  quietFor(ms: number): boolean {
    return performance.now() - this.lastSfxAt >= ms;
  }

  /** Lower the music for a moment under a stinger. */
  duck(): void {
    if (!this.ctx || !this.duckNode) return;
    const p = this.duckNode.gain;
    const t = this.ctx.currentTime;
    const low = 1 - AUDIO_TIMING.duckAmount;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(low, t, 0.05);
    p.setTargetAtTime(1, t + AUDIO_TIMING.duckMs / 1000, 0.4);
  }

  /** Play a music slot (undefined stops it), cross fading from the current one. */
  setMusic(id: string | undefined, fast = false): void {
    const changed = id !== this.wantMusic;
    this.wantMusic = id;
    this.wantFast = fast;
    if (changed && id) this.log("music", id);
    if (!this.ctx || !this.unlocked || !this.buses) return;
    if (this.music?.id === id) return;
    const token = ++this.musicToken;
    const fadeS =
      (fast ? AUDIO_TIMING.stingerFadeMs : AUDIO_TIMING.crossfadeMs) / 1000;
    const def = id ? MUSIC[id] : undefined;
    if (!id || !def) {
      this.fadeOut(this.music, fadeS);
      this.music = undefined;
      return;
    }
    void this.buffer(def.file).then((buf) => {
      const ctx = this.ctx;
      if (!buf || !ctx || !this.buses || token !== this.musicToken) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(def.gain, now + fadeS);
      src.connect(g).connect(this.buses.music);
      if (
        def.loop &&
        def.loopStart !== undefined &&
        def.loopEnd !== undefined
      ) {
        src.loop = true;
        src.loopStart = def.loopStart;
        src.loopEnd = def.loopEnd;
        src.start(now, def.loopStart);
      } else src.start(now);
      this.fadeOut(this.music, fadeS);
      this.music = { id, src, gain: g };
    });
  }

  private fadeOut(p: Playing | undefined, fadeS: number): void {
    if (!p || !p.src || !this.ctx) return;
    const now = this.ctx.currentTime;
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(p.gain.gain.value, now);
    p.gain.gain.linearRampToValueAtTime(0, now + fadeS);
    p.src.stop(now + fadeS + 0.05);
    p.src.onended = () => p.gain.disconnect();
  }

  /** Set the ambient layers; layers not listed fade out. */
  setAmbient(layers: AmbientLayer[]): void {
    const same =
      layers.length === this.wantAmbient.length &&
      layers.every(
        (l, i) =>
          this.wantAmbient[i]?.id === l.id &&
          this.wantAmbient[i]?.level === l.level,
      );
    if (!same)
      for (const l of layers)
        if (!this.wantAmbient.some((w) => w.id === l.id))
          this.log("ambient", l.id);
    this.wantAmbient = layers;
    if (!this.ctx || !this.unlocked || !this.buses) return;
    const fadeS = AUDIO_TIMING.ambientFadeMs / 1000;
    const want = new Map(layers.map((l) => [l.id, l.level]));
    for (const [id, p] of this.ambient) {
      if (!want.has(id)) {
        this.fadeOut(p, fadeS);
        this.ambient.delete(id);
      }
    }
    for (const [id, level] of want) {
      const def = AMBIENT[id];
      if (!def) continue;
      const have = this.ambient.get(id);
      if (have?.gain) {
        const now = this.ctx.currentTime;
        have.gain.gain.setTargetAtTime(def.gain * level, now, fadeS / 3);
        continue;
      }
      if (have) continue; // still loading: it will start at the level asked for last
      // Reserve the slot at once so a second call does not start a second copy.
      const reserved: Playing = {
        id,
        src: undefined as never,
        gain: undefined as never,
      };
      this.ambient.set(id, reserved);
      void this.buffer(def.file).then((buf) => {
        const ctx = this.ctx;
        if (!buf || !ctx || !this.buses || this.ambient.get(id) !== reserved)
          return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.loopStart = def.loopStart;
        src.loopEnd = def.loopEnd;
        const g = ctx.createGain();
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(
          def.gain * (this.wantAmbient.find((l) => l.id === id)?.level ?? 0),
          now + fadeS,
        );
        src.connect(g).connect(this.buses.ambient);
        src.start(now, def.loopStart);
        reserved.src = src;
        reserved.gain = g;
      });
    }
  }

  /** Stop everything (used by the audition page). */
  stopAll(): void {
    this.setMusic(undefined);
    this.setAmbient([]);
  }
}

export const audio = new AudioEngine();
