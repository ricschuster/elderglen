// Farm intents of the RoomWorld (note 53, issue 976): till, plant, water, harvest, axe, pickaxe, buy, sell. Each runs the
// same core function single player uses, as the sending player: their inventory, can, skills,
// tool tiers, wallet and energy. Free of Phaser and the DOM.
import * as actions from "./actions";
import { resolveAction, resolveUse } from "./interact";
import { jobDone } from "./machines";
import { pondCovering } from "./pond";
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
import { contextOf, onMap, viewOf, type MapView } from "./roommaps";

/** Most items one buy or sell intent may move. */
const MAX_COUNT = 999;

const isTile = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 4096;
const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= MAX_COUNT;

/**
 * A guest's tool or seed on a tile: the host's own Use rule (`resolveUse`), as the sender, so the farm has
 * one copy of each tool's behaviour. Its intent is the outcome; the sounds and messages are the sender's
 * scene's to make. The map is the one the intent names (note 109), already swapped in by `onMap`.
 */
function useAs(
  g: GameState,
  by: PlayerId,
  v: MapView,
  held: Held,
  x: number,
  y: number,
): string | undefined {
  const r = resolveUse(g, by, contextOf(g, v), held, { x, y });
  return r.kind === "tool" || r.kind === "report"
    ? outcome(r.result)
    : "cannot do that here";
}

/** The intents that name a map (`map`, the farm when absent) and are worked on that map's world. */
export const MAPPED_KINDS = new Set([
  "till",
  "water",
  "harvest",
  "axe",
  "pickaxe",
  "plant",
  "forage",
  "machine-load",
  "machine-collect",
  "pond-use",
]);

/** Of those, the ones that only mean something on the farm (its crops, machines and ponds). */
const FARM_ONLY = new Set([
  "harvest",
  "machine-load",
  "machine-collect",
  "pond-use",
]);

/** The map an intent names, as the host sees it, or a reason it cannot be worked. */
export function mapOfIntent(g: GameState, intent: Intent): MapView | string {
  const name = intent.map ?? "farm";
  if (typeof name !== "string" || name.length > 80) return `bad ${intent.kind}`;
  const v = viewOf(g, name);
  if (!v || (FARM_ONLY.has(intent.kind) && v.kind !== "farm"))
    return "Nothing to do here.";
  return v;
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
  if (!MAPPED_KINDS.has(intent.kind)) return applyOn(g, by, intent, random);
  const v = mapOfIntent(g, intent);
  if (typeof v === "string") return v;
  return onMap(g, v, () => applyOn(g, by, intent, random, v));
}

function applyOn(
  g: GameState,
  by: PlayerId,
  intent: Intent,
  random: () => number,
  v?: MapView,
): string | undefined | null {
  switch (intent.kind) {
    case "till":
    case "water": {
      const { x, y } = intent;
      if (!isTile(x) || !isTile(y)) return `bad ${intent.kind}`;
      return useAs(
        g,
        by,
        v!,
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
      return useAs(g, by, v!, { kind: "tool", tool }, x, y);
    }
    case "plant": {
      const { x, y, seed } = intent;
      if (!isTile(x) || !isTile(y) || typeof seed !== "string")
        return "bad plant";
      if (!cropOfSeed(seed) && seed !== MIXED_SEED) return "bad plant";
      return useAs(g, by, v!, { kind: "item", id: seed, count: 1 }, x, y);
    }
    case "machine-load": {
      // A held good put in the machine on a farm tile: the host's own Use rule, as the sender.
      const { x, y, item } = intent;
      if (!isTile(x) || !isTile(y) || typeof item !== "string")
        return "bad machine-load";
      if (!g.machines.at(x, y)) return "no machine here";
      return useAs(g, by, v!, { kind: "item", id: item, count: 1 }, x, y);
    }
    case "machine-collect": {
      // A finished batch taken out: whoever collects gets the goods (note 108 rule 4). Only a
      // finished one, so a press never lifts a working machine.
      const { x, y } = intent;
      if (!isTile(x) || !isTile(y)) return "bad machine-collect";
      const m = g.machines.get(x, y);
      if (!m) return "no machine here";
      if (!m.job) return "machine empty";
      if (!jobDone(g, m)) return "machine busy";
      const r = resolveAction(
        g,
        by,
        { ...contextOf(g, v!), ladderAt: () => false },
        { kind: "empty" },
        { x, y },
      );
      return r.kind === "report" || r.kind === "act"
        ? outcome(r.result)
        : "cannot do that here";
    }
    case "forage": {
      // Wild goods lying on a map, picked by whoever gets there first (note 109 rule 1). The Action rule, as the sender.
      const { x, y } = intent;
      if (!isTile(x) || !isTile(y)) return "bad forage";
      if (!g.forage.itemAt(x, y)) return "Nothing to pick here.";
      const r = resolveAction(
        g,
        by,
        { ...contextOf(g, v!), ladderAt: () => false },
        { kind: "empty" },
        { x, y },
      );
      return r.kind === "act" || r.kind === "report"
        ? outcome(r.result)
        : "Nothing to pick here.";
    }
    case "pond-use": {
      // The Action press on a pond with a held item (the quest item, a fish, or nothing to take a waiting
      // product): the host's own Action rule, as the sender (note 108 group 3). The menu is a screen, not this.
      const { x, y, item } = intent;
      if (!isTile(x) || !isTile(y)) return "bad pond-use";
      if (item !== undefined && typeof item !== "string") return "bad pond-use";
      if (!pondCovering(g, x, y)) return "no pond here";
      const r = resolveAction(
        g,
        by,
        { ...contextOf(g, v!), ladderAt: () => false },
        item === undefined
          ? { kind: "empty" }
          : { kind: "item", id: item, count: 1 },
        { x, y },
      );
      return r.kind === "report" || r.kind === "act"
        ? outcome(r.result)
        : "The pond has nothing to take or give.";
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
