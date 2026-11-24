// Screen actions that change the world (note 108, group 1): chest moves, the camp chest and the
// Night Market stalls. Each runs the same core function single player uses, as the sending player.
// Applied by the host, and again on every guest's copy when the host's `applied` arrives. Whether
// the sender may use the screen at all (open, lock, reach) is judged by the host first
// (`GameRoomWorld`, `Screens`). Free of Phaser and the DOM.
import { campChestMove } from "./camp";
import { CHEST_COLOURS } from "./chestdefs";
import { colourChest, type PlacedChest } from "./chests";
import { fillStacks, quickMove, transfer } from "./chestmenu";
import { counterName } from "./festivals";
import { buyAtStall, marketProblem, marketStock, stallOf } from "./nightmarket";
import { sortPack } from "./packmenu";
import type { Intent } from "./protocol";
import { parseRef, type ScreenRef } from "./screens";
import type { GameState } from "./save";
import type { PlayerId } from "./players";
import { asPlayer } from "./asplayer";

const isIndex = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 4096;
const isSide = (v: unknown): v is "chest" | "pack" =>
  v === "chest" || v === "pack";

/** The intent kinds that need a screen open, and which screens serve them. */
export const SCREEN_INTENTS: Record<string, string[]> = {
  buy: ["shop"],
  sell: ["shop"],
  "market-buy": ["market"],
  ship: ["bin"],
  "take-back": ["bin"],
  "chest-move": ["chest"],
  "chest-send": ["chest"],
  "chest-fill": ["chest"],
  "chest-sort": ["chest"],
  "chest-colour": ["chest"],
  "camp-take": ["camp-chest"],
};

/** The chest an intent names, from its `chest` field (the same tile the screen was opened on). */
export function chestOf(g: GameState, intent: Intent): PlacedChest | undefined {
  const ref = parseRef({ ...(intent.chest as object), kind: "chest" });
  return ref && g.chests.get(ref.map, ref.x, ref.y);
}

/** True when an intent's own target matches the screen the sender opened. */
export function targetsScreen(intent: Intent, open: ScreenRef): boolean {
  switch (open.kind) {
    case "chest": {
      const r = parseRef({ ...(intent.chest as object), kind: "chest" });
      return !!r && r.map === open.map && r.x === open.x && r.y === open.y;
    }
    case "camp-chest":
      return intent.floor === open.floor;
    case "market":
      return intent.stall === open.stock;
    case "shop":
      return (
        (intent.stock === undefined && open.stock === undefined) ||
        intent.stock === open.stock
      );
    default:
      return true;
  }
}

/** Apply a screen intent. `null` when the kind is not one of these (the caller tries the next). */
export function applyScreenIntent(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined | null {
  switch (intent.kind) {
    case "market-buy": {
      const stall = typeof intent.stall === "string" && stallOf(intent.stall);
      const line = intent.line;
      if (!stall || !isIndex(line)) return "bad market-buy";
      return asPlayer(g, by, () => {
        const entry = marketStock(stall, g.day.clock.day)[line];
        if (!entry) return "That is not on sale here.";
        const why = marketProblem(g, stall, entry);
        if (why !== undefined) return why || "closed";
        return buyAtStall(g, stall, entry)
          ? undefined
          : `You cannot buy the ${counterName(entry)}.`;
      });
    }
    case "camp-take": {
      const floor = intent.floor;
      if (!isIndex(floor)) return "bad camp-take";
      return asPlayer(g, by, () => {
        const r = campChestMove(g, floor, "chest");
        return r.ok ? undefined : r.reason;
      });
    }
    case "chest-move":
    case "chest-send":
    case "chest-fill":
    case "chest-sort":
    case "chest-colour":
      return applyChestIntent(g, by, intent);
    default:
      return null;
  }
}

function applyChestIntent(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined {
  const chest = chestOf(g, intent);
  if (!chest) return "no chest there";
  const pack = g.players.get(by).inventory;
  const side = (s: "chest" | "pack") => (s === "chest" ? chest.items : pack);
  switch (intent.kind) {
    case "chest-move": {
      const { from, slot, to, toSlot, half } = intent;
      if (!isSide(from) || !isSide(to) || !isIndex(slot) || !isIndex(toSlot))
        return "bad chest-move";
      return transfer(side(from), slot, side(to), toSlot, {
        half: half === true,
        chestSide: chest.items,
      })
        ? undefined
        : "That will not go there.";
    }
    case "chest-send": {
      const { side: from, slot, most } = intent;
      if (!isSide(from) || !isIndex(slot)) return "bad chest-send";
      if (most !== undefined && !(typeof most === "number" && most >= 1))
        return "bad chest-send";
      const other = from === "chest" ? "pack" : "chest";
      return quickMove(
        side(from),
        slot,
        side(other),
        chest.items,
        typeof most === "number" ? most : Infinity,
      ) > 0
        ? undefined
        : "Nothing moved: no room, or a tool.";
    }
    case "chest-fill":
      return fillStacks(pack, chest.items) > 0 ? undefined : "Nothing to fill.";
    case "chest-sort":
      sortPack(chest.items);
      return undefined;
    default: {
      // chest-colour
      const n = intent.colour;
      if (!(isIndex(n) && n <= CHEST_COLOURS.length)) return "bad colour";
      return colourChest(chest, n) ? undefined : "bad colour";
    }
  }
}
