import Phaser from "phaser";
import type { GameState } from "../core/save";
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
  COOP_COST,
  HAY_PRICE,
  SPECIES,
  SPECIES_ORDER,
  type Species,
  animalProblem,
  buyAnimal,
  buyHay,
  coopCapacity,
  coopProblem,
  coopUpgradeProblem,
  defaultName,
  nextCoopUpgrade,
  orderCoop,
  orderCoopUpgrade,
} from "../core/animals";
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
          cost.wood > 0
            ? `${cost.coin}g and ${cost.wood} wood (have ${g.inventory.count(WOOD)})`
            : `${cost.coin}g`,
        buttons: [{ text: "Order", run: () => this.order() }],
      });
    }
    // The coop, its chicks and hay stand at the carpenter's until the Forest
    // farmstead keeper exists (note 23, slice 1 placeholder).
    if (g.animals.build) {
      rows.push({
        label: "Chicken coop under way",
        detail: `${g.animals.build.daysLeft} days left`,
        dim: true,
        buttons: [],
      });
    } else if (!g.animals.coopBuilt) {
      rows.push({
        label: "Chicken coop",
        detail: `${COOP_COST.coin}g, ${COOP_COST.wood} wood and ${COOP_COST.stone} stone (have ${g.inventory.count("wood")} and ${g.inventory.count("stone")})`,
        dim: coopProblem(g) !== undefined,
        buttons: [{ text: "Order", run: () => this.orderCoop() }],
      });
    } else {
      const up = nextCoopUpgrade(g);
      if (up)
        rows.push({
          label: up.name,
          detail: `${up.coin}g, ${up.wood} wood and ${up.stone} stone (have ${g.inventory.count("wood")} and ${g.inventory.count("stone")}), more room and more animals`,
          dim: coopUpgradeProblem(g) !== undefined,
          buttons: [{ text: "Order", run: () => this.orderUpgrade() }],
        });
      for (const sp of SPECIES_ORDER)
        rows.push({
          label: `Young ${SPECIES[sp].name.toLowerCase()}`,
          detail: `${SPECIES[sp].price}g, grows up in a few days (${g.animals.animals.length}/${coopCapacity(g.animals.tier)} in the coop)`,
          dim: animalProblem(g, sp) !== undefined,
          buttons: [{ text: "Buy", run: () => this.buyAnimal(sp) }],
        });
      rows.push({
        label: "Hay, 10 bales",
        detail: `${HAY_PRICE * 10}g, into the silo (${g.animals.hay} in it)`,
        buttons: [{ text: "Buy", run: () => this.buyHay() }],
      });
    }
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

  private orderCoop(): void {
    const problem = coopProblem(this.state);
    if (problem !== undefined) this.message.setText(problem);
    else if (orderCoop(this.state))
      this.message.setText(
        "Ordered. The carpenter starts tomorrow and takes three days.",
      );
    this.refresh();
  }

  private orderUpgrade(): void {
    const problem = coopUpgradeProblem(this.state);
    if (problem !== undefined) this.message.setText(problem);
    else if (orderCoopUpgrade(this.state))
      this.message.setText(
        "Ordered. The carpenter starts tomorrow and takes three days. The coop stays as it is until then.",
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
          `${a.name} is in the coop. No hay needed on the first day.`,
        );
    }
    this.refresh();
  }

  private buyHay(): void {
    const n = buyHay(this.state, 10);
    this.message.setText(
      n > 0 ? `Bought ${n} hay.` : "No room in the silo, or not enough money.",
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
