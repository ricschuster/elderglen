import Phaser from "phaser";
import { cancelDivorce, divorceProblem, fileDivorce } from "../core/divorce";
import { DIVORCE_FEE } from "../core/marriage";
import type { GameState } from "../core/save";
import { villagerById } from "../core/villagers";
import { resumeSave } from "./storage";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The hall's ledger (note 12, slice 4): where a divorce is filed and, before
 * the day ends, cancelled. The wedding was a ledger joining, so the ledger is
 * the one place to undo it. Placeholder text.
 */
export class LedgerScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("ledger");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { money, message } = frame(this, "The ledger", () => this.close());
    this.money = money;
    this.message = message;
    this.add.text(24, 500, "Arrows: move   Enter: choose   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: "Joined ledgers",
      buttonsOnly: true,
    });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-ESC", () => this.close());
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    const m = g.marriage;
    this.money.setText(`Money ${g.money}g`);
    const rows: Row[] = [];
    if (!m.married || !m.spouse) {
      this.message.setText("PLACEHOLDER TEXT: your page is a single one.");
      rows.push({
        label: "Nothing joined",
        detail: "Only a wedded player has anything to file here",
        dim: true,
        buttons: [],
      });
    } else {
      const name = villagerById(m.spouse)?.name ?? m.spouse;
      if (m.divorcing)
        rows.push({
          label: "Cancel the divorce",
          detail: `Filed. It takes effect in the morning. The ${DIVORCE_FEE}g fee is handed back`,
          buttons: [{ text: "Cancel it", run: () => this.cancel() }],
        });
      else
        rows.push({
          label: `Divorce ${name}`,
          detail: `${DIVORCE_FEE}g. It takes effect tomorrow morning, and you can cancel until tonight. ${name} stays a friend`,
          dim: divorceProblem(g) !== "",
          buttons: [{ text: "File", run: () => this.file() }],
        });
    }
    this.menu.setRows(rows);
  }

  private file(): void {
    const problem = divorceProblem(this.state);
    this.message.setText(
      problem ||
        (fileDivorce(this.state)
          ? "PLACEHOLDER TEXT: the clerk writes it in. It takes effect in the morning unless you cancel."
          : "It cannot be filed."),
    );
    this.refresh();
  }

  private cancel(): void {
    this.message.setText(
      cancelDivorce(this.state)
        ? "PLACEHOLDER TEXT: the page is struck through. Your fee is handed back."
        : "Nothing is filed.",
    );
    this.refresh();
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
    resumeSave(this.state);
  }
}
