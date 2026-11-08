import Phaser from "phaser";
import {
  bringIn,
  collect,
  feedAll,
  hearts,
  isAdult,
  letOut,
  letOutProblem,
  moodWord,
  pet,
  rename,
  SILO_CAPACITY,
} from "../core/animals";
import { itemById } from "../core/items";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The feeding bench in the coop: feed everyone from the silo, and one row per
 * animal to pet, collect its egg, let it out or bring it in, and rename it.
 * Placeholder interface until the art pass (note 23).
 */
export class CoopScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("coop-bench");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { money, message } = frame(this, "Coop", () => this.close());
    this.money = money;
    this.message = message;
    this.add.text(
      24,
      500,
      "Up/Down: choose   Enter: pet or feed   Space: egg   3: out or in   4: name   Esc: close",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: "Your animals",
      buttonsOnly: true,
    });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-SPACE", () => this.menu.press(1));
    kb?.on("keydown-THREE", () => this.menu.press(2));
    kb?.on("keydown-FOUR", () => this.menu.press(3));
    kb?.on("keydown-ESC", () => this.close());
    this.refresh();
  }

  private refresh(): void {
    const a = this.state.animals;
    this.money.setText(`Hay ${a.hay}/${SILO_CAPACITY}`);
    const rows: Row[] = [
      {
        label: "Feed the animals",
        detail: `One hay each, from the silo (${a.hay} hay)`,
        buttons: [{ text: "Feed", run: () => this.feed() }],
      },
    ];
    for (const an of a.animals) {
      const egg = an.product
        ? `, ${an.product === "normal" ? "" : `${an.product} `}egg waiting`
        : "";
      rows.push({
        label: an.name,
        detail:
          `${isAdult(an) ? "hen" : "chick"}, ${hearts(an)}/5 hearts, ${moodWord(an)}` +
          `${an.fed ? ", fed" : ", hungry"}${an.outside ? ", outside" : ""}${egg}`,
        buttons: [
          { text: "Pet", run: () => this.pet(an.id) },
          { text: "Egg", run: () => this.collect(an.id) },
          {
            text: an.outside ? "Bring in" : "Let out",
            run: () => this.toggle(an.id),
          },
          { text: "Name", run: () => this.name(an.id) },
        ],
      });
    }
    if (a.animals.length === 0)
      rows.push({
        label: "No animals yet",
        detail: "The carpenter sells young chickens",
        dim: true,
        buttons: [],
      });
    this.menu.setRows(rows);
  }

  private feed(): void {
    const { fed, short } = feedAll(this.state);
    this.message.setText(
      fed === 0 && short === 0
        ? "Everyone has eaten."
        : short > 0
          ? `Fed ${fed}. The silo ran out, ${short} still hungry. The carpenter sells hay.`
          : `Fed ${fed}.`,
    );
    this.refresh();
  }

  private pet(id: number): void {
    this.message.setText(
      pet(this.state, id)
        ? "You pet it. It looks pleased."
        : "Already petted today.",
    );
    this.refresh();
  }

  private collect(id: number): void {
    const r = collect(this.state, id);
    this.message.setText(
      "item" in r
        ? `Took a ${itemById(r.item)?.name.toLowerCase() ?? "egg"}.`
        : r.problem,
    );
    this.refresh();
  }

  private toggle(id: number): void {
    const an = this.state.animals.animals.find((x) => x.id === id);
    if (an?.outside) {
      bringIn(this.state, id);
      this.message.setText(`${an.name} is back inside.`);
    } else {
      const problem = letOutProblem(this.state, id);
      if (problem !== undefined) this.message.setText(problem);
      else {
        letOut(this.state, id);
        this.message.setText("Out on the grass. Bring it in before night.");
      }
    }
    this.refresh();
  }

  private name(id: number): void {
    const an = this.state.animals.animals.find((x) => x.id === id);
    if (!an) return;
    const next = window.prompt?.(`Name this animal`, an.name);
    if (next && rename(this.state, id, next))
      this.message.setText(`Now called ${an.name}.`);
    this.refresh();
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
