import Phaser from "phaser";
import { rewardText, ROOMS, type BundleDef } from "../core/bundles";
import { itemById } from "../core/items";
import { CATEGORY_NAMES, type ArtisanCategory } from "../core/artisan";
import type { GameState } from "../core/save";
import { endDue } from "../core/sleep";
import { saveGame } from "../core/save";
import { browserStore } from "./storage";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

const name = (id: string) =>
  itemById(id)?.name ?? CATEGORY_NAMES[id as ArtisanCategory] ?? id;

/**
 * One hall room's hand-in panel, drawn over the hall map and opened from the
 * room's scroll. Pick a bundle on the left to see what it needs, then give it
 * things from the backpack, one at a time. A room that is not ready (locked,
 * or with no bundles yet) shows why instead.
 */
export class HallScene extends Phaser.Scene {
  private state!: GameState;
  private bundleMenu!: Menu;
  private packMenu!: Menu;
  private detail!: Phaser.GameObjects.Text;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private column: 0 | 1 = 0;
  private room: string = ROOMS[0]!.id;

  constructor() {
    super("hall");
  }

  init(data: { room?: string }): void {
    this.room = data.room ?? ROOMS[0]!.id;
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.column = 0;
  }

  create(): void {
    const { money, message } = frame(
      this,
      ROOMS.find((r) => r.id === this.room)?.name ?? "Village hall",
      () => this.close(),
    );
    this.money = money;
    this.message = message;
    this.add.text(
      24,
      500,
      "Arrows: move   Enter: hand in   Left/Right: switch list   Esc: close",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    this.bundleMenu = new Menu(this, {
      x: 24,
      y: 64,
      w: 400,
      title: "Bundles",
      visible: 5,
      rowH: 48,
      onCursor: () => this.refresh(),
    });
    this.detail = this.add.text(450, 64, "", {
      fontSize: "16px",
      color: "#ffffff",
      lineSpacing: 4,
      wordWrap: { width: 480 },
    });
    this.packMenu = new Menu(this, {
      x: 450,
      y: 262,
      w: 486,
      title: "Your backpack",
      visible: 4,
      rowH: 42,
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.active.move(-1));
    kb?.on("keydown-DOWN", () => this.active.move(1));
    kb?.on("keydown-LEFT", () => this.focus(0));
    kb?.on("keydown-RIGHT", () => this.focus(1));
    kb?.on("keydown-ENTER", () => this.active.press(0));
    this.focus(0);
  }

  private get active(): Menu {
    return this.column === 0 ? this.bundleMenu : this.packMenu;
  }

  private focus(column: 0 | 1): void {
    this.column = column;
    this.bundleMenu.setFocus(column === 0);
    this.packMenu.setFocus(column === 1);
    this.refresh();
  }

  private say(text: string): void {
    this.message.setText(text);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    const { hall } = g;
    this.money.setText(`Money ${g.money}g`);

    const status = hall.roomStatus(this.room);
    const bundles: BundleDef[] =
      status === "ready" || status === "done" ? hall.bundlesIn(this.room) : [];
    if (bundles.length === 0) return this.notReady(status);
    this.bundleMenu.setRows(
      bundles.map((b) => ({
        label: b.name,
        detail: hall.complete(b.id)
          ? "Done"
          : `${hall.handedIn(b.id).length} of ${b.required}`,
        buttons: [],
      })),
    );
    const bundle = bundles[this.bundleMenu.cursor];
    if (!bundle) return;

    const given = hall.handedIn(bundle.id);
    const lines = [
      `${bundle.name}: ${hall.complete(bundle.id) ? "done" : `any ${bundle.required} of ${bundle.items.length}`}`,
      bundle.hint,
      ...bundle.items.map(
        (i) =>
          `${given.includes(i.id) ? "[x]" : "[ ]"} ${name(i.id)}${i.minQuality === "normal" ? "" : ` (${i.minQuality} or better)`}${i.count > 1 ? ` ${hall.have(bundle.id, i.id)}/${i.count}` : ""}`,
      ),
      `Reward: ${rewardText(bundle)}`,
    ];
    this.detail.setText(lines.join("\n"));

    const ids: string[] = [];
    for (let i = 0; i < g.inventory.size; i++) {
      const slot = g.inventory.slot(i);
      if (slot && !ids.includes(slot.id)) ids.push(slot.id);
    }
    const rows: Row[] = ids.map((id) => ({
      label: `${name(id)}  x${g.inventory.count(id)}`,
      buttons: [{ text: "Hand in", run: () => this.give(bundle.id, id) }],
    }));
    this.packMenu.setRows(
      rows.length > 0
        ? rows
        : [{ label: "Your backpack is empty.", dim: true, buttons: [] }],
    );
  }

  /** Say why a room cannot take hand-ins yet. */
  private notReady(status: string): void {
    const left = this.state.hall.gateRemaining(this.room);
    this.bundleMenu.setRows([]);
    this.packMenu.setRows([]);
    this.detail.setText(
      status === "locked"
        ? `Not ready yet. Finish ${left} more ${left === 1 ? "bundle" : "bundles"} in the other rooms first.`
        : "Not ready yet. This room has nothing to hand in for now.",
    );
  }

  private give(bundleId: string, itemId: string): void {
    const g = this.state;
    const why = g.hall.problem(g.inventory, bundleId, itemId);
    if (why) return this.say(why);
    const result = g.hall.handIn(g.inventory, g, bundleId, itemId, (gold) =>
      g.cave.addEarnings(gold, g.day.clock.day + 1),
    );
    const bundle = g.hall.bundles.find((b) => b.id === bundleId)!;
    this.say(
      result === "completed"
        ? `${bundle.name} is complete! You receive ${rewardText(bundle)}.`
        : `Handed in ${name(itemId)}.`,
    );
  }

  private close(): void {
    this.scene.stop();
    if (endDue(this.state)) {
      this.state.endSeen = true;
      this.scene.launch("end");
    } else {
      this.scene.resume("farm");
    }
    saveGame(browserStore, this.state);
  }
}
