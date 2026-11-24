// Farm intents of the RoomWorld (note 53, issue 976): till, plant, water, harvest, axe, pickaxe, buy, sell. Each runs the
// same core function single player uses, as the sending player: their inventory, can, skills,
// tool tiers, wallet and energy. Free of Phaser and the DOM.
import * as actions from "./actions";
import { farmMapOf, farmTypeById } from "./farmtypes";
import { resolveUse } from "./interact";
import { cropOfSeed, itemById } from "./items";
import { MIXED_SEED } from "./weeds";
import type { Intent } from "./protocol";
import { asPlayer } from "./asplayer";
import { LOCAL_PLAYER, type PlayerId } from "./players";
import { potPrice, sellMultiplier } from "./professions";
import { POT_ITEM } from "./pots";
import type { GameState } from "./save";
import { buy, sell } from "./shop";
import { isShopStock, shopBuy } from "./shopoffers";
import { findTool } from "./toolitems";
import type { Held } from "./toolbar";

/** Most items one buy or sell intent may move. */
const MAX_COUNT = 999;

const isTile = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 4096;
const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= MAX_COUNT;

/**
 * A guest's tool or seed on a farm tile: the host's own Use rule (`resolveUse`), as the sender,
 * so the farm has one copy of each tool's behaviour. Its intent is the outcome; the sounds and
 * messages are the sender's scene's to make.
 */
function useAs(
  g: GameState,
  by: PlayerId,
  held: Held,
  x: number,
  y: number,
): string | undefined {
  const map = farmMapOf(g);
  const r = resolveUse(
    g,
    by,
    {
      mapId: farmTypeById(g.farmType).map,
      map,
      facing: "down",
      rockAt: () => false,
      litBombAt: () => false,
      personAt: () => false,
    },
    held,
    { x, y },
  );
  return r.kind === "tool" || r.kind === "report"
    ? outcome(r.result)
    : "cannot do that here";
}

const outcome = (o: actions.Outcome): string | undefined =>
  o.ok ? undefined : o.reason;

/** Apply a farm intent. `null` when the kind is not one of these (the caller tries the next). */
export function applyFarmIntent(
  g: GameState,
  by: PlayerId,
  intent: Intent,
  random: () => number,
): string | undefined | null {
  switch (intent.kind) {
    case "till":
    case "water": {
      const { x, y } = intent;
      if (!isTile(x) || !isTile(y)) return `bad ${intent.kind}`;
      return useAs(
        g,
        by,
        { kind: "tool", tool: intent.kind === "till" ? "hoe" : "can" },
        x,
        y,
      );
    }
    case "harvest": {
      const { x, y } = intent;
      if (!isTile(x) || !isTile(y)) return "bad harvest";
      // Experience and the crop go to the sender: the single player function, as them.
      return asPlayer(g, by, () => outcome(actions.harvest(g, x, y, random)));
    }
    case "axe":
    case "pickaxe": {
      const { x, y } = intent;
      if (!isTile(x) || !isTile(y)) return `bad ${intent.kind}`;
      const tool = intent.kind;
      if (asPlayer(g, by, () => findTool(g.inventory, tool)) < 0)
        return `no ${tool}`;
      // The farm map's stumps, logs, trees, boulders and rocks, as the host's tool: experience
      // (foraging for the axe, mining for the pickaxe), drops, tier and energy are the sender's.
      return useAs(g, by, { kind: "tool", tool }, x, y);
    }
    case "plant": {
      const { x, y, seed } = intent;
      if (!isTile(x) || !isTile(y) || typeof seed !== "string")
        return "bad plant";
      if (!cropOfSeed(seed) && seed !== MIXED_SEED) return "bad plant";
      return useAs(g, by, { kind: "item", id: seed, count: 1 }, x, y);
    }
    case "buy": {
      const { id, n, stock } = intent;
      if (typeof id !== "string" || !isCount(n)) return "bad buy";
      // A special counter (the hermit, the herb stall, the road trader) runs its own rules.
      if (stock !== undefined) {
        if (!isShopStock(stock)) return "bad buy";
        return asPlayer(g, by, () => shopBuy(g, stock, id, n));
      }
      const rec = g.players.get(by);
      const base = itemById(id)?.buyPrice;
      const price =
        id === POT_ITEM && base !== undefined
          ? potPrice(rec.skills, base)
          : undefined;
      return buy(rec.inventory, g.players.wallet(by), id, n, price)
        ? undefined
        : "cannot buy";
    }
    case "sell": {
      const { id, n } = intent;
      if (typeof id !== "string" || !isCount(n)) return "bad sell";
      const rec = g.players.get(by);
      const mult = sellMultiplier(rec.skills, id);
      return sell(rec.inventory, g.players.wallet(by), id, n, mult) > 0
        ? undefined
        : "cannot sell";
    }
    case "ship": {
      const { id, n, ore } = intent;
      if (typeof id !== "string" || !isCount(n)) return "bad ship";
      const rec = g.players.get(by);
      const mult = sellMultiplier(rec.skills, id);
      const sent =
        ore === true
          ? g.bin.shipOre(rec.inventory, id, n, mult, by)
          : g.bin.ship(rec.inventory, id, n, mult, by);
      return sent > 0 ? undefined : "nothing shipped";
    }
    case "take-back": {
      const { index, n } = intent;
      if (typeof index !== "number" || !Number.isInteger(index) || index < 0)
        return "bad take-back";
      if (!isCount(n)) return "bad take-back";
      const line = g.bin.each()[index];
      if (!line || (line.by ?? LOCAL_PLAYER) !== by) return "not your goods";
      return g.bin.takeBack(g.players.get(by).inventory, index, n) > 0
        ? undefined
        : "pack full";
    }
    default:
      return null;
  }
}
