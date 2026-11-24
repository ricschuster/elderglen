// Screen actions that change the world (note 108, group 1): chest moves, the camp chest and the
// Night Market stalls. Each runs the same core function single player uses, as the sending player.
// Applied by the host, and again on every guest's copy when the host's `applied` arrives. Whether
// the sender may use the screen at all (open, lock, reach) is judged by the host first
// (`GameRoomWorld`, `Screens`). Free of Phaser and the DOM.
import {
  type Building,
  SPECIES,
  animalProblem,
  bringIn,
  buyAnimal,
  buyHay,
  buyHeater,
  collect as collectAnimal,
  depositHay,
  feedAll,
  HATCHES,
  incubatorProblem,
  letOut,
  letOutProblem,
  pet,
  pickUpHeater,
  placeHeater,
  heaterProblem,
  hasHeater,
  putEgg,
  rename,
  type Species,
} from "./animals";
import { campChestMove } from "./camp";
import { buyFarmDecor } from "./farmdecor";
import { emptyPond, pondAt } from "./pond";
import { CHEST_COLOURS } from "./chestdefs";
import { colourChest, type PlacedChest } from "./chests";
import { fillStacks, quickMove, transfer } from "./chestmenu";
import { cook } from "./cooking";
import { craft } from "./crafting";
import { collect as collectBar, smelt } from "./furnace";
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

const BENCHES = ["coop-bench", "barn-bench"];

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
  cook: ["cooking"],
  smelt: ["furnace"],
  "furnace-take": ["furnace"],
  "keeper-buy": ["keeper"],
  "bench-feed": BENCHES,
  "bench-fill": BENCHES,
  "bench-heater": BENCHES,
  "bench-egg": BENCHES,
  "animal-pet": BENCHES,
  "animal-take": BENCHES,
  "animal-out": BENCHES,
  "animal-in": BENCHES,
  "animal-name": BENCHES,
  "pond-empty": ["pond"],
};

/**
 * The screens an intent needs open, or undefined when it needs none. A `craft` names a `bench` when it
 * is made at a workbench (it then also draws on the chests beside it); without one it is the pause
 * menu's crafting, from the pack alone, which has no screen.
 */
