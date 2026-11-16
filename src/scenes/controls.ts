import Phaser from "phaser";
import {
  actionFor,
  keyLabel,
  type Bindings,
  type Profile,
  type Settings,
} from "../core/bindings";
import { schemeById, type Parts, type StickLook } from "../core/controlschemes";
import { keyVector, stickVector, type Vec } from "../core/movement";

/** What a profile can ask the scene to do (note 45, "One input seam"). */
export interface Intents {
  use?: () => void;
  action?: () => void;
  eat?: () => void;
  openMenu?: () => void;
  openSkills?: () => void;
  openCraft?: () => void;
  openHats?: () => void;
  openJournal?: () => void;
  endDay?: () => void;
  toggleHints?: () => void;
  openDebug?: () => void;
  nextSlot?: () => void;
  nextRow?: () => void;
  selectSlot?: (index: number) => void;
}

/** One device profile. Scenes ask this and never name a key or a pointer. */
export interface Controls {
  readonly profile: Profile;
  /** Draws the touch stick, if any. A UI object: keep it off the world camera. */
  readonly objects: Phaser.GameObjects.GameObject[];
  /** The direction to move, length 0 to 1. */
  vector(): Vec;
  /** True while the use control is held. */
  useHeld(): boolean;
  /** Which parts show now (weapon-only parts come and go). */
  setParts?(parts: Parts): void;
  /** True while this finger holds a stick, so a tap handler leaves it alone. */
  claims?(p: Phaser.Input.Pointer): boolean;
  /** The attack stick's push, when it is held. */
  aim?(): Vec | undefined;
  /** The UI camera's zoom, so touch drawing keeps its screen size. */
  setUiScale(scale: number): void;
}

const ARROWS = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
};

/**
 * The desktop profile: the keyboard, through the bindings. It never reads a
 * pointer, so a mouse click cannot start the stick.
 */
class DesktopControls implements Controls {
  readonly profile = "desktop";
  readonly objects: Phaser.GameObjects.GameObject[] = [];
  private down = new Set<string>();

  constructor(
    scene: Phaser.Scene,
    private bindings: Bindings,
    intents: Intents,
  ) {
    const kb = scene.input.keyboard;
    if (!kb) return;
    // Phaser can deliver one key press twice (seen after walking, in headless
    // Chromium), which used a tool twice. Run each press once per event.
    const seen = new Map<string, number>();
    const run = (action: string): void => {
      const slot = /^slot(\d+)$/.exec(action);
      if (slot) return intents.selectSlot?.(Number(slot[1]) - 1);
      const by: Record<string, (() => void) | undefined> = {
        use: intents.use,
        action: intents.action,
        eat: intents.eat,
        menu: intents.openMenu,
        skills: intents.openSkills,
        craft: intents.openCraft,
        hats: intents.openHats,
        journal: intents.openJournal,
        endDay: intents.endDay,
        hints: intents.toggleHints,
        nextSlot: intents.nextSlot,
        nextRow: intents.nextRow,
      };
      by[action]?.();
    };
    const onDown = (e: KeyboardEvent): void => {
      this.down.add(e.code);
      const action = actionFor(this.bindings, e.code);
      if (action === undefined) return;
      // A bound key is ours: stop Tab moving focus and Space scrolling.
      e.preventDefault();
      if (seen.get(e.code) === e.timeStamp) return;
      seen.set(e.code, e.timeStamp);
      run(action);
    };
    const onUp = (e: KeyboardEvent): void => void this.down.delete(e.code);
    const onBlur = (): void => this.down.clear();
    kb.on("keydown", onDown);
    kb.on("keyup", onUp);
    scene.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    // A key released while a menu had the farm paused is never seen here, so
    // forget the held keys when play resumes.
    scene.events.on("resume", onBlur);
    scene.events.on("wake", onBlur);
    if (import.meta.env.DEV && intents.openDebug)
      kb.on("keydown-BACKTICK", intents.openDebug);
    scene.events.once("shutdown", () => {
      kb.off("keydown", onDown);
      kb.off("keyup", onUp);
      kb.off("keydown-BACKTICK");
      scene.game.events.off(Phaser.Core.Events.BLUR, onBlur);
      scene.events.off("resume", onBlur);
      scene.events.off("wake", onBlur);
    });
  }

  private held(action: string, ...extra: string[]): boolean {
    return [this.bindings[action]!, ...extra].some((c) => this.down.has(c));
  }

  vector(): Vec {
    return keyVector(
      this.held("moveLeft", ARROWS.left),
      this.held("moveRight", ARROWS.right),
      this.held("moveUp", ARROWS.up),
      this.held("moveDown", ARROWS.down),
    );
  }

  useHeld(): boolean {
    return this.held("use");
  }

  setUiScale(): void {}
}

/** One floating stick on a screen zone. Draws a ring, or nothing when invisible. */
class StickPad {
  readonly gfx: Phaser.GameObjects.Graphics;
  private id = -1;
  private anchor: Vec = { x: 0, y: 0 };
  private current: Vec = { x: 0, y: 0 };
  look: StickLook = "visible";
  enabled = true;

