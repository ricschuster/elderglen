import Phaser from "phaser";
import { dateOf } from "../core/calendar";
import {
  CAST_MINUTES,
  Fight,
  barWidth,
  bite,
  distanceShare,
  landFish,
  landing,
  rodById,
  type Assist,
  type Bite,
  type CatchResult,
  type RodDef,
} from "../core/fishing";
import { isRaining } from "../core/weather";
import type { Quality } from "../core/quality";
import type { GameState } from "../core/save";
import { frame } from "./panel";
import { STATE_KEY } from "./state";
import { loadDeviceSettings } from "./storage";

/** What the farm hands over when a rod is used facing water. */
export interface FishingData {
  rod: string;
  /** Distances in tiles from the player where the line of the cast crosses water. */
  water: number[];
  /** The tile at the player's feet, where a fish lies if the backpack is full. */
  at: { x: number; y: number };
}

type Phase = "aim" | "wait" | "hook" | "fight" | "result";

/** Seconds the charge takes to reach full power. */
const CHARGE_SECONDS = 1.2;
/** The wait for a bite, in seconds. Bait will shorten it (a later slice). */
const WAIT: [number, number] = [1.5, 4.5];
/** The window to hook a bite, in seconds, wider with assist. */
const HOOK_WINDOW = [1.4, 3] as const;

const QUALITY_LABEL: Record<Quality, string> = {
  normal: "Normal",
  silver: "Silver",
  gold: "Gold",
};

const TRACK = { x: 560, y: 90, w: 44, h: 340 };

/**
 * The fishing screen (note 21, slices 1 and 2): hold to charge a cast and
 * release, wait for a bite, press to hook it, then keep the bar on the fish
 * until the meter fills. Hold Space or press and hold anywhere to lift the bar.
 * The rules are in `core/fishing.ts`; this scene reads the input and draws.
 * The first catch cannot fail. The farm is paused behind it.
 */
export class FishingScene extends Phaser.Scene {
  private state!: GameState;
  private cfg!: FishingData;
  private rod!: RodDef;
  private assist: Assist = 0;
  private phase: Phase = "aim";
  private held = false;
  private charge = 0;
  private timer = 0;
  private pending: Bite = { kind: "none" };
  private distance = 0;
  private fight: Fight | undefined;
  private tutorial = false;
  private text!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private meter!: Phaser.GameObjects.Graphics;
  private bang!: Phaser.GameObjects.Text;

  constructor() {
    super("fishing");
  }

  init(data: FishingData): void {
    this.cfg = data;
  }

