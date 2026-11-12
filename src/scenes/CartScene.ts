import Phaser from "phaser";
import {
  cartArrival,
  cartDestinations,
  type CartStop,
} from "../core/roomrewards";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The cart screen (note 16, the Hearth room's reward). Free: pick a stop and
 * ride. The farm scene reads `goto` from the resume data and travels.
 */
export class CartScene extends Phaser.Scene {
  private state!: GameState;
  private from!: string;
  private menu!: Menu;

  constructor() {
    super("cart");
  }

  init(data: { from: string }): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.from = data.from;
  }

  create(): void {
    const { message } = frame(this, "The cart", () => this.close());
    message.setText("Where to? The ride is free.");
    this.add.text(24, 500, "Arrows: move   Enter: ride   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: "Stops",
      buttonsOnly: true,
    });
    this.menu.setFocus(true);
    const rows: Row[] = cartDestinations(
      this.from,
      this.state.day.clock.day,
    ).map((stop) => ({
      label: stop.name,
      buttons: [{ text: "Ride", run: () => this.ride(stop) }],
    }));
    this.menu.setRows(rows);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-ESC", () => this.close());
  }

  private ride(stop: CartStop): void {
    this.scene.stop();
    this.scene.resume("farm", { goto: cartArrival(this.state, stop) });
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