  constructor(
    scene: Phaser.Scene,
    private inZone: (p: Phaser.Input.Pointer) => boolean,
    ignore: (p: Phaser.Input.Pointer) => boolean,
    private tint: number,
  ) {
    this.gfx = scene.add.graphics().setDepth(1000);
    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.enabled || this.id !== -1 || !this.inZone(p) || ignore(p))
        return;
      this.id = p.id;
      this.anchor = { x: p.x, y: p.y };
      this.current = { ...this.anchor };
    });
    scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.id === this.id) this.current = { x: p.x, y: p.y };
    });
    const release = (p?: Phaser.Input.Pointer) => {
      if (!p || p.id === this.id) this.id = -1;
    };
    scene.input.on("pointerup", release);
    scene.input.on("gameout", () => release());
  }

  claims(p: Phaser.Input.Pointer): boolean {
    return p.id === this.id;
  }

  /** The push, length 0 to 1. Zero while no finger holds the stick. */
  vector(): Vec {
    if (!this.enabled) this.id = -1;
    this.draw();
    if (this.id === -1) return { x: 0, y: 0 };
    return stickVector(
      this.current.x - this.anchor.x,
      this.current.y - this.anchor.y,
    );
  }

  private draw(): void {
    this.gfx.clear();
    if (this.id === -1 || this.look !== "visible") return;
    const { x, y } = this.anchor;
    const knob = stickVector(this.current.x - x, this.current.y - y, 0, 40);
    this.gfx.lineStyle(3, this.tint, 0.35).strokeCircle(x, y, 40);
    this.gfx
      .fillStyle(this.tint, 0.45)
      .fillCircle(x + knob.x * 40, y + knob.y * 40, 18);
  }
}

/**
 * The touch profile: a floating move stick and, for the attack schemes, an aim
 * stick (note 27). With tap-to-move the move stick takes only the lower-left
 * corner, so taps elsewhere still walk; without it the stick takes the left
 * half. The aim stick takes the lower-right corner. It never reads the keyboard.
 */
class TouchControls implements Controls {
  readonly profile = "touch";
  readonly objects: Phaser.GameObjects.GameObject[];
  private move: StickPad;
  private aimPad: StickPad;

  /** `ignore` lets the HUD claim a touch, so it does not start a stick. */
  constructor(
    scene: Phaser.Scene,
    tap: boolean,
    ignore: (p: Phaser.Input.Pointer) => boolean,
  ) {
    // A second finger is needed for the stick and a tool at the same time.
    // The input manager outlives a scene restart, so add it only once.
    if (scene.input.manager.pointers.length < 3) scene.input.addPointer(1);
    const size = () => scene.scale.gameSize;
    this.move = new StickPad(
      scene,
      (p) => p.x < size().width / 2 && (!tap || p.y > size().height * 0.45),
      ignore,
      0xffffff,
    );
    this.aimPad = new StickPad(
      scene,
      (p) => p.x > size().width / 2 && p.y > size().height * 0.45,
      ignore,
      0xffb040,
    );
    this.aimPad.enabled = false;
    this.objects = [this.move.gfx, this.aimPad.gfx];
  }

  setParts(parts: Parts): void {
    this.move.enabled = parts.stick !== "none";
    if (parts.stick !== "none") this.move.look = parts.stick;
    this.aimPad.enabled = parts.aimStick;
  }

  claims(p: Phaser.Input.Pointer): boolean {
    return this.move.claims(p) || this.aimPad.claims(p);
  }

  vector(): Vec {
    return this.move.vector();
  }

  aim(): Vec | undefined {
    const v = this.aimPad.vector();
    return v.x === 0 && v.y === 0 ? undefined : v;
  }

  useHeld(): boolean {
    return false;
  }

  setUiScale(scale: number): void {
    // The sticks are drawn in screen pixels on a zoomed UI camera.
    this.move.gfx.setScale(1 / scale);
    this.aimPad.gfx.setScale(1 / scale);
  }
}

/**
 * The touch profile in tap-to-move (note 27): no stick and no buttons of its
 * own. The scene reads the taps and walks the farmer by route, so this only
 * reports no push and no held use.
 */
class TapControls implements Controls {
  readonly profile = "touch";
  readonly objects: Phaser.GameObjects.GameObject[] = [];
  vector(): Vec {
    return { x: 0, y: 0 };
  }
  useHeld(): boolean {
    return false;
  }
  setUiScale(): void {}
}

/** The profile the settings ask for. */
export function createControls(
  scene: Phaser.Scene,
  settings: Settings,
  intents: Intents = {},
  ignore: (p: Phaser.Input.Pointer) => boolean = () => false,
): Controls {
  if (settings.profile !== "touch")
    return new DesktopControls(scene, settings.bindings, intents);
  const def = schemeById(settings.touchScheme);
  // Tap-only schemes need no pad at all.
  if (def.stick === "none" && !def.aimStick) return new TapControls();
  return new TouchControls(scene, def.tap, ignore);
}

/** The keyboard hint line for the desktop profile, from the bindings. */
export function desktopHint(b: Bindings): string {
  const k = (a: string) => keyLabel(b[a]!);
  return [
    `Move: ${k("moveUp")}${k("moveLeft")}${k("moveDown")}${k("moveRight")} or arrows`,
    `Use: ${k("use")}   Action: ${k("action")}   Eat: ${k("eat")}`,
    `Skills: ${k("skills")}   Craft: ${k("craft")}   Hats: ${k("hats")}   Journal: ${k("journal")}`,
    `Tools: 1-9, ${k("nextSlot")}: next, ${k("nextRow")}: row`,
    `Sleep: bed or ${k("endDay")}`,
    `Hide hints: ${k("hints")}`,
  ].join("\n");
}
