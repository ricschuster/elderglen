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
import {
  BAITS,
  LURES,
  baitById,
  equipBait,
  equipLure,
  giveTreasure,
  lureById,
  removeBait,
  removeLure,
  rollTreasure,
  treasureText,
  type Effects,
} from "../core/tackle";
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
/** The wait for a bite, in seconds, before bait and lures shorten it. */
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
  /** What the rig did to the cast in flight. */
  private effects!: Effects;
  private rigText!: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Text[] = [];
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
    this.rigText = this.add.text(24, 250, "", {
      fontSize: "16px",
      color: "#cfe8ff",
      wordWrap: { width: 500 },
    });
    this.buttons = [];
    this.tackleButton(24, "Bait (B)", () => this.cycleBait());
    this.tackleButton(150, "Add lure (L)", () => this.addLure());
    this.tackleButton(300, "Drop lure (X)", () => this.dropLure());
    this.bang = this.add
      .text(480, 250, "!", { fontSize: "96px", color: "#ffe9a0" })
      .setOrigin(0.5)
      .setVisible(false);
    this.add.text(
      24,
      510,
      "Space or press and hold: charge and lift   B, L, X: bait and lures   Esc: stop fishing",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    // A tap anywhere is the one input, held or released.
    this.input.on(
      "pointerdown",
      (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length === 0) this.press();
      },
    );
    this.input.on("pointerup", () => this.release());
    const kb = this.input.keyboard;
    kb?.on("keydown-SPACE", () => this.press());
    kb?.on("keyup-SPACE", () => this.release());
    kb?.on("keydown-B", () => this.cycleBait());
    kb?.on("keydown-L", () => this.addLure());
    kb?.on("keydown-X", () => this.dropLure());
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
    this.showRig();
    this.draw();
  }

  private tackleButton(x: number, label: string, run: () => void): void {
    const b = this.add
      .text(x, 455, label, {
        fontSize: "15px",
        color: "#ffffff",
        backgroundColor: "#2f5f8a",
        padding: { x: 8, y: 4 },
      })
      .setInteractive({ useHandCursor: true });
    b.on("pointerdown", run);
    this.buttons.push(b);
  }

  /** Bait and lures change between casts only. */
  private get fitting(): boolean {
    return this.phase === "aim" || this.phase === "result";
  }

  private showRig(): void {
    const rig = this.state.tackle.rig(this.rod.id);
    const lines = [`${this.rod.name}`];
    if (!this.rod.bait) lines.push("No bait or lure slots on this rod.");
    else {
      const b = rig.bait;
      lines.push(
        b
          ? `Bait: ${baitById(b.id)?.name} x${b.count}`
          : "Bait: none (B to fit some from your backpack)",
      );
      if (this.rod.lures === 0) lines.push("Lures: no lure slot on this rod.");
      else {
        const l = rig.lures.map(
          (x) => `${lureById(x.id)?.name} (${x.left} casts)`,
        );
        lines.push(
          `Lures ${rig.lures.length}/${this.rod.lures}: ${l.join(", ") || "none (L to fit one)"}`,
        );
      }
    }
    this.rigText.setText(lines.join("\n"));
    const slots = this.rod.bait;
    for (const b of this.buttons) b.setVisible(slots && this.fitting);
  }

  private fit(refusal: string | undefined, done: string): void {
    this.info.setText(refusal ?? done);
    this.showRig();
  }

  private cycleBait(): void {
    if (!this.fitting || !this.rod.bait) return;
    const g = this.state;
    const rig = g.tackle.rig(this.rod.id);
    const owned = BAITS.filter(
      (b) => !b.sea && (g.inventory.count(b.id) > 0 || rig.bait?.id === b.id),
    );
    const at = owned.findIndex((b) => b.id === rig.bait?.id);
    const next = owned[at + 1];
    if (next) {
      if (rig.bait?.id === next.id) return;
      return this.fit(
        equipBait(g.tackle, g.inventory, this.rod, next.id),
        `${next.name} fitted.`,
      );
    }
    if (at >= 0 || owned.length === 0)
      this.fit(
        removeBait(g.tackle, g.inventory, this.rod),
        owned.length === 0
          ? "You have no bait. The shop sells it."
          : "Bait taken off.",
      );
  }

  private addLure(): void {
    if (!this.fitting || this.rod.lures === 0) return;
    const g = this.state;
    const rig = g.tackle.rig(this.rod.id);
    const next = LURES.find(
      (l) =>
        g.inventory.count(l.id) > 0 && !rig.lures.some((x) => x.id === l.id),
    );
    if (!next)
      return this.fit("You have no other lure. The shop sells them.", "");
    this.fit(
      equipLure(g.tackle, g.inventory, this.rod, next.id),
      `${next.name} fitted: ${next.text}`,
    );
  }

  private dropLure(): void {
    if (!this.fitting || this.rod.lures === 0) return;
    const g = this.state;
    const rig = g.tackle.rig(this.rod.id);
    if (rig.lures.length === 0) return;
    this.fit(
      removeLure(g.tackle, g.inventory, this.rod, rig.lures.length - 1),
      "Lure taken off.",
    );
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
    const fx = g.tackle.effects(this.rod.id);
    this.effects = fx;
    this.pending = bite(
      "river",
      { season, minutes: g.day.clock.minutes, raining: isRaining(g.weather) },
      Math.random,
      this.tutorial,
      fx,
    );
    // A cast takes game time, win or lose, and spends the bait and a lure cast.
    g.day.act(0, CAST_MINUTES);
    const gone = g.tackle.spend(this.rod.id);
    this.phase = "wait";
    const [lo, hi] = WAIT;
    this.timer = (lo + Math.random() * (hi - lo)) * fx.wait;
    this.text.setText("Waiting for a bite...");
    this.info.setText(gone.length ? `${gone.join(" and ")} used up.` : "");
    this.showRig();
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
    const b = this.pending;
    // The Sounding Float names what is on the line.
    this.text.setText(
      this.effects.sounding
        ? `A bite! It feels like a ${b.fish.name}. Press now.`
        : "A bite! Press now.",
    );
  }

  /** Back to the cast after a miss. A short pause so the message can be read. */
  private rest(): void {
    this.phase = "result";
    this.bang.setVisible(false);
    this.showRig();
    this.draw();
  }

  private hooked(): void {
    this.bang.setVisible(false);
    const b = this.pending;
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
        width: barWidth(this.rod, this.assist, this.effects.bar),
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
    const prize = this.effects.treasure
      ? rollTreasure(g.skills.level("fishing"), Math.random)
      : undefined;
    if (prize) giveTreasure(g, prize, this.cfg.at);
    this.text.setText(
      [this.describe(r), prize ? treasureText(prize) : ""]
        .filter((l) => l)
        .join("\n"),
    );
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
