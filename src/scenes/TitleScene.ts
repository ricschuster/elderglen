import { respawnAreaForage } from "../core/areas";
import Phaser from "phaser";
import { dateOf } from "../core/calendar";
import { farmMapOf, farmTypeById } from "../core/farmtypes";
import { resumeAt } from "../core/house";
import type { GameState } from "../core/save";
import { activeSlot, allSlots, deleteSlot, type SlotInfo } from "../core/slots";
import { startGame } from "../core/toolbar";
import { PROFILE_NAMES } from "./OptionsScene";
import { browserKv, loadDeviceSettings, useSlot } from "./storage";
import { STATE_KEY } from "./state";

/**
 * The first screen: five save slots (note 52). A used slot shows its farm and
 * has Continue and Delete; an empty one starts a new game. `?new` skips this screen and starts
 * fresh, for development.
 */
export class TitleScene extends Phaser.Scene {
  private note!: Phaser.GameObjects.Text;

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

    const slots = allSlots(browserKv);
    const last = activeSlot(browserKv);
    this.add
      .text(480, 56, "Elderglen", { fontSize: "44px", color: "#ffe9a0" })
      .setOrigin(0.5);
    this.add
      .text(480, 100, "A quiet farm in a valley.", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.note = this.add
      .text(480, 454, "", { fontSize: "16px", color: "#ffe9a0" })
      .setOrigin(0.5);

    slots.forEach((info, i) => this.card(info, 160 + i * 58));

    this.button(
      480,
      496,
      `Options (${PROFILE_NAMES[loadDeviceSettings().profile]})`,
      0x4a5a7a,
      () => this.scene.start("options"),
      260,
      40,
    );
    const resume = slots.find((i) => i.slot === last && i.status === "used");
    const first = resume ?? slots.find((i) => i.status === "used");
    const kb = this.input.keyboard;
    kb?.on("keydown-ENTER", () => {
      if (first?.status === "used") this.play(first.slot, first.game);
    });
    kb?.on("keydown-O", () => this.scene.start("options"));
    this.add
      .text(480, 526, first ? "Enter: continue   O: options" : "O: options", {
        fontSize: "12px",
        color: "#ffffffaa",
      })
      .setOrigin(0.5);
  }

  /** One slot: what it holds, with Continue and Delete, or New game when empty. */
  private card(info: SlotInfo, y: number): void {
    this.add
      .rectangle(480, y, 760, 50, 0x1f2a22, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.35);
    let label = `Slot ${info.slot}: empty`;
    if (info.status === "broken")
      label = `Slot ${info.slot}: could not be read`;
    if (info.status === "used") {
      const g = info.game;
      const { season, dayOfSeason, year } = dateOf(g.day.clock.day);
      label = `Slot ${info.slot}: ${farmTypeById(g.farmType).name} farm, ${season} ${dayOfSeason}, year ${year}, ${g.money}g`;
    }
    this.add
      .text(120, y, label, { fontSize: "16px", color: "#d8e8c8" })
      .setOrigin(0, 0.5);
    if (info.status === "used")
      this.button(
        640,
        y,
        "Continue",
        0x3f7d3a,
        () => this.play(info.slot, info.game),
        130,
        38,
        16,
      );
    if (info.status === "empty")
      this.button(
        640,
        y,
        "New game",
        0x3f7d3a,
        () => {
          useSlot(info.slot);
          this.scene.start("farm-choice");
        },
        130,
        38,
        16,
      );
    if (info.status !== "empty") this.deleteButton(info.slot, 770, y);
  }

  /** Delete asks twice, so one stray tap cannot erase a save. */
  private deleteButton(slot: number, x: number, y: number): void {
    let asked = false;
    this.add
      .rectangle(x, y, 100, 38, 0xa0482e, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (!asked) {
          asked = true;
          label.setText("Sure?");
          this.note.setText(`Delete slot ${slot}? Press Sure? to confirm.`);
          return;
        }
        deleteSlot(browserKv, slot);
        this.scene.restart();
      });
    const label = this.add
      .text(x, y, "Delete", { fontSize: "16px", color: "#ffffff" })
      .setOrigin(0.5);
  }

  private play(slot: number, state: GameState): void {
    useSlot(slot);
    this.begin(state);
  }

  private begin(state: GameState): void {
    state.forage.respawn(
      dateOf(state.day.clock.day).season,
      farmMapOf(state).forageSpots,
      Math.random,
    );
    respawnAreaForage(state, Math.random);
    this.registry.set(STATE_KEY, state);
    this.scene.start("farm", resumeAt(state));
  }

  private button(
    x: number,
    y: number,
    text: string,
    color: number,
    run: () => void,
    width = 260,
    height = 52,
    size = 22,
  ): void {
    this.add
      .rectangle(x, y, width, height, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    this.add
      .text(x, y, text, { fontSize: `${size}px`, color: "#ffffff" })
      .setOrigin(0.5);
  }
}
