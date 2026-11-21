import { SCHEMES } from "../core/controlschemes";
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
} from "../core/bindings";
import {
  centreView,
  closeWindow,
  frame,
  isHosted,
  Menu,
  type Row,
  UI_SIZE_KEY,
  WORLD_ZOOM_KEY,
} from "./panel";
import { ASSIST_NAMES, type Assist } from "../core/fishing";
import { stepPercent, UI_MAX, UI_MIN, ZOOM_MAX, ZOOM_MIN } from "../core/view";
import {
  MAX_IMPORT_BYTES,
  applyImport,
  exportSlot,
  parseImport,
} from "../core/saveexport";
import { activeSlot, allSlots, deleteSlot, slotStores } from "../core/slots";
import { browserKv, browserSettingsStore, loadDeviceSettings } from "./storage";
import { audio } from "../audio/engine";
import credits from "../content/audio-credits.json";

export const PROFILE_NAMES: Record<Profile, string> = {
  desktop: "Desktop",
  touch: "Touch",
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
  /** The menu asks before it closes or switches tab: a key capture owns Esc and E. */
  menuBusy(): boolean {
    return this.capturing !== undefined || this.clash !== undefined;
  }

  /** The menu is closing: keep what was changed. */
  beforeMenuClose(): void {
    saveSettings(browserSettingsStore, this.settings);
  }

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
      ...this.soundRows(),
      {
        label: "Control hints box",
        detail: "keyboard hints at the top left of the farm",
        buttons: [true, false].map((on) => ({
          toggle: true,
          text: this.mark(s.showHints === on, on ? "On" : "Off"),
          run: () => {
            s.showHints = on;
            this.refresh();
          },
        })),
      },
      {
        label: "Fishing assist",
        detail: "bigger bar, calmer fish",
        buttons: ([0, 1, 2] as Assist[]).map((a) => ({
          toggle: true,
          text: this.mark(s.fishingAssist === a, ASSIST_NAMES[a]),
          run: () => {
            s.fishingAssist = a;
            this.refresh();
          },
        })),
      },
      {
        label: "Combat assist",
        detail: "half damage, nothing lost",
        buttons: [false, true].map((on) => ({
          toggle: true,
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
          toggle: true,
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
      for (const d of SCHEMES)
        rows.push({
          label: d.name,
          buttons: [
            {
              text: this.mark(s.touchScheme === d.id, "Use this"),
              run: () => {
                s.touchScheme = d.id;
                this.refresh();
              },
            },
          ],
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
    rows.push({
      label: "Save file",
      detail: "export the current slot, or import a file into an empty slot",
      buttons: [
        { text: "Export", run: () => this.exportSave() },
        { text: "Import", run: () => this.importSave() },
      ],
    });
    this.menu.setRows(rows);
  }

  /** Download the active slot, both records, as one file (note 52). */
  private exportSave(): void {
    const slot = activeSlot(browserKv);
    const r = exportSlot(slotStores(browserKv, slot), slot, Date.now());
    if (!r.ok) return this.say(r.message);
    const url = URL.createObjectURL(
      new Blob([r.text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = r.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.say(`Exported slot ${slot} as ${r.filename}.`);
  }

  /** Read a chosen file into the first empty slot. A full set of slots refuses. */
  private importSave(): void {
    const free = allSlots(browserKv).find((s) => s.status === "empty");
    if (!free) return this.say("Every slot is used. Delete one first.");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > MAX_IMPORT_BYTES)
        return this.say("That file is too large to be a save.");
      void file.text().then((text) => {
        const parsed = parseImport(text, file.size);
        if (!parsed.ok) return this.say(parsed.message);
        const stores = slotStores(browserKv, free.slot);
        if (!applyImport(stores, parsed)) {
          deleteSlot(browserKv, free.slot);
          return this.say("Could not store the save.");
        }
        this.say(
          `Imported into slot ${free.slot}.${parsed.droppedResume ? " The day in progress could not be used." : ""}`,
        );
      });
    };
    input.click();
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

  /** Which sound credit the "Sound credits" row shows next. */
  private creditAt = 0;

  /** Music, effects and ambient volume in steps of 10, mute, and the credits (note 107). */
  private soundRows(): Row[] {
    const a = this.settings.audio;
    const volume = (
      label: string,
      key: "musicVolume" | "sfxVolume" | "ambientVolume",
    ): Row => {
      const change = (dir: 1 | -1) => () => {
        a[key] = Math.min(100, Math.max(0, a[key] + dir * 10));
        audio.applySettings(a);
        audio.sfx("ui.confirm");
        this.refresh();
      };
      return {
        label,
        detail: `${a[key]}%`,
        buttons: [
          { text: "Quieter", run: change(-1), enabled: a[key] > 0 },
          { text: "Louder", run: change(1), enabled: a[key] < 100 },
        ],
      };
    };
    return [
      volume("Music volume", "musicVolume"),
      volume("Effects volume", "sfxVolume"),
      volume("Ambient volume", "ambientVolume"),
      {
        label: "Sound",
        detail: "mute everything",
        buttons: [false, true].map((m) => ({
          toggle: true,
          text: this.mark(a.muted === m, m ? "Muted" : "On"),
          run: () => {
            a.muted = m;
            audio.applySettings(a);
            this.refresh();
          },
        })),
      },
      {
        label: "Sound credits",
        detail: `${credits.credits.length} tracks`,
        buttons: [
          {
            text: "Next",
            run: () => {
              const c =
                credits.credits[this.creditAt++ % credits.credits.length];
              if (c) this.say(`${c.title} by ${c.author} (${c.licence}).`);
            },
          },
        ],
      },
    ];
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
    // As a tab of the in-game menu it closes back to the farm, not the title.
    if (isHosted(this)) return closeWindow(this);
    this.scene.start("title");
  }
}
