import Phaser from "phaser";
import { audio } from "../audio/engine";
import { isSfx } from "../core/audio";
import { finishWedding, isWeddingId, weddingEvent } from "../core/courtship";
import { weddingGuests } from "../core/divorce";
import { actorName, SceneRun, warningText, worldOf } from "../core/eventrun";
import {
  completeEvent,
  eventById,
  LINES,
  type Cmd,
  type HeartEvent,
} from "../core/heartevents";
import { hatById } from "../core/hats";
import { dateOf } from "../core/calendar";
import {
  layersAtTier,
  markTile,
  pathTiles,
  stageNames,
  type TiledMapJson,
} from "../core/map";
import type { GameState } from "../core/save";
import { cameraBounds, worldZoom } from "../core/view";
import { holdsOf } from "../core/worldflags";
import { mapFiles, maps } from "../content/maps";
import stages from "../content/heart-event-stages.json";
import { HAT_KEY, villagerKey } from "./art-people";
import { DEPTH, sortDepth } from "./depth";
import { drawMapArtBeside } from "./mapart";
import { MAP_PASSES } from "./map-passes";
import { PLAYER_KEY } from "./placeholder-textures";
import { WINDOW_FILL, WORLD_ZOOM_KEY } from "./panel";
import { STATE_KEY } from "./state";
import { resumeSave } from "./storage";

export interface HeartEventData {
  id: string;
  /** A replay from the journal: no Result group, nothing recorded. */
  replay?: boolean;
  /** Ask first (the warning and "not now"). Off for a replay. */
  warn?: boolean;
}

/** Event ids the player said "not now" to, by day. Kept for the session only. */
const declined = { day: -1, ids: [] as string[] };
export function declinedToday(day: number): string[] {
  return declined.day === day ? declined.ids : [];
}

const SLOTS = [
  { x: 480, y: 250 },
  { x: 330, y: 250 },
  { x: 630, y: 250 },
  { x: 180, y: 250 },
  { x: 780, y: 250 },
  { x: 405, y: 200 },
  { x: 555, y: 200 },
];

/** The in-world 16x16 people are drawn at this scale on the placeholder room (the real map draws them at 1). */
const ROOM_SCALE = 3;
/** A walk takes this long per tile (the farm player covers about five tiles a second). */
const TILE_MS = 220;
/** A pan or a zoom glides for this long. */
const GLIDE_MS = 700;

const STAGE_MAPS = stages.places as Record<string, { map: string }>;
/** Feet sit on row 14 of 16, as in the farm scene. */
const FEET = 0.875;

interface Actor {
  box: Phaser.GameObjects.Image;
  /** The name tag, on the placeholder room only. */
  tag?: Phaser.GameObjects.Text;
  /** Feet height at rest, so a pose can be undone. */
  baseY: number;
  /** Hidden by a `hide` (a `place` does not show it). */
  hidden: boolean;
  /** The worn hat, on the player only. */
  hat?: Phaser.GameObjects.Image;
}

/**
 * The heart event runner (note 62, #600 slice 2). An overlay over the paused
 * farm, like the summit scene: the stage is a placeholder room (stage marks per
 * map are not built, so each new mark name takes the next free slot), people
 * are the in-world sprites (the farm scene's textures) with a name tag. Control is taken for the whole scene. Enter,
 * Space or a tap goes on; Escape or the Skip button ends it early (a first run
 * still counts as seen and gives its rewards, a PLACEHOLDER rule). A first run
 * records the event only when it ends.
 */
export class HeartEventScene extends Phaser.Scene {
  private state!: GameState;
  private event!: HeartEvent;
  private replay = false;
  private warn = false;
  private run!: SceneRun;
  private token = 0;
  private actors = new Map<string, Actor>();
  private marks = new Map<string, { x: number; y: number }>();
  /** The event's own map, when its place has one: the real camera and tiles (note 62). */
  private json: TiledMapJson | undefined;
  private cam: Phaser.Cameras.Scene2D.Camera | undefined;
  private ts = 16;
  private baseZoom = 1;
  private releaseArt: (() => void) | undefined;
  private speaker!: Phaser.GameObjects.Text;
  private line!: Phaser.GameObjects.Text;
  private box!: Phaser.GameObjects.Rectangle;
  private fadeRect!: Phaser.GameObjects.Rectangle;
  private extra: Phaser.GameObjects.GameObject[] = [];
  private awaitTap: (() => void) | undefined;
  private over = false;

