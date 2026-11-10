import { itemById } from "../core/items";
import { ORES } from "../core/ore";
import type { GameState } from "../core/save";
import { buy, sell, sellAll } from "../core/shop";
import { SMITH_STOCK } from "../core/smith";
import type { Row } from "./panel";

/**
 * The ore and coal rows both smiths share: the smith dwarf at the Mountain
 * forge and the Hearthwell smithy (note 77, owner 2026-11-10) sell ore and
 * coal, never bars, and buy raw ore for coin. Same stock and prices at both.
 */
export function oreRows(g: GameState, say: (text: string) => void): Row[] {
  const rows: Row[] = SMITH_STOCK.map((id) => {
    const def = itemById(id)!;
    const price = def.buyPrice ?? 0;
    const tryBuy = (n: number) => () =>
      say(
        buy(g.inventory, g, id, n)
          ? `Bought ${n} ${def.name.toLowerCase()} for ${price * n}g.`
          : g.money < price * n
            ? "Not enough money."
            : "Your backpack is full.",
      );
    return {
      label: def.name,
      detail: `${price}g  have ${g.inventory.count(id)}`,
      buttons: [
        { text: "Buy 1", run: tryBuy(1) },
        { text: "Buy 5", run: tryBuy(5) },
      ],
    };
  });
  for (const o of ORES) {
    const have = g.inventory.count(o.id);
    if (have < 1) continue;
    rows.push({
      label: `Sell ${o.name.toLowerCase()}`,
      detail: `${o.sellPrice}g  have ${have}`,
      buttons: [
        {
          text: "Sell 1",
          run: () => say(`Sold for ${sell(g.inventory, g, o.id, 1)}g.`),
        },
        {
          text: "Sell all",
          run: () => say(`Sold for ${sellAll(g.inventory, g, o.id)}g.`),
        },
      ],
    });
  }
  return rows;
}
