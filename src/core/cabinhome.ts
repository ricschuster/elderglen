// A cabin occupant's carpenter orders and mailbox (note 110 steps 3 and 5, note 108 rule 8): the house tier,
// the renovations, the outside style and the letters of the one who lives there. The occupant pays from their
// own wallet and pack. Free of Phaser and the DOM.
import { asPlayer } from "./asplayer";
import { farmTypeById } from "./farmtypes";
import { festivalDayToday } from "./festivals";
import { HARDWOOD } from "./items";
import {
  BUILD_DAYS,
  houseOrderProblem,
  nextUpgrade,
  renoOrderProblem,
  renoRefundProblem,
  orderRenovation,
  refundRenovation,
  WOOD,
} from "./house";
import { cabinOf, cabinMailboxTile, restyleCabin, type Cabin } from "./cabins";
import { homeMapId } from "./homes";
import { LOCAL_PLAYER, type PlayerId } from "./players";
import { openLetter } from "./mail";
import type { GameState } from "./save";

/** What a guest is told when they have no cabin to renovate. */
export const NO_CABIN_LINE = "You have no cabin.";

/** The cabin of a guest, or undefined (the host's own home is the farmhouse, handled by the older rules). */
export function cabinFor(g: GameState, by: PlayerId): Cabin | undefined {
  return by === LOCAL_PLAYER || !g.cabins ? undefined : cabinOf(g.cabins, by);
}

/** The fields the renovation rules read and write, over a cabin and its occupant's wallet. */
function stateOf(g: GameState, c: Cabin, by: PlayerId) {
  return {
    get houseTier() {
      return c.tier;
    },
    set houseTier(v: number) {
      c.tier = v;
    },
    get houseRenos() {
      return c.renos;
    },
    set houseRenos(v: string[]) {
      c.renos = v;
    },
    get houseBuild() {
      return c.build;
    },
    set houseBuild(v: Cabin["build"]) {
      c.build = v;
    },
    get money() {
      return g.players.wallet(by).money;
    },
    set money(v: number) {
      g.players.wallet(by).money = v;
    },
    furniture: g.furniture,
    chests: g.chests,
  };
}

/** Why the next tier cannot be ordered for a cabin now, in words, or undefined if it can. */
export function cabinUpgradeProblem(
  g: GameState,
  c: Cabin,
  by: PlayerId,
): string | undefined {
  if (c.build) return "The carpenter is already at work on the house.";
  const cost = nextUpgrade(c.tier);
  if (!cost) return "There is no further upgrade yet.";
  const money = g.players.balance(by);
  const inv = g.players.get(by).inventory;
  const missing: string[] = [];
  if (money < cost.coin) missing.push(`${cost.coin - money}g more`);
  if (cost.wood > 0 && inv.count(WOOD) < cost.wood)
    missing.push(`${cost.wood - inv.count(WOOD)} more wood`);
  if (cost.hardwood > 0 && inv.count(HARDWOOD) < cost.hardwood)
    missing.push(`${cost.hardwood - inv.count(HARDWOOD)} more hardwood`);
  return missing.length > 0 ? `You need ${missing.join(" and ")}.` : undefined;
}

/** Pay for the next tier of a cabin from the occupant's wallet and pack and start the build. */
export function orderCabinUpgrade(
  g: GameState,
  c: Cabin,
  by: PlayerId,
): string | undefined {
  const why = cabinUpgradeProblem(g, c, by);
  if (why !== undefined) return why;
  const cost = nextUpgrade(c.tier)!;
  g.players.wallet(by).money -= cost.coin;
  const inv = g.players.get(by).inventory;
  if (cost.wood > 0) inv.remove(WOOD, cost.wood);
  if (cost.hardwood > 0) inv.remove(HARDWOOD, cost.hardwood);
  c.build = { tier: c.tier + 1, daysLeft: BUILD_DAYS };
  return undefined;
}

/** Why a renovation cannot be ordered or taken back in a cabin, or undefined if it can. */
export function cabinRenoProblem(
  g: GameState,
  c: Cabin,
  by: PlayerId,
  id: string,
  refund: boolean,
): string | undefined {
  const s = stateOf(g, c, by);
  return refund
    ? renoRefundProblem(s, id, homeMapId(c.ownerKey ?? ""))
    : renoOrderProblem(s, id);
}

