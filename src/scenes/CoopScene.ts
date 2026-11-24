import { audio } from "../audio/engine";
import { animalCue } from "../core/audio";
import Phaser from "phaser";
import {
  type Building,
  incubateDays,
  INCUBATOR_TIER,
  hasHeater,
  animalsIn,
  hearts,
  isAdult,
  moodWord,
  siloCapacity,
  SPECIES,
} from "../core/animals";
import { COOP_HEATER, itemById, itemLabel } from "../core/items";
import type { Intent } from "../core/protocol";
import type { GameState } from "../core/save";
import { closeWhenDone, dispatch, followGuest } from "./guestlive";
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
    // A guest's bench rows are sent to the host; the screen redraws when its answer arrives (note 108 group 3).
    followGuest(
      this,
      () => this.refresh(),
      (text) => this.message.setText(text),
    );
    closeWhenDone(this);
    this.refresh();
  }

  /**
   * Run a bench action through the dispatcher. `done` is the line for success (made after the state changed, so
   * it can read it); a guest's answer comes later and redraws the screen.
   */
  private run(intent: Intent, done: () => string, cue?: () => void): void {
    const why = dispatch(this.state, { ...intent, building: this.building });
    if (why === "sent") return;
    if (why === undefined) cue?.();
    this.message.setText(why ?? done());
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
        buttons: [
          {
            text: hasHeater(a, this.building) ? "Take up" : "Place",
            run: () => this.heater(),
          },
        ],
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

  private unfed(): number {
    return animalsIn(this.state, this.building).filter(
      (a) => !a.fed && !a.outside,
    ).length;
  }

  private feed(): void {
    const before = this.unfed();
    this.run(
      { kind: "bench-feed" },
      () => {
        const fed = before - this.unfed();
        return this.unfed() > 0
          ? `Fed ${fed}. Out of hay, ${this.unfed()} still hungry. The keeper sells hay.`
          : `Fed ${fed}.`;
      },
      () => {
        const here = animalsIn(this.state, this.building);
        const one = here[Math.floor(Math.random() * here.length)];
        audio.sfx(
          one
            ? animalCue(one.species)
            : this.building === "barn"
              ? "animal.moo"
              : "animal.cluck",
        );
      },
    );
  }

  private fill(): void {
    const before = this.state.animals.hay;
    this.run(
      { kind: "bench-fill" },
      () => `${this.state.animals.hay - before} hay into the silo.`,
    );
  }

  private pet(id: number): void {
    const kind = this.state.animals.animals.find((a) => a.id === id)?.species;
    this.run(
      { kind: "animal-pet", animal: id },
      () => "You pet it. It looks pleased.",
      () => {
        audio.sfx("animal.pet");
        if (kind) this.time.delayedCall(180, () => audio.sfx(animalCue(kind)));
      },
    );
  }

  private collect(id: number): void {
    const an = this.state.animals.animals.find((a) => a.id === id);
    const item = an?.item ?? (an ? SPECIES[an.species].item : "it");
    this.run(
      { kind: "animal-take", animal: id },
      () => `Took ${itemLabel(item, "it")}.`,
      () => audio.sfx("item.pickup"),
    );
  }

  private heater(): void {
    const placed = hasHeater(this.state.animals, this.building);
    this.run({ kind: "bench-heater" }, () =>
      placed
        ? "You take the heater up."
        : "The heater is in. It will keep them warm in winter.",
    );
  }

  private putEgg(): void {
    this.run({ kind: "bench-egg" }, () => "The egg is in the incubator.");
  }

  private toggle(id: number): void {
    const an = this.state.animals.animals.find((x) => x.id === id);
    const out = an?.outside;
    this.run({ kind: out ? "animal-in" : "animal-out", animal: id }, () =>
      out
        ? `${an?.name} is back inside.`
        : "Out on the grass. Bring it in before night.",
    );
  }

  private name(id: number): void {
    const an = this.state.animals.animals.find((x) => x.id === id);
    if (!an) return;
    const next = window.prompt?.(`Name this animal`, an.name);
    if (!next) return;
    this.run(
      { kind: "animal-name", animal: id, name: next },
      () => `Now called ${an.name}.`,
    );
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
