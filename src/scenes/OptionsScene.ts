import Phaser from "phaser";
import {
  ACTIONS,
  keyLabel,
  rebind,
  resetAction,
  resetAll,
  saveSettings,
  swapBinding,
  type Profile,
  type Settings,
  type TouchScheme,
} from "../core/bindings";
import {
  centreView,
  frame,
  Menu,
  type Row,
  UI_SIZE_KEY,
  WORLD_ZOOM_KEY,
} from "./panel";
import { ASSIST_NAMES, type Assist } from "../core/fishing";
import { stepPercent, UI_MAX, UI_MIN, ZOOM_MAX, ZOOM_MIN } from "../core/view";
import { browserSettingsStore, loadDeviceSettings } from "./storage";

export const PROFILE_NAMES: Record<Profile, string> = {
  desktop: "Desktop",
  touch: "Touch",
};

const SCHEME_NAMES: Record<TouchScheme, string> = {
  tap: "Tap to move",
  stick: "Stick",
};

/**
 * The options screen, opened from the title (note 45 step 3). It holds the
 * view (world zoom, UI size and window mode, note 64) and the controls: the
 * profile, the touch scheme, and the desktop key list. Zoom and UI size apply
 * at once, here and in the farm.
 * Choosing a key row waits for the next key press; a key already in use asks
 * before it swaps. Changes apply at once and are saved when the screen closes.
 */
export class OptionsScene extends Phaser.Scene {
  private settings!: Settings;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;
  /** The action waiting for a key, if any. */
  private capturing: string | undefined;
  /** A key that is taken, waiting for the player to confirm the swap. */
  private clash: { action: string; other: string } | undefined;

  constructor() {
    super("options");
  }

  init(): void {
    this.settings = loadDeviceSettings();
    this.capturing = undefined;
    this.clash = undefined;
  }

