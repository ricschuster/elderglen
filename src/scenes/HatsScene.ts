import Phaser from "phaser";
import { pieceById } from "../core/clothes";
import { hatById } from "../core/hats";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";
import { dispatch, followGuest } from "./guestlive";
import type { TailorKind } from "../core/clothes";

/**
 * The hat box: the hats the player owns, and which one is worn. Opened from
 * the Hats key or button. Hats are only a look (`10_customisation.md`).
 */
export class HatsScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;

  constructor() {
    super("hats");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    frame(this, "Hats", () => this.close());
    this.add.text(24, 500, "Arrows: move   Enter: wear   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, { x: 24, y: 64, w: 600, title: "Your hats" });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.menu.setFocus(true);
    followGuest(
      this,
      () => this.refresh(),
      () => {},
    );
    this.refresh();
  }

  /** Wear or store a piece of the player's own wardrobe; a guest asks the host, who keeps it (note 53). */
  private wear(kind: TailorKind, id: string | undefined): void {
    dispatch(this.state, { kind: "wardrobe-wear", piece: kind, id });
    this.refresh();
  }

  private refresh(): void {
    const w = this.state.wardrobe;
    const row = (id: string | undefined, label: string): Row => ({
      label,
      detail: w.worn === id ? "worn" : undefined,
      buttons: [
        {
          text: "Wear",
          run: () => this.wear("hat", id),
        },
      ],
    });
    const rows = [row(undefined, "No hat")];
    for (const id of w.list()) rows.push(row(id, hatById(id)?.name ?? id));
    for (const kind of ["shirt", "pants"] as const) {
      for (const id of w.listPieces(kind)) {
        rows.push({
          label: pieceById(kind, id)?.name ?? id,
          detail: w.wornOf(kind) === id ? "worn" : kind,
          buttons: [
            {
              text: w.wornOf(kind) === id ? "Take off" : "Wear",
              run: () =>
                this.wear(kind, w.wornOf(kind) === id ? undefined : id),
            },
          ],
        });
      }
    }
    rows.push({
      label: "Rings you wear",
      detail: "two slots",
      buttons: [
        {
          text: "Open",
          run: () => {
            this.scene.stop();
            this.scene.launch("equipment");
          },
        },
      ],
    });
    rows.push({
      label: "Achievements and the hatter",
      buttons: [
        {
          text: "Open",
          run: () => {
            this.scene.stop();
            this.scene.launch("achievements");
          },
        },
      ],
    });
    rows.push({
      label: "Collections and the completion total",
      buttons: [
        {
          text: "Open",
          run: () => {
            this.scene.stop();
            this.scene.launch("collections");
          },
        },
      ],
    });
    rows.push({
      label: "Open requests",
      buttons: [
        {
          text: "Open",
          run: () => {
            this.scene.stop();
            this.scene.launch("requests", { list: true });
          },
        },
      ],
    });
    this.menu.setRows(rows);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