  constructor() {
    super("heart-event");
  }

  init(data: HeartEventData): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    // A wedding is built from the id; former spouses stand in as guests (note 12).
    this.event = isWeddingId(data.id)
      ? weddingEvent(
          data.id.slice("wedding-".length),
          weddingGuests(this.state, data.id.slice("wedding-".length)),
        )
      : eventById(data.id)!;
    this.replay = data.replay === true;
    this.warn = data.warn === true && !this.replay;
    this.run = SceneRun.of(this.event, this.replay, worldOf(this.state));
    this.token = 0;
    this.actors = new Map();
    this.marks = new Map();
    this.json = undefined;
    this.cam = undefined;
    this.releaseArt = undefined;
    this.extra = [];
    this.awaitTap = undefined;
    this.over = false;
  }

  create(): void {
    audio.sfx("event.start");
    this.buildStage();
    this.events.once("shutdown", () => this.endStage());
    // The UI sits on the menu camera (main), the map and the people on the stage camera.
    // The farm stays paused beneath, so its clock does not tick and nothing of it moves.
    this.ui(
      this.add
        .rectangle(
          480,
          270,
          WINDOW_FILL,
          WINDOW_FILL,
          0x10201a,
          this.cam ? 0 : 0.97,
        )
        .setInteractive(),
    );
    if (!this.cam) this.add.rectangle(480, 290, 760, 190, 0x6b4a2e, 1);
    this.box = this.ui(
      this.add
        .rectangle(480, 440, 800, 130, 0x000000, 0.7)
        .setStrokeStyle(2, 0xffffff, 0.6)
        .setVisible(false),
    );
    this.speaker = this.ui(
      this.add.text(100, 390, "", { fontSize: "20px", color: "#ffe9a0" }),
    );
    this.line = this.ui(
      this.add.text(100, 420, "", {
        fontSize: "20px",
        color: "#ffffff",
        wordWrap: { width: 760 },
      }),
    );
    this.fadeRect = this.ui(
      this.add
        .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x000000, 0)
        .setDepth(50),
    );
    const skip = this.add
      .text(930, 14, "Skip (Esc)", {
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#00000088",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(1, 0)
      .setDepth(60)
      .setInteractive({ useHandCursor: true });
    this.ui(skip);
    skip.on("pointerdown", () => this.skipAll());
    const go = (): void => {
      const f = this.awaitTap;
      this.awaitTap = undefined;
      f?.();
    };
    this.input.keyboard?.on("keydown-ENTER", go);
    this.input.keyboard?.on("keydown-SPACE", go);
    this.input.keyboard?.on("keydown-ESC", () => this.skipAll());
    this.input.on("pointerdown", go);
    if (this.warn) this.askFirst();
    else this.step();
  }

  // ---- The warning and "not now" -------------------------------------------

  private askFirst(): void {
    const panel = this.ui(this.add.rectangle(480, 270, 620, 220, 0x1d3a2a, 1));
    panel.setStrokeStyle(2, 0xffffff, 0.8);
    const text = this.ui(
      this.add
        .text(480, 220, warningText(this.event), {
          fontSize: "22px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: 560 },
        })
        .setOrigin(0.5),
    );
    const button = (
      x: number,
      label: string,
      key: string,
      fn: () => void,
    ): Phaser.GameObjects.GameObject[] => {
      const b = this.add
        .rectangle(x, 320, 220, 44, 0x3f7d3a, 1)
        .setStrokeStyle(2, 0xffffff, 0.8)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", (...a: unknown[]) => {
          (a[3] as Phaser.Types.Input.EventData).stopPropagation();
          fn();
        });
      const t = this.add
        .text(x, 320, `${key}. ${label}`, { fontSize: "20px", color: "#fff" })
        .setOrigin(0.5);
      return [this.ui(b), this.ui(t)];
    };
    const parts = [
      panel,
      text,
      ...button(390, "Go on", "1", () => accept()),
      ...button(570, "Not now", "2", () => refuse()),
    ];
    // The warning's key listeners must go with the warning, or a later choice
    // answered with 1 or 2 would also "go on" or "not now" it.
    const onOne = (): void => {
      if (!this.over) accept();
    };
    const onTwo = (): void => {
      if (!this.over) refuse();
    };
    const dropKeys = (): void => {
      this.input.keyboard?.off("keydown-ONE", onOne);
      this.input.keyboard?.off("keydown-TWO", onTwo);
    };
    const accept = (): void => {
      dropKeys();
      for (const p of parts) p.destroy();
      this.step();
    };
    const refuse = (): void => {
      dropKeys();
      // The event waits: nothing is recorded, and it is not offered again today.
      const day = this.state.day.clock.day;
      if (declined.day !== day) {
        declined.day = day;
        declined.ids = [];
      }
      declined.ids.push(this.event.id);
      this.close();
    };
    this.input.keyboard?.on("keydown-ONE", onOne);
    this.input.keyboard?.on("keydown-TWO", onTwo);
  }

  // ---- Running the commands -------------------------------------------------

  /** Show the current command. Each one calls `next` when it is done. */
  private step(): void {
    if (this.over) return;
    const c = this.run.current();
    if (!c) return this.finish();
    const t = ++this.token;
    const next = (): void => {
      if (t !== this.token || this.over) return;
      this.run.advance();
      this.step();
    };
    const after = (ms: number): void => void this.time.delayedCall(ms, next);
    this.show(c, next, after);
  }

  private show(c: Cmd, next: () => void, after: (ms: number) => void): void {
    switch (c.cmd) {
      case "place":
        this.reposition(c.who, c.mark);
        return next();
      case "walk":
        return this.walk(c.who, c.path, next);
      case "hide":
      case "show": {
        const a = this.actor(c.who);
        a.hidden = c.cmd === "hide";
        this.setShown(a, !a.hidden);
        return next();
      }
      case "pose":
        return this.pose(c.who, c.pose, next);
      case "pan": {
        const to = this.panTarget(c.to);
        if (this.cam && to) {
          this.cam.pan(to.x, to.y, GLIDE_MS, "Sine.easeInOut");
          return after(GLIDE_MS + 30);
        }
        // The placeholder room has no camera, so a pan outlines the person.
        this.outline(c.to);
        return next();
      }
      case "face": {
        // The people have one frame, so facing flips it toward the other.
        const a = this.actor(c.who);
        const b = this.actor(c.toward);
        if (b.box.x !== a.box.x) a.box.setFlipX(b.box.x < a.box.x);
        return next();
      }
      case "snap": {
        this.outline(undefined);
        if (!this.cam) return next();
        const home = this.panTarget("player");
        if (home) this.cam.pan(home.x, home.y, GLIDE_MS, "Sine.easeInOut");
        this.cam.zoomTo(this.baseZoom, GLIDE_MS, "Sine.easeInOut");
        return after(GLIDE_MS + 30);
      }
      case "zoom":
        if (this.cam) {
          this.cam.zoomTo(this.baseZoom * c.scale, GLIDE_MS, "Sine.easeInOut");
          return after(GLIDE_MS + 30);
        }
        return next();
      case "hold":
      case "wait":
        return after(c.ms);
      case "say":
        this.outline(c.who);
        this.box.setVisible(true);
        this.speaker.setText(actorName(c.who));
        this.line.setText(LINES[c.line] ?? c.line);
        this.awaitTap = next;
        return;
      case "emote": {
        const a = this.actor(c.who);
        const e = this.add
          .text(a.box.x, a.box.y - 18 * this.unit(), `(${c.emote})`, {
            fontSize: "16px",
            color: "#ffe9a0",
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.fx);
        if (this.cam) {
          e.setScale(1 / this.baseZoom);
          this.world(e);
        } else this.ui(e);
        this.extra.push(e);
        this.time.delayedCall(700, () => e.destroy());
        return after(750);
      }
      case "choose":
        return this.showChoices(c);
      case "fade":
        this.tweens.add({
          targets: this.fadeRect,
          fillAlpha: c.to === "black" ? 1 : 0,
          duration: 400,
          onComplete: next,
        });
        return;
      case "shake":
        (this.cam ?? this.cameras.main).shake(c.ms, 0.004);
        return after(c.ms);
      case "sfx":
        // Event data may name any effect id; an unknown one is ignored.
        if (isSfx(c.id)) audio.sfx(c.id);
        return next();
      default:
        // music, tint, weather: not drawn yet (no weather on the stage).
        // Music is the director's: the scene always plays the `heart-event` slot, so the
        // event's own music ids (aliases in audio-rules.json) need no handling here.
        // The Result group is applied at the end.
        return next();
    }
  }

  private showChoices(c: Extract<Cmd, { cmd: "choose" }>): void {
    this.box.setVisible(true);
    this.speaker.setText("");
    this.line.setText("");
    const objs: Phaser.GameObjects.GameObject[] = [];
    const pick = (i: number): void => {
      for (const o of objs) o.destroy();
      this.token += 1;
      this.run.choose(i);
      this.step();
    };
    c.answers.forEach((a, i) => {
      const y = 380 + i * 44;
      const b = this.add
        .rectangle(480, y, 700, 38, 0x3f7d3a, 1)
        .setStrokeStyle(2, 0xffffff, 0.8)
        .setDepth(10)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", (...x: unknown[]) => {
          (x[3] as Phaser.Types.Input.EventData).stopPropagation();
          pick(i);
        });
      const t = this.add
        .text(480, y, `${i + 1}. ${LINES[a.line] ?? a.line}`, {
          fontSize: "18px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(11);
      objs.push(this.ui(b), this.ui(t));
    });
    const keys = ["ONE", "TWO", "THREE"] as const;
    c.answers.slice(0, 3).forEach((_, i) =>
      this.input.keyboard?.once(`keydown-${keys[i]}`, () => {
        if (!this.over && objs.some((o) => o.active)) pick(i);
      }),
    );
  }

  // ---- Stage ---------------------------------------------------------------

  /** Mark a UI object: the stage camera does not draw it. */
  private ui<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.cam?.ignore(o);
    return o;
  }
  /** Mark a world object: the menu (UI) camera does not draw it. */
  private world<T extends Phaser.GameObjects.GameObject>(o: T): T {
    if (this.cam) this.cameras.main.ignore(o);
    return o;
  }
  /** Pixels per sprite pixel: 1 on the real map (the camera zooms), 3 on the placeholder room. */
  private unit(): number {
    return this.cam ? 1 : ROOM_SCALE;
  }

  /**
   * Draw the event's own map with its own camera under the menu camera (note 62). A place
   * with no map keeps the brown placeholder room. The farm stays paused behind it, so
   * the clock is frozen and the player, map and camera are as they were when it ends.
   */
  private buildStage(): void {
    const id = STAGE_MAPS[this.event.place]?.map;
    const json = id ? mapFiles[id] : undefined;
    if (!id || !json) return;
    const holds = holdsOf(this.state);
    const day = this.state.day.clock.day;
    const { art, release } = drawMapArtBeside(
      this,
      {
        mapId: id,
        json,
        layers: layersAtTier(json, 0, holds).filter(
          (l) => l.type === "tilelayer" && l.visible !== false,
        ),
        outdoors: json.layers.some((l) => l.name === "objects"),
        season: dateOf(day).season,
      },
      MAP_PASSES,
    );
    this.releaseArt = release;
    this.json = json;
    this.ts = json.tilewidth;
    const cam = this.cameras.add(
      0,
      0,
      this.scale.gameSize.width,
      this.scale.gameSize.height,
    );
    // Drawn first, so the menu camera's dialogue lies over it.
    this.cameras.cameras.splice(this.cameras.cameras.indexOf(cam), 1);
    this.cameras.cameras.unshift(cam);
    cam.setBackgroundColor(0x000000);
    this.cam = cam;
    for (const layer of art) for (const o of layer.objects) this.world(o);
    this.layoutStage();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutStage, this);
    const first =
      this.event.scene.find((c) => c.cmd === "place" && c.who === "player") ??
      this.event.scene.find((c) => c.cmd === "place");
    const at = first?.cmd === "place" ? this.markPoint(first.mark) : undefined;
    if (at) cam.centerOn(at.x, at.y);
  }

  /** Size the stage camera to the window, and keep the map within its bounds. */
  private layoutStage(): void {
    const cam = this.cam;
    if (!cam) return;
    const { width, height } = this.scale.gameSize;
    const percent =
      (this.registry.get(WORLD_ZOOM_KEY) as number | undefined) ?? 100;
    this.baseZoom = worldZoom(percent, width, height);
    const built = maps.get(this.mapIdOf()).bounds;
    const ts = this.ts;
    const b = cameraBounds(
      built.w * ts,
      built.h * ts,
      width / this.baseZoom,
      height / this.baseZoom,
      built.x * ts,
      built.y * ts,
    );
    cam
      .setSize(width, height)
      .setZoom(this.baseZoom)
      .setBounds(b.x, b.y, b.w, b.h);
  }

  private mapIdOf(): string {
    return STAGE_MAPS[this.event.place]!.map;
  }

  /** The feet of a person standing on a tile, in world pixels. */
  private tilePoint(t: { x: number; y: number }): { x: number; y: number } {
    return { x: (t.x + 0.5) * this.ts, y: (t.y + 1) * this.ts - 2 };
  }

  private markPoint(name: string): { x: number; y: number } {
    let p = this.marks.get(name);
    if (p) return p;
    if (this.json) {
      let t = markTile(this.json, name);
      if (!t) {
        // A name the map does not have (the test forbids it): stand on its first mark.
        console.warn(`Heart event ${this.event.id}: no mark "${name}"`);
        const first = stageNames(this.json).marks[0];
        t = (first ? markTile(this.json, first) : undefined) ?? { x: 1, y: 1 };
      }
      p = this.tilePoint(t);
    } else p = SLOTS[this.marks.size % SLOTS.length]!;
    this.marks.set(name, p);
    return p;
  }

  /** Where the camera goes for a pan or a snap: a person on the stage, else a mark. */
  private panTarget(name: string): { x: number; y: number } | undefined {
    const a = this.actors.get(name);
    if (a?.box.visible) return { x: a.box.x, y: a.box.y - 8 };
    return this.json && markTile(this.json, name)
      ? this.markPoint(name)
      : undefined;
  }

  private actor(who: string): Actor {
    let a = this.actors.get(who);
    if (a) return a;
    const unit = this.unit();
    const key = who === "player" ? PLAYER_KEY : villagerKey(who);
    const box = this.world(
      this.add
        .image(-100, -100, key)
        .setOrigin(0.5, FEET)
        .setScale(unit)
        .setVisible(false),
    );
    a = { box, baseY: -100, hidden: false };
    if (!this.cam)
      a.tag = this.add
        .text(-100, -100, actorName(who), {
          fontSize: "12px",
          color: "#ffffff",
          backgroundColor: "#000000aa",
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setVisible(false);
    const worn = who === "player" ? this.state.wardrobe.worn : undefined;
    const def = worn ? hatById(worn) : undefined;
    if (def)
      a.hat = this.world(
        this.add
          .image(-100, -100, HAT_KEY)
          .setScale(unit)
          .setTint(Phaser.Display.Color.HexStringToColor(def.color).color)
          .setVisible(false),
      );
    this.actors.set(who, a);
    return a;
  }

  private setShown(a: Actor, shown: boolean): void {
    a.box.setVisible(shown);
    a.tag?.setVisible(shown);
    a.hat?.setVisible(shown);
  }

  private reposition(who: string, mark: string): void {
    const p = this.markPoint(mark);
    const a = this.actor(who);
    this.undoPose(a);
    a.box.setPosition(p.x, p.y);
    a.baseY = p.y;
    if (!a.hidden) this.setShown(a, true);
    this.follow(who);
  }

  /** Keep the tag, the hat and the draw order with the person. */
  private follow(who: string): void {
    const a = this.actor(who);
    const unit = this.unit();
    a.tag?.setPosition(a.box.x, a.box.y - 16 * unit);
    // The hat sits on the head, like the farm scene's (row 0 is 14 rows above the feet).
    a.hat?.setPosition(a.box.x, a.box.y - a.box.displayHeight * FEET + unit);
    if (this.cam) {
      a.box.setDepth(sortDepth(a.baseY));
      a.hat?.setDepth(sortDepth(a.baseY) + 0.01);
    }
  }

  private undoPose(a: Actor): void {
    this.tweens.killTweensOf(a.box);
    a.box.setAngle(0).setY(a.baseY);
  }

  /** The tiles to cross for a named path, one step at a time, starting where the person stands. */
  private walkSteps(
    a: Actor,
    path: string,
  ): { x: number; y: number }[] | undefined {
    const tiles = this.json ? pathTiles(this.json, path) : undefined;
    if (!tiles) return undefined;
    const ts = this.ts;
    let cur = {
      x: Math.floor(a.box.x / ts),
      y: Math.floor((a.box.y + 2) / ts) - 1,
    };
    const out = [cur];
    for (const goal of tiles) {
      while (cur.x !== goal.x || cur.y !== goal.y) {
        const dx = goal.x - cur.x;
        const dy = goal.y - cur.y;
        cur =
          Math.abs(dx) >= Math.abs(dy)
            ? { x: cur.x + Math.sign(dx), y: cur.y }
            : { x: cur.x, y: cur.y + Math.sign(dy) };
        out.push(cur);
      }
    }
    return out;
  }

  /** `walk`: tile by tile along the named path, facing the way they go. */
  private walk(who: string, path: string, next: () => void): void {
    const a = this.actor(who);
    if (!this.json) {
      // The placeholder room: slide to the slot.
      const p = this.markPoint(path);
      this.tweens.add({
        targets: a.box,
        x: p.x,
        y: p.y,
        duration: 600,
        onUpdate: () => this.follow(who),
        onComplete: next,
      });
      return;
    }
    const steps = this.walkSteps(a, path);
    if (!steps) {
      console.warn(`Heart event ${this.event.id}: no path "${path}"`);
      return next();
    }
    if (steps.length < 2) return next();
    this.undoPose(a);
    const points = steps.map((t) => this.tilePoint(t));
    const n = points.length - 1;
    const progress = { v: 0 };
    this.tweens.add({
      targets: progress,
      v: n,
      duration: n * TILE_MS,
      ease: "Linear",
      onUpdate: () => {
        const i = Math.min(n - 1, Math.floor(progress.v));
        const f = progress.v - i;
        const p = points[i]!;
        const q = points[i + 1]!;
        if (q.x !== p.x) a.box.setFlipX(q.x < p.x);
        a.box.setPosition(p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f);
        a.baseY = a.box.y;
        this.follow(who);
      },
      onComplete: () => {
        const end = points[n]!;
        a.box.setPosition(end.x, end.y);
        a.baseY = end.y;
        this.follow(who);
        next();
      },
    });
  }

  /** `pose`: a small effect on the one-frame sprite (note 62). */
  private pose(who: string, pose: string, next: () => void): void {
    const a = this.actor(who);
    this.undoPose(a);
    const u = this.unit();
    const lean = a.box.flipX ? -1 : 1;
    const run = (props: object, ms: number, extra: object = {}): void => {
      this.tweens.add({
        targets: a.box,
        ...props,
        duration: ms,
        ease: "Sine.easeInOut",
        onUpdate: () => this.follow(who),
        onComplete: next,
        ...extra,
      });
    };
    switch (pose) {
      case "sit":
        return run({ y: a.baseY + 3 * u }, 250);
      case "slump":
        return run({ y: a.baseY + 2 * u, angle: 14 * lean }, 400);
      case "bow":
        return run({ angle: 28 * lean }, 300, { yoyo: true, hold: 350 });
      case "surprise":
        return run({ y: a.baseY - 6 * u }, 140, { yoyo: true, repeat: 1 });
      case "laugh":
        return run({ y: a.baseY - 3 * u }, 100, { yoyo: true, repeat: 3 });
      default:
        return next();
    }
  }

  private outline(who: string | undefined): void {
    for (const [id, a] of this.actors)
      a.box.setAlpha(who === undefined || who === id ? 1 : 0.75);
  }

  // ---- Ending --------------------------------------------------------------

  private skipAll(): void {
    if (this.over || !this.run || this.run.finished) return;
    this.token += 1;
    this.awaitTap = undefined;
    this.run.skip();
    this.finish();
  }

  /** The scene is over: record a first run and give its results. */
  private finish(): void {
    if (this.over) return;
    this.token += 1;
    this.fadeRect.setFillStyle(0x000000, 0);
    if (this.replay) return this.close();
    if (isWeddingId(this.event.id)) finishWedding(this.state);
    const words = completeEvent(
      this.state,
      this.event,
      this.state.day.clock.day,
    );
    resumeSave(this.state);
    if (words.length === 0) return this.close();
    this.box.setVisible(true);
    this.speaker.setText("You were given");
    this.line.setText(words.join(", "));
    this.awaitTap = () => this.close();
  }

  /** Give the camera and the map textures back (the farm's own are untouched). */
  private endStage(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutStage, this);
    if (this.cam) this.cameras.remove(this.cam);
    this.cam = undefined;
    this.releaseArt?.();
    this.releaseArt = undefined;
  }

  private close(): void {
    if (this.over) return;
    this.over = true;
    for (const o of this.extra) o.destroy();
    this.endStage();
    this.scene.stop();
    this.scene.resume("farm");
  }
}
