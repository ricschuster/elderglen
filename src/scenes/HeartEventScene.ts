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
import type { GameState } from "../core/save";
import { HAT_KEY, villagerKey } from "./art-people";
import { PLAYER_KEY } from "./placeholder-textures";
import { WINDOW_FILL } from "./panel";
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

/** The in-world 16x16 people are drawn at this scale on the stage. */
const ACTOR_SCALE = 3;
/** Feet sit on row 14 of 16, as in the farm scene. */
const FEET = 0.875;

interface Actor {
  box: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Text;
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
    this.extra = [];
    this.awaitTap = undefined;
    this.over = false;
  }

  create(): void {
    audio.sfx("event.start");
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 0.97)
      .setInteractive();
    this.add.rectangle(480, 290, 760, 190, 0x6b4a2e, 1);
    this.box = this.add
      .rectangle(480, 440, 800, 130, 0x000000, 0.7)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setVisible(false);
    this.speaker = this.add.text(100, 390, "", {
      fontSize: "20px",
      color: "#ffe9a0",
    });
    this.line = this.add.text(100, 420, "", {
      fontSize: "20px",
      color: "#ffffff",
      wordWrap: { width: 760 },
    });
    this.fadeRect = this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x000000, 0)
      .setDepth(50);
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
    const panel = this.add.rectangle(480, 270, 620, 220, 0x1d3a2a, 1);
    panel.setStrokeStyle(2, 0xffffff, 0.8);
    const text = this.add
      .text(480, 220, warningText(this.event), {
        fontSize: "22px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);
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
      return [b, t];
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
      case "walk": {
        const a = this.actor(c.who);
        const p = this.markPoint(c.path);
        this.tweens.add({
          targets: a.box,
          x: p.x,
          y: p.y,
          duration: 600,
          onUpdate: () => this.tagFollow(c.who),
          onComplete: next,
        });
        return;
      }
      case "hide":
      case "show": {
        const a = this.actor(c.who);
        a.box.setVisible(c.cmd === "show");
        a.tag.setVisible(c.cmd === "show");
        a.hat?.setVisible(c.cmd === "show");
        return next();
      }
      case "pan":
        // PLACEHOLDER: no camera on the stage, so a pan outlines the person.
        this.outline(c.to);
        return next();
      case "face": {
        // The people have one frame, so facing flips it toward the other.
        const a = this.actor(c.who);
        const b = this.actor(c.toward);
        if (b.box.x !== a.box.x) a.box.setFlipX(b.box.x < a.box.x);
        return next();
      }
      case "snap":
        this.outline(undefined);
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
          .text(a.box.x, a.box.y - 18 * ACTOR_SCALE, `(${c.emote})`, {
            fontSize: "16px",
            color: "#ffe9a0",
          })
          .setOrigin(0.5);
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
        this.cameras.main.shake(c.ms, 0.004);
        return after(c.ms);
      case "sfx":
        // Event data may name any effect id; an unknown one is ignored.
        if (isSfx(c.id)) audio.sfx(c.id);
        return next();
      default:
        // pose, zoom, music, tint, weather: not drawn yet (no art or weather on the stage).
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
      objs.push(b, t);
    });
    const keys = ["ONE", "TWO", "THREE"] as const;
    c.answers.slice(0, 3).forEach((_, i) =>
      this.input.keyboard?.once(`keydown-${keys[i]}`, () => {
        if (!this.over && objs.some((o) => o.active)) pick(i);
      }),
    );
  }

  // ---- Stage ---------------------------------------------------------------

  private markPoint(name: string): { x: number; y: number } {
    let p = this.marks.get(name);
    if (!p) {
      p = SLOTS[this.marks.size % SLOTS.length]!;
      this.marks.set(name, p);
    }
    return p;
  }

  private actor(who: string): Actor {
    let a = this.actors.get(who);
    if (a) return a;
    const key = who === "player" ? PLAYER_KEY : villagerKey(who);
    const box = this.add
      .image(-100, -100, key)
      .setOrigin(0.5, FEET)
      .setScale(ACTOR_SCALE);
    const tag = this.add
      .text(-100, -100, actorName(who), {
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1);
    a = { box, tag };
    const worn = who === "player" ? this.state.wardrobe.worn : undefined;
    const def = worn ? hatById(worn) : undefined;
    if (def)
      a.hat = this.add
        .image(-100, -100, HAT_KEY)
        .setScale(ACTOR_SCALE)
        .setTint(Phaser.Display.Color.HexStringToColor(def.color).color);
    this.actors.set(who, a);
    return a;
  }

  private reposition(who: string, mark: string): void {
    const p = this.markPoint(mark);
    const a = this.actor(who);
    a.box.setPosition(p.x, p.y);
    this.tagFollow(who);
  }
  private tagFollow(who: string): void {
    const a = this.actor(who);
    a.tag.setPosition(a.box.x, a.box.y - 16 * ACTOR_SCALE);
    // The hat sits on the head, like the farm scene's (row 0 is 14 rows above the feet).
    a.hat?.setPosition(
      a.box.x,
      a.box.y - a.box.displayHeight * FEET + ACTOR_SCALE,
    );
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

  private close(): void {
    if (this.over) return;
    this.over = true;
    for (const o of this.extra) o.destroy();
    this.scene.stop();
    this.scene.resume("farm");
  }
}
