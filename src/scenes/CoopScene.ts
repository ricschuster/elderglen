import Phaser from "phaser";
import {
  type Building,
  HATCHES,
  incubateDays,
  INCUBATOR_TIER,
  hasHeater,
  heaterProblem,
  placeHeater,
  animalsIn,
  bringIn,
  collect,
  feedAll,
  hearts,
  incubatorProblem,
  isAdult,
  letOut,
  letOutProblem,
  moodWord,
  pet,
  putEgg,
  rename,
  siloCapacity,
  depositHay,
  SPECIES,
} from "../core/animals";
import { COOP_HEATER, itemById } from "../core/items";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The feeding bench in the coop, or the barn (`BarnScene` is the same screen
 * for the other building): feed everyone from the silo, and one row per animal
 * to pet, collect what it made, let it out or bring it in, and rename it. The
 * big coop's bench also holds the incubator. Placeholder interface until the
 * art pass (note 23).
 */
export class CoopScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor(
    key = "coop-bench",
    protected readonly building: Building = "coop",
  ) {
    super(key);
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { money, message } = frame(
      this,
      this.building === "coop" ? "Coop" : "Barn",
      () => this.close(),
    );
    this.money = money;
    this.message = message;
    this.add.text(
      24,
      500,
      "Up/Down: choose   Enter: pet or feed   Space: take   3: out or in   4: name   Esc: close",
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
    const carried = this.state.inventory.count("hay");
    this.money.setText(
      a.silo
        ? `Silo ${a.hay}/${siloCapacity(this.state)}, pack ${carried}`
        : `Pack ${carried} hay`,
    );
    const rows: Row[] = [
      {
        label: "Feed the animals",
        detail: a.silo
          ? `One hay each, from the hopper (${a.hay} in the silo), then your pack (${carried})`
          : `One hay each, from your pack (${carried}). A silo would feed the bench for you`,
        buttons: [{ text: "Feed", run: () => this.feed() }],
      },
    ];
    if (a.silo)
      rows.push({
        label: "Hopper",
        detail: `Tip the hay you carry (${carried}) into the silo`,
        buttons: [{ text: "Fill", run: () => this.fill() }],
      });
    if (this.building === "coop" && a.tier >= INCUBATOR_TIER)
      rows.push({
        label: "Incubator",
        detail: a.incubator
          ? a.incubator.daysLeft > 0
            ? `${itemById(a.incubator.egg)?.name ?? "Egg"} hatching, ${a.incubator.daysLeft} of ${incubateDays(this.state)} nights left`
            : "Ready, but the coop is full"
          : "Empty. Put an egg in and it hatches in a few nights",
        buttons: [{ text: "Put egg", run: () => this.putEgg() }],
      });
    if (this.building !== "stable")
      rows.push({
        label: "Heater",
        detail: hasHeater(a, this.building)
          ? "Placed. The animals keep warm in winter"
          : `Winter nights wear their mood down without one (you carry ${this.state.inventory.count(COOP_HEATER)})`,
        buttons: [{ text: "Place", run: () => this.heater() }],
      });
    for (const an of animalsIn(this.state, this.building)) {
      const what = itemById(an.item ?? SPECIES[an.species].item)?.name;
      const egg = an.product
        ? `, ${an.product === "normal" ? "" : `${an.product} `}${what?.toLowerCase() ?? "product"} waiting`
        : "";
      rows.push({
        label: an.name,
        detail:
          `${isAdult(an) ? SPECIES[an.species].grown : `young ${SPECIES[an.species].name.toLowerCase()}`}, ${hearts(an)}/5 hearts, ${moodWord(an)}` +
          `${an.fed ? ", fed" : ", hungry"}${an.outside ? ", outside" : ""}${egg}`,
        buttons: [
          { text: "Pet", run: () => this.pet(an.id) },
          { text: "Take", run: () => this.collect(an.id) },
          {
            text: an.outside ? "Bring in" : "Let out",
            run: () => this.toggle(an.id),
          },
          { text: "Name", run: () => this.name(an.id) },
        ],
      });
    }
    if (animalsIn(this.state, this.building).length === 0)
      rows.push({
        label: "No animals yet",
        detail: "The keeper in the Forest sells young animals",
        dim: true,
        buttons: [],
      });
    this.menu.setRows(rows);
  }

  private feed(): void {
    const { fed, short } = feedAll(this.state, this.building);
    this.message.setText(
      fed === 0 && short === 0
        ? "Everyone has eaten."
        : short > 0
          ? `Fed ${fed}. Out of hay, ${short} still hungry. The carpenter sells hay.`
          : `Fed ${fed}.`,
    );
    this.refresh();
  }

  private fill(): void {
    const n = depositHay(this.state);
    this.message.setText(
      n > 0
        ? `${n} hay into the silo.`
        : "No hay to tip in, or the silo is full.",
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
        ? `Took ${itemById(r.item)?.name.toLowerCase() ?? "it"}${r.also ? ` and ${itemById(r.also)?.name.toLowerCase() ?? "more"}` : ""}.`
        : r.problem,
    );
    this.refresh();
  }

  private heater(): void {
    const b = this.building;
    if (placeHeater(this.state, b))
      this.message.setText(
        "The heater is in. It will keep them warm in winter.",
      );
    else this.message.setText(heaterProblem(this.state, b) ?? "No heater.");
    this.refresh();
  }

  private putEgg(): void {
    const egg = Object.keys(HATCHES).find(
      (e) => incubatorProblem(this.state, e) === undefined,
    );
    if (egg && putEgg(this.state, egg))
      this.message.setText(
        `The ${itemById(egg)?.name.toLowerCase() ?? "egg"} is in the incubator.`,
      );
    else
      this.message.setText(
        incubatorProblem(this.state, "egg") ?? "You have no egg to put in.",
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
