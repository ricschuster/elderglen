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
  buyAnimal,
  buyHay,
  buyHeater,
  capacityOf,
  defaultName,
  isBuilt,
  speciesOf,
  tierOf,
} from "../core/animals";
import {
  buyFarmDecor,
  farmDecorForSale,
  farmDecorProblem,
} from "../core/farmdecor";
import { COOP_HEATER, HEATER_PRICE, itemById } from "../core/items";
import { placeableById } from "../core/placeables";
import { keeperAdvice } from "../core/forestfolk";
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

  private buyDecor(id: string): void {
    this.message.setText(
      buyFarmDecor(this.state, id) ?? "He wraps it up. It is in your pack.",
    );
    this.refresh();
  }

  private buyHeater(): void {
    this.message.setText(
      buyHeater(this.state) ?? "He wraps a heater for you. It is in your pack.",
    );
    this.refresh();
  }

  private buyAnimal(species: Species): void {
    const problem = animalProblem(this.state, species);
    if (problem !== undefined) this.message.setText(problem);
    else {
      const asked = window.prompt?.(
        `Name your new ${SPECIES[species].name.toLowerCase()}`,
        defaultName(this.state),
      );
      const a = buyAnimal(this.state, species, asked ?? "");
      if (a)
        this.message.setText(
          `${a.name} is in the ${BUILDINGS[SPECIES[species].building].noun}. It needs no hay on the first day.`,
        );
    }
    this.refresh();
  }

  private buyHay(): void {
    const n = buyHay(this.state, 10);
    this.message.setText(
      n > 0
        ? `Bought ${n} hay. It is in your pack.`
        : "Your pack is full, or you do not have the money.",
    );
    this.refresh();
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
