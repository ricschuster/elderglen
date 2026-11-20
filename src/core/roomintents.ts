// Farm intents of the RoomWorld (note 53, issue 976): till, plant, water, harvest, axe, pickaxe, buy, sell. Each runs the
// same core function single player uses, as the sending player: their inventory, can, skills,
// tool tiers, wallet and energy. Free of Phaser and the DOM.
import * as actions from "./actions";
import { farmMapOf } from "./farmtypes";
import { itemById } from "./items";
import type { Intent } from "./protocol";
import { LOCAL_PLAYER, type PlayerId } from "./players";
import { potPrice, sellMultiplier } from "./professions";
import { POT_ITEM } from "./pots";
import type { GameState } from "./save";
import { buy, sell } from "./shop";
import { findTool } from "./toolitems";
import { useHeld } from "./tools";

/** Most items one buy or sell intent may move. */
const MAX_COUNT = 999;

const isTile = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 4096;
const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= MAX_COUNT;

/**
 * Run `fn` with the game state acting as player `by`: the local-player accessors (inventory, can,
 * skills, tool tiers, money) point at their record, and the day's energy object holds their energy
 * for the call, so `day.act` and `day.over` spend and test theirs. Everything is put back after.
 */
export function asPlayer<T>(g: GameState, by: PlayerId, fn: () => T): T {
  const players = g.players;
  if (by === players.localId) return fn();
  const rec = players.get(by);
  const day = g.day.energy;
  const kept = { current: day.current, max: day.max };
  const prev = players.localId;
  day.max = rec.energy.max;
  day.current = rec.energy.current;
  players.localId = by;
  try {
    return fn();
  } finally {
    rec.energy.current = day.current;
    rec.energy.max = day.max;
    day.current = kept.current;
    day.max = kept.max;
    players.localId = prev;
  }
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
      return asPlayer(g, by, () =>
        outcome(
          intent.kind === "till"
            ? actions.till(g, x, y, random)
            : actions.water(g, x, y),
        ),
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
      return asPlayer(g, by, () => {
        if (findTool(g.inventory, tool) < 0) return `no ${tool}`;
        // The farm map's stumps, logs, trees, boulders and rocks, as the host's tool: experience
        // (foraging for the axe, mining for the pickaxe), drops, tier and energy are the sender's.
        return outcome(
          useHeld(g, farmMapOf(g), { kind: "tool", tool }, x, y, undefined),
        );
      });
    }
    case "plant": {
      const { x, y, seed } = intent;
      if (!isTile(x) || !isTile(y) || typeof seed !== "string")
        return "bad plant";
      return asPlayer(g, by, () =>
        outcome(actions.plant(g, x, y, seed, random)),
      );
    }
    case "buy": {
      const { id, n } = intent;
      if (typeof id !== "string" || !isCount(n)) return "bad buy";
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
