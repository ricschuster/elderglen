import Phaser from "phaser";
import type { GameState } from "../core/save";
import { HARDWOOD } from "../core/items";
import { DECOR, buyDecor, decorProblem } from "../core/decor";
import {
  CATALOGUE_PRICE,
  buyCatalogue,
  buyFurniture,
  catalogueProblem,
  dailyStock,
  furnitureProblem,
  stationStock,
} from "../core/furniture";
import {
  HOUSE_UPGRADE_NAMES,
  WAITING_ROOMS_LINE,
  nextUpgrade,
  orderProblem,
  orderUpgrade,
  WOOD,
} from "../core/house";
import {
  BUILDINGS,
  BUILDING_ORDER,
  HAY_PRICE,
  IRON_BAR,
  SPECIES,
  type Building,
  type Species,
  animalProblem,
  animalsIn,
  buildingProblem,
  buyAnimal,
  buyHay,
  orderSilo,
  siloProblem,
  SILO_BUILD_DAYS,
  SILO_COST,
  capacityOf,
  defaultName,
  isBuilt,
  nextBuildingUpgrade,
  orderBuildingUpgrade,
  speciesOf,
  tierOf,
  upgradeProblem,
} from "../core/animals";
import {
  moveProblem,
  refundOf,
  removeBuilding,
  removeProblem,
} from "../core/placement";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The carpenter's counter, drawn over the sawmill. Orders the next house
 * upgrade and sells today's furniture. While the work is under way the counter is closed: the carpenter
 * is out at the farm. The sawmill is paused behind it.
 */