  create(): void {
    const { message } = frame(this, "Options", () => this.escape());
    this.message = message;
    this.say("");
    this.add.text(
      24,
      516,
      "Up and Down: move   Left and Right: smaller, larger or default   Enter: change a key   Esc: close",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: "Controls",
      visible: 8,
    });
    this.menu.setFocus(true);
    this.refresh();
    const kb = this.input.keyboard;
    const idle = (f: () => void) => () => {
      if (!this.capturing && !this.clash) f();
    };
    kb?.on(
      "keydown-UP",
      idle(() => this.menu.move(-1)),
    );
    kb?.on(
      "keydown-DOWN",
      idle(() => this.menu.move(1)),
    );
    kb?.on(
      "keydown-LEFT",
      idle(() => this.menu.press(0)),
    );
    kb?.on(
      "keydown-RIGHT",
      idle(() => this.menu.press(1)),
    );
    kb?.on("keydown-ENTER", () => {
      if (this.clash) this.confirmSwap();
      else if (!this.capturing) this.menu.press(0);
    });
    kb?.on("keydown", (e: KeyboardEvent) => this.onKey(e));
  }

  private say(text: string): void {
    this.message.setText(
      text || "Changes are saved when you close this screen.",
    );
  }

  private label(id: string): string {
    return ACTIONS.find((a) => a.id === id)?.label ?? id;
  }

  /** Esc backs out of a key prompt first, and closes the screen otherwise. */
  private escape(): void {
    if (this.capturing || this.clash) {
      this.capturing = undefined;
      this.clash = undefined;
      this.say("");
      return;
    }
    this.close();
  }

  private startCapture(action: string): void {
    this.clash = undefined;
    this.capturing = action;
    this.say(`Press a key for "${this.label(action)}". Esc: cancel`);
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.capturing || this.clash) return;
    e.preventDefault();
    if (e.code === "Escape") return;
    const action = this.capturing;
    const r = rebind(this.settings.bindings, action, e.code);
    if (r.kind === "ok") {
      this.settings.bindings = r.bindings;
      this.capturing = undefined;
      this.say(`${this.label(action)} is now ${keyLabel(e.code)}.`);
      this.refresh();
    } else if (r.kind === "reserved") {
      this.say(`${keyLabel(e.code)} cannot be used. Press another key.`);
    } else if (r.kind === "conflict") {
      this.capturing = undefined;
      this.clash = { action, other: r.with };
      this.say(
        `${keyLabel(e.code)} is used by "${this.label(r.with)}". Enter: swap   Esc: cancel`,
      );
    }
  }

  private confirmSwap(): void {
    const c = this.clash;
    if (!c) return;
    this.settings.bindings = swapBinding(
      this.settings.bindings,
      c.action,
      c.other,
    );
    this.clash = undefined;
    this.say(
      `Swapped: ${this.label(c.action)} is now ${keyLabel(this.settings.bindings[c.action] ?? "")}.`,
    );
    this.refresh();
  }

  private mark(on: boolean, text: string): string {
    return on ? `[${text}]` : text;
  }

  private refresh(): void {
    const s = this.settings;
    const rows: Row[] = [
      this.percentRow("World zoom", "worldZoom", ZOOM_MIN, ZOOM_MAX),
      this.percentRow("UI size", "uiSize", UI_MIN, UI_MAX),
      ...this.windowRows(),
      {
        label: "Control hints box",
        detail: "keyboard hints at the top left of the farm",
        buttons: [true, false].map((on) => ({
          text: this.mark(s.showHints === on, on ? "On" : "Off"),
          run: () => {
            s.showHints = on;
            this.refresh();
          },
        })),
      },
      {
        label: "Fishing assist",
        detail: "a bigger bar and calmer fish, or skip the fight",
        buttons: ([0, 1, 2] as Assist[]).map((a) => ({
          text: this.mark(s.fishingAssist === a, ASSIST_NAMES[a]),
          run: () => {
            s.fishingAssist = a;
            this.refresh();
          },
        })),
      },
      {
        label: "Combat assist",
        detail: "half damage, wider warnings, no items lost when knocked out",
        buttons: [false, true].map((on) => ({
          text: this.mark(s.combatAssist === on, on ? "On" : "Off"),
          run: () => {
            s.combatAssist = on;
            this.refresh();
          },
        })),
      },
      {
        label: "Creatures in the mine",
        detail: "turn them off to dig in peace",
        buttons: [false, true].map((off) => ({
          text: this.mark(s.noCreatures === off, off ? "None" : "Some"),
          run: () => {
            s.noCreatures = off;
            this.refresh();
          },
        })),
      },
      {
        label: "Controls for this device",
        buttons: (Object.keys(PROFILE_NAMES) as Profile[]).map((p) => ({
          text: this.mark(s.profile === p, PROFILE_NAMES[p]),
          run: () => {
            s.profile = p;
            this.capturing = undefined;
            this.clash = undefined;
            this.say("");
            this.refresh();
          },
        })),
      },
    ];
    if (s.profile === "touch") {
      rows.push({
        label: "How to move",
        buttons: (Object.keys(SCHEME_NAMES) as TouchScheme[]).map((t) => ({
          text: this.mark(s.touchScheme === t, SCHEME_NAMES[t]),
          run: () => {
            s.touchScheme = t;
            this.refresh();
          },
        })),
      });
    } else {
      for (const a of ACTIONS) {
        rows.push({
          label: a.label,
          detail: keyLabel(s.bindings[a.id] ?? a.key),
          buttons: [
            { text: "Change", run: () => this.startCapture(a.id) },
            {
              text: "Default",
              run: () => {
                s.bindings = resetAction(s.bindings, a.id);
                this.say(`${a.label} is back to ${keyLabel(a.key)}.`);
                this.refresh();
              },
            },
          ],
        });
      }
      rows.push({
        label: "Reset all keys",
        buttons: [
          {
            text: "Reset",
            run: () => {
              s.bindings = resetAll();
              this.refresh();
            },
          },
        ],
      });
    }
    this.menu.setRows(rows);
  }

  /** A setting in 5 percent steps: Left and Right press the two buttons. */
  private percentRow(
    label: string,
    key: "worldZoom" | "uiSize",
    min: number,
    max: number,
  ): Row {
    const change = (dir: 1 | -1) => () => {
      const next = stepPercent(this.settings[key], dir, min, max);
      this.settings[key] = next;
      this.registry.set(
        key === "worldZoom" ? WORLD_ZOOM_KEY : UI_SIZE_KEY,
        next,
      );
      // The UI size also scales this screen's box, so redraw it now.
      centreView(this);
      this.refresh();
    };
    return {
      label,
      detail: `${this.settings[key]}%`,
      buttons: [
        { text: "Smaller", run: change(-1), enabled: this.settings[key] > min },
        { text: "Larger", run: change(1), enabled: this.settings[key] < max },
      ],
    };
  }

  /**
   * Window mode as far as a browser can express it: Windowed and Fullscreen.
   * Borderless Windowed needs the desktop wrapper (note 64). The browser asks
   * for a tap or key press each time, so the mode is not saved.
   */
  private windowRows(): Row[] {
    if (!this.scale.fullscreen.available) return [];
    const full = this.scale.isFullscreen;
    return [
      {
        label: "Window mode",
        buttons: [
          {
            text: this.mark(!full, "Windowed"),
            run: () => {
              this.scale.stopFullscreen();
              this.time.delayedCall(250, () => this.refresh());
            },
          },
          {
            text: this.mark(full, "Fullscreen"),
            run: () => {
              this.scale.startFullscreen();
              this.time.delayedCall(250, () => this.refresh());
            },
          },
        ],
      },
    ];
  }

  private close(): void {
    saveSettings(browserSettingsStore, this.settings);
    this.scene.start("title");
  }
}
