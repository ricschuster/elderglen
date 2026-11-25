import Phaser from "phaser";
import type { GameState } from "../core/save";
import {
  BUILDINGS,
  BUILDING_ORDER,
  HAY_PRICE,
  SPECIES,
  type Species,
  animalProblem,
  animalsIn,
  capacityOf,
  defaultName,
  isBuilt,
  speciesOf,
  tierOf,
} from "../core/animals";
import { farmDecorForSale, farmDecorProblem } from "../core/farmdecor";
import {
  ANIMAL_CATALOGUE,
  ANIMAL_CATALOGUE_PRICE,
  COOP_HEATER,
  HEATER_PRICE,
  itemById,
} from "../core/items";
import { catalogueProblem, rowOpen } from "../core/yeartwo";
import { placeableById } from "../core/placeables";
import { keeperAdvice } from "../core/forestfolk";
import { closeWhenDone, dispatch, followGuest } from "./guestlive";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The animal keeper's counter in the Forest farmstead (note 72, note 23): young
 * animals for the coop and barn the player has built, and hay. The carpenter
 * builds and upgrades the buildings. Opens from the keeper's house.
 */
export class KeeperScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("keeper");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { money, message } = frame(this, "Keeper", () => this.close());
    this.money = money;
    this.message = message;
    this.message.setText(keeperAdvice(this.state.day.clock.day));
    this.add.text(24, 500, "Arrows: move   Enter: buy   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: "Young animals and hay",
      buttonsOnly: true,
    });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-ESC", () => this.close());
    // A guest's buys are sent to the host; the counter redraws when its answer arrives (note 108 group 3).
    followGuest(
      this,
      () => this.refresh(),
      (text) => this.message.setText(text),
    );
    closeWhenDone(this);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    const rows: Row[] = [];
    for (const id of BUILDING_ORDER) {
      if (!isBuilt(g.animals, id)) continue;
      const info = BUILDINGS[id];
      for (const sp of speciesOf(id))
        rows.push({
          label: `Young ${SPECIES[sp].name.toLowerCase()}`,
          detail: `${SPECIES[sp].price}g, grows up in a few days (${animalsIn(g, id).length}/${capacityOf(id, tierOf(g.animals, id))} in the ${info.noun})`,
          dim: animalProblem(g, sp) !== undefined,
          buttons: [{ text: "Buy", run: () => this.buyAnimal(sp) }],
        });
    }
    if (rows.length === 0)
      rows.push({
        label: "No coop or barn yet",
        detail: "The carpenter builds them. Come back with one standing",
        dim: true,
        buttons: [],
      });
    if (g.animals.coopBuilt || g.animals.barnBuilt)
      rows.push({
        label: "Hay, 10 bales",
        detail: `${HAY_PRICE * 10}g, into your pack (${g.inventory.count("hay")} carried)`,
        buttons: [{ text: "Buy", run: () => this.buyHay() }],
      });
    if (g.animals.coopBuilt || g.animals.barnBuilt)
      rows.push({
        label: "Heater",
        detail: `${HEATER_PRICE}g, one for the coop or the barn, placed from the building's menu (${g.inventory.count(COOP_HEATER)} carried)`,
        dim: g.money < HEATER_PRICE,
        buttons: [{ text: "Buy", run: () => this.buyHeater() }],
      });
    if (rowOpen(ANIMAL_CATALOGUE, g.day.clock.day))
      rows.push({
        label: "Animal Catalogue",
        detail: `${ANIMAL_CATALOGUE_PRICE}g, bought once (${g.inventory.count(ANIMAL_CATALOGUE)} carried)`,
        dim: catalogueProblem(g) !== undefined,
        buttons: [{ text: "Buy", run: () => this.buyCatalogue() }],
      });
    for (const id of farmDecorForSale()) {
      const def = placeableById(id)!;
      rows.push({
        label: itemById(id)?.name ?? id,
        detail: `${def.price}g, a farm decoration (${g.inventory.count(id)} carried)`,
        dim: farmDecorProblem(g, id) !== undefined,
        buttons: [{ text: "Buy", run: () => this.buyDecor(id) }],
      });
    }
    this.menu.setRows(rows);
  }

  /** Send a buy through the dispatcher. `done` is the line for a bought item; a guest's answer comes later. */
  private buy(intent: Record<string, unknown>, done: string): void {
    const why = dispatch(this.state, { kind: "keeper-buy", ...intent });
    if (why === "sent") return;
    this.message.setText(why ?? done);
    this.refresh();
  }

  private buyDecor(id: string): void {
    this.buy({ what: "decor", id }, "He wraps it up. It is in your pack.");
  }

  private buyCatalogue(): void {
    this.buy(
      { what: "catalogue" },
      "He hands you the catalogue. It is in your pack.",
    );
  }

  private buyHeater(): void {
    this.buy(
      { what: "heater" },
      "He wraps a heater for you. It is in your pack.",
    );
  }

  private buyAnimal(species: Species): void {
    const problem = animalProblem(this.state, species);
    if (problem !== undefined) {
      this.message.setText(problem);
      return this.refresh();
    }
    const asked = window.prompt?.(
      `Name your new ${SPECIES[species].name.toLowerCase()}`,
      defaultName(this.state),
    );
    this.buy(
      { what: "animal", species, name: asked ?? "" },
      `${asked || defaultName(this.state)} is in the ${BUILDINGS[SPECIES[species].building].noun}. It needs no hay on the first day.`,
    );
  }

  private buyHay(): void {
    this.buy({ what: "hay", n: 10 }, "Bought 10 hay. It is in your pack.");
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