export class CarpenterScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  /** The building the player pressed Remove on once, waiting for the second press. */
  private removing: Building | undefined;

  constructor() {
    super("carpenter");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { money, message } = frame(this, "Carpenter", () => this.close());
    this.money = money;
    this.message = message;
    this.add.text(24, 500, "Arrows: move   Enter: order or buy   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: "House and furniture",
      buttonsOnly: true,
    });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-ESC", () => this.close());
    // The placement screen reports back here, then the counter shows the result.
    this.events.on("placed", (text: string) => {
      if (text) this.message.setText(text);
      this.refresh();
    });
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    const cost = nextUpgrade(g.houseTier);
    const rows: Row[] = [];
    if (g.houseBuild) {
      this.message.setText("The carpenter is out at your farm, working.");
      rows.push({
        label: "Work on your house is under way",
        detail: `${g.houseBuild.daysLeft} days left`,
        dim: true,
        buttons: [],
      });
    } else if (!cost) {
      rows.push({
        label: "No more house upgrades yet",
        dim: true,
        buttons: [],
      });
    } else {
      rows.push({
        label: HOUSE_UPGRADE_NAMES[g.houseTier] ?? "House upgrade",
        detail:
          cost.hardwood > 0
            ? `${cost.coin}g and ${cost.hardwood} hardwood (have ${g.inventory.count(HARDWOOD)})`
            : cost.wood > 0
              ? `${cost.coin}g and ${cost.wood} wood (have ${g.inventory.count(WOOD)})`
              : `${cost.coin}g`,
        buttons: [{ text: "Order", run: () => this.order() }],
      });
    }
    // The coop and barn, their animals and hay stand at the carpenter's until
    // the Forest farmstead keeper exists (note 23, slice 1 placeholder).
    const have = `have ${g.inventory.count("wood")} wood and ${g.inventory.count("stone")} stone`;
    if (g.animals.build) {
      const b = g.animals.build;
      rows.push({
        label: `${BUILDINGS[b.building].name} work under way`,
        detail: `${b.daysLeft} days left`,
        dim: true,
        buttons: [],
      });
    }
    for (const id of [...BUILDING_ORDER, "stable" as const]) {
      const info = BUILDINGS[id];
      if (!isBuilt(g.animals, id)) {
        if (g.animals.build?.building === id) continue;
        rows.push({
          label: info.name,
          detail:
            id === "stable"
              ? `${info.cost.coin}g, ${info.cost.hardwood} hardwood and ${info.cost.iron} iron bars (have ${g.inventory.count(HARDWOOD)} hardwood and ${g.inventory.count(IRON_BAR)} iron), comes with a horse`
              : `${info.cost.coin}g, ${info.cost.wood} wood and ${info.cost.stone} stone (${have})`,
          dim: buildingProblem(g, id) !== undefined,
          buttons: [{ text: "Place", run: () => this.orderBuilding(id) }],
        });
        continue;
      }
      const gone = removeProblem(g, id);
      const back = refundOf(g, id);
      rows.push({
        label: `Move the ${info.noun}`,
        detail: "free, and everything in it comes along",
        dim: moveProblem(g, id) !== undefined,
        buttons: [{ text: "Move", run: () => this.place(id, "move") }],
      });
      rows.push({
        label: `Take down the ${info.noun}`,
        detail:
          (gone ?? id === "stable")
            ? `you get back ${back.coin}g, ${back.hardwood} hardwood and ${back.iron} iron bars, and the horse leaves`
            : `you get back ${back.coin}g, ${back.wood} wood and ${back.stone} stone`,
        dim: gone !== undefined,
        buttons: [
          {
            text: this.removing === id ? "Sure?" : "Remove",
            run: () => this.remove(id),
          },
        ],
      });
      const up = nextBuildingUpgrade(g, id);
      if (up && g.animals.build?.building !== id)
        rows.push({
          label: up.name,
          detail: `${up.coin}g, ${up.wood} wood and ${up.stone} stone (${have}), more room and more animals`,
          dim: upgradeProblem(g, id) !== undefined,
          buttons: [{ text: "Order", run: () => this.orderUpgrade(id) }],
        });
      for (const sp of speciesOf(id))
        rows.push({
          label: `Young ${SPECIES[sp].name.toLowerCase()}`,
          detail: `${SPECIES[sp].price}g, grows up in a few days (${animalsIn(g, id).length}/${capacityOf(id, tierOf(g.animals, id))} in the ${info.noun})`,
          dim: animalProblem(g, sp) !== undefined,
          buttons: [{ text: "Buy", run: () => this.buyAnimal(sp) }],
        });
    }
    if (g.animals.siloDays > 0)
      rows.push({
        label: "Silo work under way",
        detail: `${g.animals.siloDays} days left`,
        dim: true,
        buttons: [],
      });
    else if (!g.animals.silo)
      rows.push({
        label: "Silo",
        // The reason it cannot be ordered, else the price. A dim row's button is off.
        detail:
          siloProblem(g) ??
          `${SILO_COST.coin}g, ${SILO_COST.stone} stone, ${SILO_COST.clay} clay, ${SILO_COST["copper-bar"]} copper bars`,
        dim: siloProblem(g) !== undefined,
        buttons: [{ text: "Order", run: () => this.orderSilo() }],
      });
    if (g.animals.coopBuilt || g.animals.barnBuilt)
      rows.push({
        label: "Hay, 10 bales",
        detail: `${HAY_PRICE * 10}g, into your pack (${g.inventory.count("hay")} carried)`,
        buttons: [{ text: "Buy", run: () => this.buyHay() }],
      });
    if (!g.houseBuild && !g.catalogue && g.houseTier >= 1) {
      rows.push({
        label: "Furniture Catalogue",
        detail: `${CATALOGUE_PRICE}g, a book of every piece, free to copy once placed`,
        dim: catalogueProblem(g) !== undefined,
        buttons: [{ text: "Buy", run: () => this.buyCat() }],
      });
    }
    if (!g.houseBuild) {
      const owned = dailyStock(g.day.clock.day);
      // Today's furniture: a random pick that changes each day.
      for (const f of [...stationStock(), ...owned]) {
        rows.push({
          label: f.name,
          detail: `${f.price}g${f.rug ? "  (rug)" : ""}`,
          dim: furnitureProblem(g, f.id) !== undefined,
          buttons: [{ text: "Buy", run: () => this.buy(f.id) }],
        });
      }
    }
    if (!g.houseBuild)
      for (const d of DECOR)
        rows.push({
          label: d.name,
          detail: `${d.price}g  (${d.kind === "floor" ? "covers a room's floor" : "covers a room's walls"})`,
          dim: decorProblem(g, d.id) !== undefined,
          buttons: [{ text: "Buy", run: () => this.buyCovering(d.id) }],
        });
    this.menu.setRows(rows);
  }

  /** Open the placement screen to put a new building down, or move the one that stands. */
  private place(id: Building, mode: "order" | "move"): void {
    this.removing = undefined;
    if (mode === "move") {
      const problem = moveProblem(this.state, id);
      if (problem !== undefined) {
        this.message.setText(problem);
        return this.refresh();
      }
    }
    this.scene.launch("placement", { building: id, mode });
    this.scene.pause();
  }

  private orderBuilding(id: Building): void {
    const problem = buildingProblem(this.state, id);
    if (problem !== undefined) {
      this.message.setText(problem);
      return this.refresh();
    }
    this.place(id, "order");
  }

  /** Two presses: the first asks, the second takes the building down and pays the refund. */
  private remove(id: Building): void {
    const problem = removeProblem(this.state, id);
    if (problem !== undefined) this.message.setText(problem);
    else if (this.removing !== id) {
      this.removing = id;
      this.message.setText(
        `Press Remove again to take down your ${BUILDINGS[id].noun}.`,
      );
    } else if (removeBuilding(this.state, id)) {
      this.removing = undefined;
      this.message.setText(
        `The ${BUILDINGS[id].noun} is down. The carpenter paid you back.`,
      );
    }
    this.refresh();
  }

  private orderUpgrade(id: Building): void {
    const problem = upgradeProblem(this.state, id);
    if (problem !== undefined) this.message.setText(problem);
    else if (orderBuildingUpgrade(this.state, id))
      this.message.setText(
        `Ordered. The carpenter starts tomorrow and takes three days. The ${BUILDINGS[id].noun} stays as it is until then.`,
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

  private orderSilo(): void {
    const problem = siloProblem(this.state);
    if (problem !== undefined) this.message.setText(problem);
    else if (orderSilo(this.state))
      this.message.setText(
        `Ordered. The carpenter starts tomorrow and takes ${SILO_BUILD_DAYS} days.`,
      );
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

  private buyCovering(id: string): void {
    const problem = decorProblem(this.state, id);
    if (problem !== undefined) this.message.setText(problem);
    else if (buyDecor(this.state, id))
      this.message.setText(
        "Bought. Hold it in the house and press Use facing a room.",
      );
    this.refresh();
  }

  private buyCat(): void {
    const problem = catalogueProblem(this.state);
    if (problem !== undefined) this.message.setText(problem);
    else if (buyCatalogue(this.state))
      this.message.setText(
        "Bought. Place it in the house, then press Action on it for copies.",
      );
    this.refresh();
  }

  private buy(id: string): void {
    const problem = furnitureProblem(this.state, id);
    if (problem !== undefined) this.message.setText(problem);
    else if (buyFurniture(this.state, id))
      this.message.setText(
        "Bought. Hold it in the house and press Use to place it.",
      );
    this.refresh();
  }

  private order(): void {
    const problem = orderProblem(this.state);
    if (problem !== undefined) {
      this.message.setText(problem);
    } else {
      orderUpgrade(this.state);
      const tier2 = this.state.houseBuild?.tier === 2;
      this.message.setText(
        `Ordered. The carpenter starts tomorrow and takes three days.${tier2 ? ` ${WAITING_ROOMS_LINE}` : ""}`,
      );
    }
    this.refresh();
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
