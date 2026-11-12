import Phaser from "phaser";
import { itemById } from "../core/items";
import type { GameState } from "../core/save";
import type { TailorKind } from "../core/clothes";
import {
  POT_COLOURS,
  dyePiece,
  pieceName,
  potColourOf,
  sew,
  sewProblem,
  sewableSpool,
  spoolRowOf,
  undye,
} from "../core/tailoring";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The Hatter's sewing machine and dye pots (note 96). Mode `sew` lists what the pack
 * can put on the spool; mode `dye` dyes a worn hat, shirt or pants with six items from
 * the pack, one per pot, and a hue, saturation and value choice. Placeholder screen.
 */
export class TailorScene extends Phaser.Scene {
  private state!: GameState;
  private mode: "sew" | "dye" = "sew";
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;
  private tint = { h: 200, s: 0.6, v: 0.9 };

  constructor() {
    super("tailor");
  }

  init(data: { mode?: "sew" | "dye" }): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.mode = data.mode ?? "sew";
  }

  create(): void {
    const f = frame(
      this,
      this.mode === "sew" ? "Sewing machine" : "Dye pots",
      () => this.close(),
    );
    this.message = f.message;
    this.add.text(24, 500, "Arrows: move   Enter: choose   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, { x: 24, y: 64, w: 912, title: "Choose" });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-ESC", () => this.close());
    this.refresh();
  }

  private refresh(): void {
    this.menu.setRows(this.mode === "sew" ? this.sewRows() : this.dyeRows());
  }

  private sewRows(): Row[] {
    const g = this.state;
    this.message.setText("One cloth in the feed, one item on the spool.");
    const rows: Row[] = sewableSpool(g).map((item) => {
      const row = spoolRowOf(item)!;
      const problem = sewProblem(g, item);
      return {
        label: `Spool ${itemById(item)?.name ?? item}`,
        detail: `${pieceName(row.kind, row.id)}${problem ? ` (${problem})` : ""}`,
        dim: problem !== undefined,
        buttons: [
          {
            text: "Sew",
            run: () => {
              const r = sew(g, item);
              this.message.setText(
                r.ok ? `You sew a ${r.name.toLowerCase()}.` : r.reason,
              );
              this.refresh();
            },
          },
        ],
      };
    });
    if (rows.length === 0)
      rows.push({ label: "Nothing in your pack fits the spool", buttons: [] });
    return rows;
  }

  private dyeRows(): Row[] {
    const g = this.state;
    const w = g.wardrobe;
    this.message.setText("Six items, one for each pot, then pick the colour.");
    const t = this.tint;
    const adjust = (key: "h" | "s" | "v", d: number): void => {
      if (key === "h") t.h = (t.h + d + 360) % 360;
      else
        t[key] = Math.min(1, Math.max(0, Math.round((t[key] + d) * 100) / 100));
      this.refresh();
    };
    const rows: Row[] = [
      {
        label: "Hue",
        detail: `${t.h}`,
        buttons: [
          { text: "-", run: () => adjust("h", -20) },
          { text: "+", run: () => adjust("h", 20) },
        ],
      },
      {
        label: "Saturation",
        detail: `${Math.round(t.s * 100)}%`,
        buttons: [
          { text: "-", run: () => adjust("s", -0.1) },
          { text: "+", run: () => adjust("s", 0.1) },
        ],
      },
      {
        label: "Value",
        detail: `${Math.round(t.v * 100)}%`,
        buttons: [
          { text: "-", run: () => adjust("v", -0.1) },
          { text: "+", run: () => adjust("v", 0.1) },
        ],
      },
    ];
    for (const kind of ["hat", "shirt", "pants"] as TailorKind[]) {
      const id = w.wornOf(kind);
      if (!id) continue;
      rows.push({
        label: `Dye your ${kind}: ${pieceName(kind, id)}`,
        detail: w.tintOf(kind, id) ? "dyed" : undefined,
        buttons: [
          {
            text: "Dye",
            run: () => {
              const pots = this.pickPots();
              const refused = pots
                ? dyePiece(g, kind, id, pots, t)
                : `You need one item for each of the ${POT_COLOURS.join(", ")} pots.`;
              this.message.setText(refused ?? "The colour takes.");
              this.refresh();
            },
          },
          {
            text: "Undo",
            run: () => {
              undye(g, kind, id);
              this.refresh();
            },
          },
        ],
      });
    }
    if (rows.length === 3)
      rows.push({ label: "Wear a hat, shirt or pants to dye it", buttons: [] });
    return rows;
  }

  /** The first pack item that stains each pot, or undefined when a pot has none. */
  private pickPots(): string[] | undefined {
    const g = this.state;
    const used = new Map<string, number>();
    const out: string[] = [];
    for (const colour of POT_COLOURS) {
      let found: string | undefined;
      for (let i = 0; i < g.inventory.size && !found; i++) {
        const slot = g.inventory.slot(i);
        if (
          slot &&
          potColourOf(slot.id) === colour &&
          slot.count > (used.get(slot.id) ?? 0)
        )
          found = slot.id;
      }
      if (!found) return undefined;
      used.set(found, (used.get(found) ?? 0) + 1);
      out.push(found);
    }
    return out;
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
