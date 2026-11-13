import Phaser from "phaser";
import { resistChance } from "../core/effects";
import { bootsById, RING_SLOTS, RINGS, ringById } from "../core/equipment";
import { packRings } from "../core/forge";
import { packBoots } from "../core/tailoring";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The ring slots (`37_equipment.md`): what is worn, and the rings in the pack
 * to wear. A worn ring leaves the pack. Opened from the hat box.
 */
export class EquipmentScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private note?: Phaser.GameObjects.Text;

  constructor() {
    super("equipment");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    frame(this, "Rings and boots", () => this.close());
    this.add.text(
      24,
      500,
      "Arrows: move   Enter: wear or take off   Esc: close",
      {
        fontSize: "13px",
        color: "#ffffffaa",
      },
    );
    this.note = this.add.text(24, 470, "", {
      fontSize: "14px",
      color: "#ffe9a8",
    });
    this.menu = new Menu(this, { x: 24, y: 64, w: 600, title: "Worn rings" });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.menu.setFocus(true);
    this.refresh();
  }

  private refresh(): void {
    const { equipment: eq, inventory: inv } = this.state;
    const rows: Row[] = [];
    eq.worn().forEach((id, slot) => {
      const def = id === undefined ? undefined : ringById(id);
      rows.push({
        label: `Slot ${slot + 1}: ${def?.name ?? "empty"}`,
        buttons: def
          ? [
              {
                text: "Take off",
                run: () => {
                  if (!eq.remove(inv, slot)) this.say("The pack is full.");
                  this.refresh();
                },
              },
            ]
          : [],
      });
    });
    const boots = bootsById(eq.wornBoots() ?? "");
    rows.push({
      label: `Boots: ${boots?.name ?? "none"}`,
      detail: `Defense ${eq.defense()}, resist ${eq.resistPercent()} percent`,
      buttons: boots
        ? [
            {
              text: "Take off",
              run: () => {
                if (!eq.removeBoots(inv)) this.say("The pack is full.");
                this.refresh();
              },
            },
          ]
        : [],
    });
    for (const id of packBoots(this.state)) {
      const b = bootsById(id)!;
      rows.push({
        label: b.name,
        detail: `Defense ${b.defense}, resist ${Math.round(resistChance(b.immunity) * 100)} percent`,
        buttons: [
          {
            text: "Wear",
            run: () => {
              if (!eq.wearBoots(inv, b.id)) this.say("The pack is full.");
              this.refresh();
            },
          },
        ],
      });
    }
    for (const ring of [
      ...RINGS,
      ...packRings(inv).combos.map((c) => ringById(c)!),
    ]) {
      const n = inv.count(ring.id);
      if (n < 1) continue;
      const free = eq.worn().findIndex((r) => r === undefined);
      const slot = free >= 0 ? free : 0;
      rows.push({
        label: ring.name,
        detail: `${n} in the pack`,
        buttons: [
          {
            text: "Wear",
            run: () => {
              if (!eq.wear(inv, slot % RING_SLOTS, ring.id))
                this.say("The pack is full.");
              this.refresh();
            },
          },
        ],
      });
    }
    this.menu.setRows(rows);
  }

  private say(text: string): void {
    this.note?.setText(text);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
