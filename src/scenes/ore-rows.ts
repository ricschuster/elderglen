import { itemById } from "../core/items";
import { ORES } from "../core/ore";
import type { GameState } from "../core/save";
import type { Intent } from "../core/protocol";
import { SMITH_STOCK } from "../core/smith";
import type { Row } from "./panel";

/**
 * The ore and coal rows both smiths share: the smith dwarf at the Mountain
 * forge and the Hearthwell smithy (note 77, owner 2026-11-10) sell ore and
 * coal, never bars, and buy raw ore for coin. Same stock and prices at both.
 */
export function oreRows(
  g: GameState,
  act: (intent: Intent, done: string) => void,
): Row[] {
  const rows: Row[] = SMITH_STOCK.map((id) => {
    const def = itemById(id)!;
    const price = def.buyPrice ?? 0;
    const tryBuy = (n: number) => () =>
      act(
        { kind: "smith-buy", what: "ore", id, n },
        `Bought ${n} ${def.name.toLowerCase()} for ${price * n}g.`,
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
          run: () =>
            act({ kind: "smith-sell", id: o.id }, `Sold for ${o.sellPrice}g.`),
        },
        {
          text: "Sell all",
          run: () =>
            act(
              { kind: "smith-sell", id: o.id, all: true },
              `Sold for ${o.sellPrice * have}g.`,
            ),
        },
      ],
    });
  }
  return rows;
}