/** Order or take back a renovation in a cabin (done at once, as in the farmhouse). */
export function cabinReno(
  g: GameState,
  c: Cabin,
  by: PlayerId,
  id: string,
  refund: boolean,
): string | undefined {
  const why = cabinRenoProblem(g, c, by, id, refund);
  if (why !== undefined) return why;
  const s = stateOf(g, c, by);
  const ok = refund
    ? refundRenovation(s, id, homeMapId(c.ownerKey ?? ""))
    : orderRenovation(s, id);
  return ok ? undefined : "Not now.";
}

/** Change a cabin's outside look (free, the occupant's alone). */
export function setCabinStyle(
  g: GameState,
  by: PlayerId,
  style: unknown,
): string | undefined {
  if (!g.cabins) return NO_CABIN_LINE;
  const r = restyleCabin(g.cabins, by, style);
  if (!r.ok) return r.reason;
  g.cabins = r.book;
  return undefined;
}

/**
 * One morning of every cabin's build, after the clock has moved to the new day. A festival morning does not
 * count (the carpenter's rule), and a night counts only when the occupant slept on the farm, so `counts` says
 * so for each occupant (note 108 rule 8). Returns the cabins whose rooms opened this morning.
 */
export function advanceCabinBuilds(
  g: GameState,
  counts: (owner: PlayerId) => boolean,
): Cabin[] {
  const done: Cabin[] = [];
  if (!g.cabins || festivalDayToday(g.day.clock.day)) return done;
  for (const c of g.cabins.cabins) {
    if (!c.build || c.ownerKey === null || !counts(c.ownerKey)) continue;
    c.build.daysLeft -= 1;
    if (c.build.daysLeft > 0) continue;
    c.tier = c.build.tier;
    c.build = undefined;
    done.push(c);
  }
  return done;
}

/**
 * Whose mailbox stands on a farm tile: a cabin's (beside its door) belongs to its occupant, the farm's own mailbox
 * to the host (note 110 rule 3). Undefined where there is none.
 */
export function mailboxOwnerAt(
  g: GameState,
  map: string,
  x: number,
  y: number,
): PlayerId | undefined {
  if (map !== "farm" && map !== farmTypeById(g.farmType).map) return undefined;
  for (const c of g.cabins?.cabins ?? []) {
    const m = cabinMailboxTile(c);
    if (c.ownerKey !== null && m.x === x && m.y === y) return c.ownerKey;
  }
  return undefined;
}

/** The mailbox intents: read a delivered letter and take its gift, from the sender's own mailbox. */
export function applyMailIntent(
  g: GameState,
  by: PlayerId,
  intent: { kind: string; id?: unknown },
): string | undefined | null {
  if (intent.kind !== "mail-read") return null;
  const id = intent.id;
  if (typeof id !== "string" || id.length === 0 || id.length > 80)
    return "bad mail-read";
  if (!g.players.get(by).mail.entry(id)) return "There is no such letter.";
  return asPlayer(g, by, () => {
    const r = openLetter(g, id);
    return r.ok ? undefined : r.reason;
  });
}

/** The home a player orders from at the carpenter, as the screen reads it. */
export interface HomeView {
  tier: number;
  renos: string[];
  build: { tier: number; daysLeft: number } | undefined;
  /** Why the next tier cannot be ordered now, or undefined if it can. */
  upgradeProblem(): string | undefined;
  /** Why a renovation cannot be ordered (or taken back), or undefined if it can. */
  renoProblem(id: string, refund: boolean): string | undefined;
  /** The player's own cabin, when they have one (the host's farmhouse has none). */
  cabin: Cabin | undefined;
}

/** The home the local player's carpenter screen shows: their cabin for a guest who has one, else the farmhouse. */
export function homeViewOf(g: GameState): HomeView {
  const by = g.players.localId;
  const c = cabinFor(g, by);
  if (!c)
    return {
      tier: g.houseTier,
      renos: g.houseRenos,
      build: g.houseBuild,
      upgradeProblem: () => houseOrderProblem(g),
      renoProblem: (id, refund) =>
        refund ? renoRefundProblem(g, id) : renoOrderProblem(g, id),
      cabin: undefined,
    };
  return {
    tier: c.tier,
    renos: c.renos,
    build: c.build,
    upgradeProblem: () => cabinUpgradeProblem(g, c, by),
    renoProblem: (id, refund) => cabinRenoProblem(g, c, by, id, refund),
    cabin: c,
  };
}
