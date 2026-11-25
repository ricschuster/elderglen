// Screen actions of group 5, "the rest" (note 108): the carpenter, the tailor, the smiths, the gallery and the
// shrine. Each runs the same core function single player uses, as the sending player. Whether the sender may use
// the screen at all (open, reach, the screen they opened) is judged by the host first (`GameRoomWorld`,
// `Screens`). Free of Phaser and the DOM.
import { buyReward, claimGoal } from "./slayerlist";
import { asPlayer } from "./asplayer";
import {
  BUILDINGS,
  type Building,
  buildingProblem,
  orderBuildingUpgrade,
  orderSilo,
  siloProblem,
  upgradeProblem,
} from "./animals";
import { BOMBS } from "./bombs";
import { clearOwner, mayChange, pondKey, setOwner } from "./buildrule";
import type { TailorKind } from "./clothes";
import { buyBoots, buyWeapon, FORGED } from "./combat";
import { buyDecor, decorProblem } from "./decor";
import { BOOTS } from "./equipment";
import { farmMapOf, farmTypeById } from "./farmtypes";
import { combineRings, unforgeRing } from "./forge";
import {
  buyCatalogue,
  buyFurniture,
  catalogueProblem,
  furnitureProblem,
} from "./furniture";
import { claimRewards, donate, placeOnShelf } from "./gallery";
import { crackGeode, GEODE_KINDS } from "./geodes";
import {
  houseOrderProblem,
  houseOrderUpgrade,
  orderRenovation,
  refundRenovation,
  renoOrderProblem,
  renoRefundProblem,
} from "./house";
import { LOCAL_PLAYER, type PlayerId } from "./players";
import {
  moveBuilding,
  moveProblem,
  orderBuildingAt,
  placementProblem,
  removeBuilding,
  removeProblem,
  type Placeable,
} from "./placement";
import { orderPond, pondOrderProblem, pondProblem } from "./pond";
import type { Intent } from "./protocol";
import { seeded } from "./rng";
import type { GameState } from "./save";
import { shrineAct } from "./shrine";
import { ORES } from "./ore";
import { buy, sell, sellAll } from "./shop";
import { handOverCopper, SMITH_STOCK } from "./smith";
import { buyPriceOn } from "./yeartwo";
import { meet } from "./townfolk";
import { villagerById } from "./villagers";
import {
  POT_COLOURS,
  dyePiece,
  sew,
  tailorBoots,
  tailoringLine,
  undye,
} from "./tailoring";
import {
  collectUpgrade,
  orderUpgrade,
  UPGRADABLE,
  type Upgradable,
} from "./upgrades";
import { BUILD_RULES, type BuildRule } from "./buildrule";
import {
  applyMailIntent,
  cabinFor,
  cabinReno,
  orderCabinUpgrade,
  setCabinStyle,
} from "./cabinhome";

import { applyHomePlace } from "./homeplace";

const isTile = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 4096;
const isId = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length < 80;

/** What a guest is told when they ask to upgrade a home and have no cabin of their own (note 108 rule 8, note 110). */
export const HOME_LINE =
  "A home is upgraded only by the one who lives in it, and you have no cabin.";

/** The intent kinds that need a screen open, and which screens serve them. */
export const REST_SCREEN_INTENTS: Record<string, string[]> = {
  "carp-house": ["carpenter"],
  "carp-reno": ["carpenter"],
  "carp-furniture": ["carpenter"],
  "carp-decor": ["carpenter"],
  "carp-catalogue": ["carpenter"],
  "carp-build": ["carpenter"],
  "carp-upgrade": ["carpenter"],
  "carp-silo": ["carpenter"],
  "carp-pond": ["carpenter"],
  "carp-move": ["carpenter"],
  "carp-remove": ["carpenter"],
  "carp-style": ["carpenter"],
  "mail-read": ["mailbox"],
  "tailor-sew": ["tailor"],
  "tailor-boots": ["tailor"],
  "tailor-dye": ["tailor"],
  "tailor-undye": ["tailor"],
  "smith-buy": ["smith", "smithy"],
  "smith-sell": ["smith", "smithy"],
  "smith-copper": ["smith"],
  "smith-ring": ["smith"],
  "smithy-crack": ["smithy"],
  "smithy-tool": ["smithy"],
  "smithy-collect": ["smithy"],
  "gallery-donate": ["gallery"],
  "gallery-place": ["gallery"],
  "gallery-claim": ["gallery"],
  "shrine-act": ["shrine"],
  "slayer-claim": ["walllist"],
  "slayer-buy": ["walllist"],
};