  create(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.rod = rodById(this.cfg.rod)!;
    this.assist = loadDeviceSettings().fishingAssist;
    this.phase = "aim";
    this.held = false;
    this.charge = 0;
    this.fight = undefined;
    frame(this, "Fishing", () => this.close());
    this.meter = this.add.graphics();
    this.text = this.add.text(24, 70, "", {
      fontSize: "22px",
      color: "#ffffff",
      wordWrap: { width: 480 },
    });
    this.info = this.add.text(24, 400, "", {
      fontSize: "16px",
      color: "#ffffffcc",
      wordWrap: { width: 500 },
    });
    this.bang = this.add
      .text(480, 250, "!", { fontSize: "96px", color: "#ffe9a0" })
      .setOrigin(0.5)
      .setVisible(false);
    this.add.text(
      24,
      510,
      "Space or press and hold: charge and lift   Esc: stop fishing",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    // A tap anywhere is the one input, held or released.
    this.input.on("pointerdown", () => this.press());
    this.input.on("pointerup", () => this.release());
    const kb = this.input.keyboard;
    kb?.on("keydown-SPACE", () => this.press());
    kb?.on("keyup-SPACE", () => this.release());
    this.showAim();
  }

  private press(): void {
    if (this.held) return;
    this.held = true;
    if (this.phase === "aim") {
      this.charge = 0;
      // With assist the cast needs no charge: a press casts.
      if (this.assist > 0) this.cast();
    } else if (this.phase === "hook") this.hooked();
    else if (this.phase === "result") this.showAim();
  }

  private release(): void {
    if (!this.held) return;
    this.held = false;
    if (this.phase === "aim" && this.assist === 0 && this.charge > 0)
      this.cast();
  }

  private showAim(): void {
    this.phase = "aim";
    this.charge = 0;
    this.fight = undefined;
    this.bang.setVisible(false);
    if (this.state.day.over) return this.close();
    const first = this.state.fishing.total === 0;
    this.text.setText(
      this.assist > 0
        ? "Press to cast."
        : "Hold to charge the cast, release to throw. A longer cast reaches bigger fish.",
    );
    this.info.setText(
      first
        ? "Your first catch cannot get away. Keep the green bar over the fish while the meter fills."
        : "",
    );
    this.draw();
  }

  private cast(): void {
    const spot = landing(
      this.cfg.water,
      this.rod.range,
      Math.min(this.charge, 1),
      this.assist,
    );
    if (spot === undefined) {
      this.text.setText("The line falls on dry ground. Try again.");
      this.charge = 0;
      return;
    }
    this.distance = distanceShare(spot, this.rod.range);
    const g = this.state;
    const { season } = dateOf(g.day.clock.day);
    this.tutorial = g.fishing.total === 0;
    this.pending = bite(
      "river",
      { season, minutes: g.day.clock.minutes, raining: isRaining(g.weather) },
      this.rod,
      g.skills.level("fishing"),
      Math.random,
      this.tutorial,
    );
    // A cast takes game time, win or lose.
    g.day.act(0, CAST_MINUTES);
    this.phase = "wait";
    const [lo, hi] = WAIT;
    this.timer = lo + Math.random() * (hi - lo);
    this.text.setText("Waiting for a bite...");
    this.info.setText("");
    this.draw();
  }

  private biteArrives(): void {
    if (this.pending.kind === "none") {
      this.text.setText("Nothing is biting. Cast again.");
      return this.rest();
    }
    this.phase = "hook";
    this.timer = HOOK_WINDOW[this.assist > 0 ? 1 : 0];
    this.bang.setVisible(true);
    this.text.setText("A bite! Press now.");
  }

  /** Back to the cast after a miss. A short pause so the message can be read. */
  private rest(): void {
    this.phase = "result";
    this.bang.setVisible(false);
    this.draw();
  }

  private hooked(): void {
    this.bang.setVisible(false);
    const b = this.pending;
    if (b.kind === "lost") {
      this.text.setText(
        "Something heavy took the line and was gone. It needs more skill than you have yet.",
      );
      return this.rest();
    }
    if (b.kind !== "fish") return;
    if (this.assist === 2) {
      // The fight is skipped: no bar, and never a perfect catch.
      return this.land(b.fish.id, false);
    }
    this.phase = "fight";
    this.fight = new Fight(
      {
        behaviour: b.fish.behaviour,
        difficulty: b.fish.difficulty,
        width: barWidth(this.rod, this.assist),
        assist: this.assist,
        tutorial: this.tutorial,
      },
      Math.random,
    );
    this.text.setText("Keep the bar on the fish!");
  }

  private land(id: string, perfect: boolean): void {
    const b = this.pending;
    if (b.kind !== "fish" || b.fish.id !== id) return;
    const g = this.state;
    const r = landFish(g, b.fish, {
      perfect,
      distance: this.distance,
      random: Math.random,
      at: this.cfg.at,
    });
    this.text.setText(this.describe(r));
    this.info.setText(
      this.state.fishing.total === 1 && r.first
        ? "The first catch is always an easy one. Cast again with Space."
        : "Cast again with Space.",
    );
    this.rest();
  }

  private describe(r: CatchResult): string {
    const lines = [
      `You caught a ${r.fish.name}! ${r.length} cm.`,
      r.quality === "normal" ? "" : `${QUALITY_LABEL[r.quality]} quality.`,
      r.perfect ? "A perfect catch!" : "",
      r.first ? "First catch!" : r.record ? "New record!" : "",
      `+${r.xp} fishing XP.`,
      r.levelUp ? `Fishing is now level ${r.levelUp}.` : "",
      r.dropped ? "Your backpack is full, so it lies at your feet." : "",
    ];
    return lines.filter((l) => l).join("\n");
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    if (this.phase === "aim" && this.held && this.assist === 0)
      this.charge = Math.min(this.charge + dt / CHARGE_SECONDS, 1);
    else if (this.phase === "wait") {
      this.timer -= dt;
      if (this.timer <= 0) this.biteArrives();
    } else if (this.phase === "hook") {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.bang.setVisible(false);
        this.text.setText("It got away. Cast again.");
        this.rest();
      }
    } else if (this.phase === "fight" && this.fight) {
      this.fight.step(dt, this.held, Math.random);
      if (this.fight.state === "caught" && this.pending.kind === "fish")
        this.land(this.pending.fish.id, this.fight.perfect);
      else if (this.fight.state === "lost") {
        this.text.setText("It got away. Cast again.");
        this.rest();
      }
    }
    this.draw();
  }

  private draw(): void {
    const m = this.meter;
    m.clear();
    if (this.phase === "aim" && this.assist === 0) {
      m.fillStyle(0x000000, 0.5).fillRect(24, 360, 300, 18);
      m.fillStyle(0xffe9a0, 1).fillRect(24, 360, 300 * this.charge, 18);
    }
    const f = this.fight;
    if (this.phase !== "fight" || !f) return;
    const { x, y, w, h } = TRACK;
    m.fillStyle(0x1b4f7a, 1).fillRect(x, y, w, h);
    const bar = f.setup.width * h;
    m.fillStyle(0x6fcf6a, 0.8).fillRect(x, y + h - f.barPos * h - bar, w, bar);
    m.fillStyle(0xffd34a, 1).fillCircle(x + w / 2, y + h - f.fishPos * h, 9);
    m.fillStyle(0x000000, 0.5).fillRect(x + w + 16, y, 14, h);
    m.fillStyle(0xffe9a0, 1).fillRect(
      x + w + 16,
      y + h * (1 - f.progress),
      14,
      h * f.progress,
    );
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
