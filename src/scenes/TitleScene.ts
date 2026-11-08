import Phaser from "phaser";
import { dateOf } from "../core/calendar";
import { farmMapOf, farmTypeById } from "../core/farmtypes";
import { resumeAt } from "../core/house";
import { loadGame, type GameState } from "../core/save";
import { startGame } from "../core/toolbar";
import { PROFILE_NAMES } from "./OptionsScene";
import { browserStore, loadDeviceSettings } from "./storage";
import { STATE_KEY } from "./state";

/**
 * The first screen: Continue a saved game or start a new one. A save that
 * cannot be read is reported and ignored. `?new` skips this screen and starts
 * fresh, for development.
 */
export class TitleScene extends Phaser.Scene {
  private note!: Phaser.GameObjects.Text;
  private erasing = false;

  constructor() {
    super("title");
  }

  create(): void {
    if (location.search.includes("new")) {
      // Drop `?new` so a later reload continues instead of starting over.
      // `?new&farm=woodland` picks the farm type; Standard otherwise.
      const farm =
        new URLSearchParams(location.search).get("farm") ?? undefined;
      history.replaceState(null, "", location.pathname);
      return this.begin(startGame(farm));
    }

    const raw = browserStore.read();
    const saved = raw === null ? undefined : loadGame(browserStore);
    this.add
      .text(480, 120, "Elderglen", { fontSize: "52px", color: "#ffe9a0" })
      .setOrigin(0.5);
    this.add
      .text(480, 176, "A quiet farm in a valley.", {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.note = this.add
      .text(480, 466, "", { fontSize: "16px", color: "#ffe9a0" })
      .setOrigin(0.5);

    if (saved) {
      const { season, dayOfSeason, year } = dateOf(saved.day.clock.day);
      this.add
        .text(
          480,
          236,
          `Saved game: ${farmTypeById(saved.farmType).name} farm, day ${saved.day.clock.day}, year ${year}, ${season} ${dayOfSeason}, ${saved.money}g`,
          { fontSize: "18px", color: "#d8e8c8" },
        )
        .setOrigin(0.5);
      this.button(480, 300, "Continue", 0x3f7d3a, () => this.begin(saved));
    } else if (raw !== null) {
      this.note.setText(
        "Your saved game could not be read, so it will be replaced.",
      );
    }
    this.button(480, 360, "New game", saved ? 0xa0482e : 0x3f7d3a, () =>
      this.newGame(saved !== undefined),
    );
    this.button(
      480,
      420,
      `Options (${PROFILE_NAMES[loadDeviceSettings().profile]})`,
      0x4a5a7a,
      () => this.scene.start("options"),
    );
    const kb = this.input.keyboard;
    kb?.on("keydown-ENTER", () =>
      saved ? this.begin(saved) : this.newGame(false),
    );
    kb?.on("keydown-N", () => this.newGame(saved !== undefined));
    kb?.on("keydown-O", () => this.scene.start("options"));
    this.add
      .text(
        480,
        500,
        saved
          ? "Enter: continue   N: new game   O: options"
          : "Enter: new game   O: options",
        { fontSize: "13px", color: "#ffffffaa" },
      )
      .setOrigin(0.5);
  }

  /** A new game over a save asks twice, so one stray tap cannot erase it. */
  private newGame(hasSave: boolean): void {
    if (hasSave && !this.erasing) {
      this.erasing = true;
      this.note.setText(
        "This replaces your saved game. Choose New game again.",
      );
      return;
    }
    this.scene.start("farm-choice");
  }

  private begin(state: GameState): void {
    state.forage.respawn(
      dateOf(state.day.clock.day).season,
      farmMapOf(state).forageSpots,
      Math.random,
    );
    this.registry.set(STATE_KEY, state);
    this.scene.start("farm", resumeAt(state));
  }

  private button(
    x: number,
    y: number,
    text: string,
    color: number,
    run: () => void,
  ): void {
    this.add
      .rectangle(x, y, 260, 52, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    this.add
      .text(x, y, text, { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5);
  }
}