/** The screens a group 5 intent needs open. Ore is sold at both smiths, everything else at one. */
export function restScreenNeed(intent: Intent): string[] | undefined {
  const need = REST_SCREEN_INTENTS[intent.kind];
  if (intent.kind === "smith-buy" && intent.what !== "ore") return ["smith"];
  return need;
}

/** True when a group 5 intent's own target matches the screen the sender opened (the tailor's mode). */
export function restTargetsScreen(
  intent: Intent,
  open: { kind: string; stock?: string },
): boolean {
  if (open.kind !== "tailor") return true;
  return (
    open.stock ===
    (intent.kind === "tailor-dye" || intent.kind === "tailor-undye"
      ? "dye"
      : "sew")
  );
}

const building = (v: unknown): Building | undefined =>
  typeof v === "string" && v in BUILDINGS ? (v as Building) : undefined;

/** Apply a group 5 screen intent. `null` when the kind is not one of these. */
export function applyRestIntent(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined | null {
  switch (intent.kind) {
    case "build-rule": {
      if (by !== LOCAL_PLAYER) return "host only";
      const rule = intent.rule;
      if (!BUILD_RULES.includes(rule as BuildRule)) return "bad build-rule";
      g.buildRule = rule as BuildRule;
      return undefined;
    }
    case "carp-house":
    case "carp-reno":
    case "carp-furniture":
    case "carp-decor":
    case "carp-catalogue":
    case "carp-build":
    case "carp-upgrade":
    case "carp-silo":
    case "carp-pond":
    case "carp-move":
    case "carp-remove":
      return applyCarpenter(g, by, intent);
    case "carp-style":
      return setCabinStyle(g, by, intent.style);
    case "mail-read":
      return applyMailIntent(g, by, intent);
    case "tailor-sew":
    case "tailor-boots":
    case "tailor-dye":
    case "tailor-undye":
      return applyTailor(g, by, intent);
    case "meet": {
      // A talk or a gift to a villager, against the sender's own friendship (note 53). The guest's screen shows the line.
      const { id, held } = intent;
      if (typeof id !== "string" || !villagerById(id)) return "bad meet";
      if (held !== undefined && !isId(held)) return "bad meet";
      return asPlayer(g, by, () => {
        meet(g, id, held as string | undefined);
        return undefined;
      });
    }
    case "wardrobe-wear": {
      // Wear or store a hat, shirt or pants from the sender's own wardrobe (note 53). No id takes the piece off.
      const { piece: kind, id } = intent;
      if (!isTailorKind(kind) || (id !== undefined && !isId(id)))
        return "bad wardrobe-wear";
      return asPlayer(g, by, () => {
        const w = g.wardrobe;
        const ok =
          kind === "hat"
            ? w.wear(id as string | undefined)
            : w.wearPiece(kind, id as string | undefined);
        return ok ? undefined : "You do not have that.";
      });
    }
    case "smith-buy":
    case "smith-sell":
    case "smith-copper":
    case "smith-ring":
    case "smithy-crack":
    case "smithy-tool":
    case "smithy-collect":
      return applySmith(g, by, intent);
    case "gallery-donate":
    case "gallery-place":
    case "gallery-claim":
      return applyGallery(g, by, intent);
    case "shrine-act":
      return asPlayer(g, by, () => shrineAct(g, intent.diamond === true));
    case "slayer-claim":
      // Maren's wall list judges the sender's own kills and claims (note 109 rule 10).
      return isId(intent.goal)
        ? asPlayer(g, by, () => claimGoal(g, intent.goal as string))
        : "bad slayer-claim";
    case "slayer-buy":
      return isId(intent.item)
        ? asPlayer(g, by, () => buyReward(g, intent.item as string))
        : "bad slayer-buy";
    default:
      return applyHomePlace(g, by, intent);
  }
}

/**
 * The carpenter (rules 7 to 9). Anyone orders with their own money and materials and a new building records its
 * orderer. A home is upgraded only by its occupant, which is the host's farmhouse today, since cabins have no
 * tiers. Moving and taking down follow the host's setting.
 */
function applyCarpenter(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined {
  const farmId = farmTypeById(g.farmType).map;
  return asPlayer(g, by, () => {
    switch (intent.kind) {
      case "carp-house": {
        if (by !== LOCAL_PLAYER) {
          // A cabin's tiers are the occupant's own order, from their wallet and pack (note 110 step 5).
          const c = cabinFor(g, by);
          return c ? orderCabinUpgrade(g, c, by) : HOME_LINE;
        }
        const why = houseOrderProblem(g);
        if (why !== undefined) return why;
        return houseOrderUpgrade(g)
          ? undefined
          : "The carpenter cannot do that.";
      }
      case "carp-reno": {
        if (!isId(intent.id)) return "bad carp-reno";
        if (by !== LOCAL_PLAYER) {
          const c = cabinFor(g, by);
          return c
            ? cabinReno(g, c, by, intent.id, intent.refund === true)
            : HOME_LINE;
        }
        if (intent.refund === true) {
          const why = renoRefundProblem(g, intent.id);
          if (why !== undefined) return why;
          return refundRenovation(g, intent.id) ? undefined : "Not now.";
        }
        const why = renoOrderProblem(g, intent.id);
        if (why !== undefined) return why;
        return orderRenovation(g, intent.id) ? undefined : "Not now.";
      }
      case "carp-furniture": {
        if (!isId(intent.id)) return "bad carp-furniture";
        if (homeBuild(g, by)) return "The carpenter is busy with your house.";
        const why = furnitureProblem(g, intent.id);
        if (why !== undefined) return why;
        return buyFurniture(g, intent.id) ? undefined : "You cannot buy that.";
      }
      case "carp-decor": {
        if (!isId(intent.id)) return "bad carp-decor";
        if (homeBuild(g, by)) return "The carpenter is busy with your house.";
        const why = decorProblem(g, intent.id);
        if (why !== undefined) return why;
        return buyDecor(g, intent.id) ? undefined : "You cannot buy that.";
      }
      case "carp-catalogue": {
        if (homeBuild(g, by)) return "The carpenter is busy with your house.";
        const why = catalogueProblem(g);
        if (why !== undefined) return why;
        return buyCatalogue(g) ? undefined : "You cannot buy that.";
      }
      case "carp-build": {
        const b = building(intent.building);
        const { x, y } = intent;
        if (!b || !isTile(x) || !isTile(y)) return "bad carp-build";
        const why =
          buildingProblem(g, b) ??
          placementProblem(g, farmMapOf(g), farmId, b, x, y);
        if (why !== undefined) return why;
        if (!orderBuildingAt(g, farmMapOf(g), farmId, b, x, y))
          return "The carpenter cannot build there.";
        setOwner(g, b, by);
        return undefined;
      }
      case "carp-upgrade": {
        const b = building(intent.building);
        if (!b) return "bad carp-upgrade";
        const why = upgradeProblem(g, b);
        if (why !== undefined) return why;
        return orderBuildingUpgrade(g, b) ? undefined : "Not now.";
      }
      case "carp-silo": {
        const why = siloProblem(g);
        if (why !== undefined) return why;
        if (!orderSilo(g)) return "Not now.";
        setOwner(g, "silo", by);
        return undefined;
      }
      case "carp-pond": {
        const { x, y } = intent;
        if (!isTile(x) || !isTile(y)) return "bad carp-pond";
        const why =
          pondOrderProblem(g) ?? pondProblem(g, farmMapOf(g), farmId, x, y);
        if (why !== undefined) return why;
        const r = orderPond(g, farmMapOf(g), farmId, x, y);
        if (!r.ok) return r.reason ?? "The carpenter cannot dig there.";
        setOwner(g, pondKey(x, y), by);
        return undefined;
      }
      case "carp-move": {
        const key = intent.building;
        const { x, y } = intent;
        if (
          typeof key !== "string" ||
          !(key === "greenhouse" || key in BUILDINGS) ||
          !isTile(x) ||
          !isTile(y)
        )
          return "bad carp-move";
        const b = key as Placeable;
        const no = mayChange(g, by, b);
        if (no !== undefined) return no;
        const why =
          moveProblem(g, b) ??
          placementProblem(g, farmMapOf(g), farmId, b, x, y);
        if (why !== undefined) return why;
        return moveBuilding(g, farmMapOf(g), farmId, b, x, y)
          ? undefined
          : "It will not go there.";
      }
      default: {
        // carp-remove
        const b = building(intent.building);
        if (!b) return "bad carp-remove";
        const no = mayChange(g, by, b);
        if (no !== undefined) return no;
        const why = removeProblem(g, b);
        if (why !== undefined) return why;
        if (!removeBuilding(g, b)) return "Not now.";
        clearOwner(g, b);
        return undefined;
      }
    }
  });
}

/** The upgrade under way in the home a player lives in: the farmhouse's for the host, their cabin's for a guest. */
function homeBuild(g: GameState, by: PlayerId): unknown {
  return by === LOCAL_PLAYER ? g.houseBuild : cabinFor(g, by)?.build;
}

const isTailorKind = (v: unknown): v is TailorKind =>
  v === "hat" || v === "shirt" || v === "pants";

/** The sewing machine and the dye pots (note 96). Goods leave the sender's pack; pieces go to the sender's own wardrobe (note 53). */
function applyTailor(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined {
  return asPlayer(g, by, () => {
    const closed = tailoringLine(g);
    if (closed) return closed;
    switch (intent.kind) {
      case "tailor-sew": {
        if (!isId(intent.item)) return "bad tailor-sew";
        const r = sew(g, intent.item);
        return r.ok ? undefined : r.reason;
      }
      case "tailor-boots": {
        if (!isId(intent.feed) || !isId(intent.spool))
          return "bad tailor-boots";
        const r = tailorBoots(g, intent.feed, intent.spool);
        return r.ok ? undefined : r.reason;
      }
      case "tailor-dye": {
        const { piece: kind, id, pots, tint } = intent;
        const t = tint as { h?: unknown; s?: unknown; v?: unknown } | undefined;
        if (
          !isTailorKind(kind) ||
          !isId(id) ||
          !Array.isArray(pots) ||
          pots.length !== POT_COLOURS.length ||
          !pots.every(isId) ||
          !t ||
          typeof t.h !== "number" ||
          typeof t.s !== "number" ||
          typeof t.v !== "number" ||
          ![t.h, t.s, t.v].every(Number.isFinite)
        )
          return "bad tailor-dye";
        return dyePiece(g, kind, id, pots as string[], {
          h: t.h,
          s: t.s,
          v: t.v,
        });
      }
      default: {
        // tailor-undye
        const { piece: kind, id } = intent;
        if (!isTailorKind(kind) || !isId(id)) return "bad tailor-undye";
        return undye(g, kind, id) ? undefined : "It is not dyed.";
      }
    }
  });
}

/**
 * The smith dwarf and the Hearthwell smithy (notes 22, 44, 74, 77). Everything is bought and sold from the sender's
 * pack and purse; a tool left at the smithy is the sender's own, kept apart from every other player's.
 */
function applySmith(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined {
  return asPlayer(g, by, () => {
    switch (intent.kind) {
      case "smith-buy": {
        const { what, id } = intent;
        if (!isId(id)) return "bad smith-buy";
        if (what === "ore") {
          const n = intent.n;
          if (!SMITH_STOCK.includes(id) || (n !== 1 && n !== 5))
            return "She does not sell that.";
          const price = buyPriceOn(id, g.day.clock.day);
          if (buy(g.inventory, g, id, n, price)) return undefined;
          return g.money < (price ?? 0) * n
            ? "Not enough money."
            : "Your backpack is full.";
        }
        if (what === "weapon")
          return FORGED.some((w) => w.id === id)
            ? buyWeapon(g, id)
            : "She does not sell that.";
        if (what === "boots")
          return BOOTS.some((b) => b.id === id)
            ? buyBoots(g, id)
            : "She does not sell that.";
        if (what === "bomb")
          return BOMBS.some((b) => b.id === id)
            ? buy(g.inventory, g, id)
              ? undefined
              : "You cannot afford it, or your pack is full."
            : "She does not sell that.";
        return "bad smith-buy";
      }
      case "smith-sell": {
        const id = intent.id;
        if (!isId(id) || !ORES.some((o) => o.id === id))
          return "bad smith-sell";
        const gold =
          intent.all === true
            ? sellAll(g.inventory, g, id)
            : sell(g.inventory, g, id, 1);
        return gold > 0 ? undefined : "You have none to sell.";
      }
      case "smith-copper":
        return handOverCopper(g) ? undefined : "You have no copper ore.";
      case "smith-ring": {
        if (intent.op === "combine") {
          if (!isId(intent.a) || !isId(intent.b)) return "bad smith-ring";
          const r = combineRings(g.inventory, intent.a, intent.b);
          return r.ok ? undefined : r.reason;
        }
        if (intent.op === "split") {
          if (!isId(intent.id)) return "bad smith-ring";
          const r = unforgeRing(g.inventory, intent.id);
          return r.ok ? undefined : r.reason;
        }
        return "bad smith-ring";
      }
      case "smithy-crack": {
        const kind = intent.geode;
        if (typeof kind !== "string" || !GEODE_KINDS.includes(kind))
          return "bad smithy-crack";
        // What a geode holds is drawn from the day and the pack, so every copy of the farm agrees.
        const seed =
          g.day.clock.day * 7919 + g.inventory.count(kind) * 131 + g.money;
        const r = crackGeode(g, seeded(seed), kind);
        return r.ok
          ? undefined
          : r.reason === "backpack full"
            ? "Your backpack is full."
            : r.reason === "not enough money"
              ? "Not enough money."
              : "You have none.";
      }
      case "smithy-tool": {
        const tool = intent.tool;
        if (!(UPGRADABLE as readonly unknown[]).includes(tool))
          return "bad smithy-tool";
        return orderUpgrade(g, tool as Upgradable);
      }
      default:
        // smithy-collect
        return collectUpgrade(g) ? undefined : "Nothing to collect.";
    }
  });
}

/** The gallery counter: the shelf is the farm's; a donation leaves the sender's pack and each player collects their own rewards (note 53). */
function applyGallery(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined {
  return asPlayer(g, by, () => {
    switch (intent.kind) {
      case "gallery-donate": {
        if (!isId(intent.item)) return "bad gallery-donate";
        const r = donate(g, intent.item);
        return r.ok ? undefined : r.reason;
      }
      case "gallery-place": {
        const { item, slot } = intent;
        if (!isId(item) || typeof slot !== "number") return "bad gallery-place";
        return placeOnShelf(g, item, slot).ok
          ? undefined
          : "It will not go there.";
      }
      default: {
        // gallery-claim: held rewards wait (a full pack), nothing waiting is a refusal
        const { paid } = claimRewards(g);
        return paid.length > 0
          ? undefined
          : "No reward waits for you yet, or your pack is full.";
      }
    }
  });
}