export function screenNeed(intent: Intent): string[] | undefined {
  if (intent.kind === "craft")
    return intent.bench === undefined ? undefined : ["crafting"];
  return SCREEN_INTENTS[intent.kind];
}

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
    case "crafting": {
      const r = parseRef({ ...(intent.bench as object), kind: "crafting" });
      return !!r && r.map === open.map && r.x === open.x && r.y === open.y;
    }
    case "coop-bench":
    case "barn-bench":
      return intent.building === (open.kind === "coop-bench" ? "coop" : "barn");
    case "pond": {
      const p = intent.pond as { x?: unknown; y?: unknown } | undefined;
      return !!p && p.x === open.x && p.y === open.y;
    }
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
    case "craft": {
      const id = intent.recipe;
      if (typeof id !== "string") return "bad craft";
      // At a workbench the chests beside it are drawn on, as for the host's own bench.
      const b =
        intent.bench === undefined
          ? undefined
          : parseRef({ ...(intent.bench as object), kind: "crafting" });
      if (intent.bench !== undefined && !b) return "bad craft";
      const chests = b ? g.chests.near(b.map, b.x, b.y) : [];
      return asPlayer(g, by, () => craft(g, id, chests));
    }
    case "cook": {
      const id = intent.dish;
      if (typeof id !== "string") return "bad cook";
      return asPlayer(g, by, () => cook(g, id));
    }
    case "smelt": {
      const bar = intent.bar;
      if (typeof bar !== "string") return "bad smelt";
      return asPlayer(g, by, () => smelt(g, bar));
    }
    case "furnace-take":
      return asPlayer(g, by, () => {
        const r = collectBar(g);
        return r.ok ? undefined : r.reason;
      });
    case "camp-take": {
      const floor = intent.floor;
      if (!isIndex(floor)) return "bad camp-take";
      return asPlayer(g, by, () => {
        const r = campChestMove(g, floor, "chest");
        return r.ok ? undefined : r.reason;
      });
    }
    case "keeper-buy":
      return applyKeeperBuy(g, by, intent);
    case "bench-feed":
    case "bench-fill":
    case "bench-heater":
    case "bench-egg":
    case "animal-pet":
    case "animal-take":
    case "animal-out":
    case "animal-in":
    case "animal-name":
      return applyBenchIntent(g, by, intent);
    case "pond-empty": {
      const p = intent.pond as { x?: unknown; y?: unknown } | undefined;
      if (!p || !isIndex(p.x) || !isIndex(p.y)) return "bad pond-empty";
      const at = { x: p.x, y: p.y };
      if (!pondAt(g, at.x, at.y)) return "There is no pond here.";
      return asPlayer(g, by, () => {
        const r = emptyPond(g, at.x, at.y);
        return r.ok ? undefined : (r.reason ?? "Nothing to take.");
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

const isBuilding = (v: unknown): v is "coop" | "barn" =>
  v === "coop" || v === "barn";

/**
 * The keeper's counter (note 108 group 3): a young animal, hay, a heater or a farm decoration. The sender's
 * purse pays and the goods go to the sender's pack, except the animal, which goes to the shared coop or barn.
 */
function applyKeeperBuy(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined {
  const { what, species, name, id, n } = intent;
  switch (what) {
    case "animal": {
      if (typeof species !== "string" || !(species in SPECIES))
        return "bad keeper-buy";
      if (name !== undefined && (typeof name !== "string" || name.length > 60))
        return "bad keeper-buy";
      return asPlayer(g, by, () => {
        const why = animalProblem(g, species as Species);
        if (why !== undefined) return why;
        return buyAnimal(g, species as Species, name ?? "")
          ? undefined
          : "You cannot buy that.";
      });
    }
    case "hay": {
      const count = n === undefined ? 10 : n;
      if (
        typeof count !== "number" ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > 99
      )
        return "bad keeper-buy";
      return asPlayer(g, by, () =>
        buyHay(g, count) > 0
          ? undefined
          : "Your pack is full, or you do not have the money.",
      );
    }
    case "heater":
      return asPlayer(g, by, () => buyHeater(g));
    case "decor":
      if (typeof id !== "string") return "bad keeper-buy";
      return asPlayer(g, by, () => buyFarmDecor(g, id));
    default:
      return "bad keeper-buy";
  }
}

/**
 * A bench row in the coop or barn (note 108 group 3, rule 6): feed from the silo and then the sender's pack,
 * pet (once a day, by anyone), collect (the product goes to the sender), let out, bring in, name, and the
 * heater and incubator. Anyone may do any of them.
 */
function applyBenchIntent(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined {
  const building: Building | undefined = isBuilding(intent.building)
    ? intent.building
    : undefined;
  if (!building) return `bad ${intent.kind}`;
  const animalId = intent.animal;
  const an = isIndex(animalId)
    ? g.animals.animals.find((a) => a.id === animalId)
    : undefined;
  if (intent.kind.startsWith("animal-")) {
    if (!an) return "No such animal.";
    if (SPECIES[an.species].building !== building)
      return "Not in this building.";
  }
  return asPlayer(g, by, () => {
    switch (intent.kind) {
      case "bench-feed": {
        const { fed, short } = feedAll(g, building);
        if (fed > 0) return undefined;
        return short > 0
          ? "Out of hay. The keeper sells hay."
          : "Everyone has eaten.";
      }
      case "bench-fill":
        return depositHay(g) > 0
          ? undefined
          : "No hay to tip in, or the silo is full.";
      case "bench-heater":
        if (hasHeater(g.animals, building))
          return pickUpHeater(g, building) ? undefined : "Your pack is full.";
        return placeHeater(g, building)
          ? undefined
          : (heaterProblem(g, building) ?? "No heater.");
      case "bench-egg": {
        const egg = Object.keys(HATCHES).find(
          (e) => incubatorProblem(g, e) === undefined,
        );
        return egg && putEgg(g, egg)
          ? undefined
          : (incubatorProblem(g, "egg") ?? "You have no egg to put in.");
      }
      case "animal-pet":
        return pet(g, an!.id) ? undefined : "Already petted today.";
      case "animal-take": {
        const r = collectAnimal(g, an!.id);
        return "problem" in r ? r.problem : undefined;
      }
      case "animal-out":
        return (
          letOutProblem(g, an!.id) ??
          (letOut(g, an!.id) ? undefined : "It cannot go out.")
        );
      case "animal-in":
        return bringIn(g, an!.id) ? undefined : "It is not outside.";
      default: {
        // animal-name
        const name = intent.name;
        if (typeof name !== "string" || name.length > 60) return "bad name";
        return rename(g, an!.id, name) ? undefined : "bad name";
      }
    }
  });
}
