import pondData from "../content/pond.json";
import { isClear, type Outcome } from "./actions";
import { festivalDayToday } from "./festivals";
import { isFarmMap } from "./farmtypes";
import type { FarmMap } from "./map";
import { FARM_STORE } from "./mapstore";
import { mayPlaceOn, placeTag } from "./placeables";
import { placedFootprint } from "./placement";
import { FISH_POND, POND_FOOTPRINT } from "./pondsite";

export { FISH_POND, POND_FOOTPRINT };
import type { PlacedItem } from "./placedstore";
import { QUALITIES, splitQuality, withQuality } from "./quality";
import type { GameState } from "./save";
import { SILO_FOOTPRINT, SILO_SITES } from "./animals";
import { itemById } from "./items";
import { roeOf, speciesById, type PondSpecies } from "./pondspecies";
import { isWaterFind } from "./waterfinds";

/**
 * The fish pond (`docs/design/93_fish_pond_and_water_finds.md`), after
 * Stardew's pond with its own names. A farm building the carpenter makes, 5 by
 * 5, held in the generic placed store under the farm: the placed item sits on
 * the top left tile and its `state` is the pond. One species per pond. The
 * population breeds to a cap that capacity quests raise (3, 5, 7, 10), and each
 * night an item may be made with chance `population x 0.08 + 0.15`, roe mostly.
 * Content is `src/content/pond.json`; numbers not from the saved Fish Pond page
 * are placeholders. Pure rules, no Phaser.
 */
export const POND_COST = {
  coin: pondData.build.coin,
  stone: pondData.build.stone,
  seaweed: pondData.build.seaweed,
  pondweed: pondData.build.pondweed,
} as const;
export const POND_BUILD_DAYS = pondData.build.days;
export const POND_CAPS = pondData.caps;
export const LEGEND_CAP = pondData.legendCap;

/** One extra good a species may give at a minimum population. */
export interface PondGood {
  item: string;
  minPop: number;
}

/** Per-species rows in `pond.json`: only what differs from the defaults. */
interface SpeciesRow {
  spawnDays?: number;
  goods?: PondGood[];
  /** False for a species that makes no roe. */
  roe?: boolean;
  /**
   * A gift for finishing a capacity quest (Stardew's quest rewards). Algae soup is meant
   * for the slime-like fish (Stardew: Slimejack, 1 Algae Soup or 5 Wild Bait at 5 fish).
   * Our species table is empty, so no row uses it yet.
   */
  reward?: { item: string; count: number };
}

/** A safety stop on the extra roe repeat (the chance makes more than 6 a rarity). */
const MAX_ROE = 20;

const SPECIES_ROWS = pondData.species as Record<string, SpeciesRow>;

const fail = (reason: string): Outcome => ({ ok: false, reason });

export interface PondQuest {
  item: string;
  need: number;
  given: number;
}

/** What a pond keeps in `state`. */
export interface PondState {
  /** Days of carpenter work left. 0 once built. */
  building: number;
  species?: string;
  count: number;
  /** Index into `POND_CAPS`. */
  capLevel: number;
  /** Nights until the next fish hatches. Absent when none is due (empty or at the cap). */
  spawn?: number;
  /** Nights until the quest shows. Counts only while the pond is at its cap. */
  questWait?: number;
  quest?: PondQuest;
  /** A product waiting to be taken. */
  out?: { item: string; count: number };
}

export function stateOf(p: PlacedItem): PondState {
  const s = p.state ?? {};
  const int = (v: unknown, d: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : d;
  const sp = typeof s.species === "string" && speciesById(s.species);
  const q = s.quest as Partial<PondQuest> | undefined;
  const o = s.out as { item?: unknown; count?: unknown } | undefined;
  return {
    building: int(s.building, 0),
    ...(sp ? { species: s.species as string } : {}),
    count: sp ? int(s.count, 0) : 0,
    capLevel: Math.min(int(s.capLevel, 0), POND_CAPS.length - 1),
    ...(s.spawn !== undefined ? { spawn: int(s.spawn, 1) } : {}),
    ...(s.questWait !== undefined ? { questWait: int(s.questWait, 1) } : {}),
    ...(q && typeof q.item === "string" && itemById(q.item)
      ? {
          quest: { item: q.item, need: int(q.need, 1), given: int(q.given, 0) },
        }
      : {}),
    ...(o && typeof o.item === "string" && itemById(o.item)
      ? { out: { item: o.item, count: Math.max(1, int(o.count, 1)) } }
      : {}),
  };
}

function setState(p: PlacedItem, s: PondState): void {
  p.state = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
}

/** Every pond on the farm, built or building. */
export function pondsOf(g: GameState): PlacedItem[] {
  return [...g.placed.each(FARM_STORE)].filter((p) => p.id === FISH_POND);
}

export function pondAt(
  g: GameState,
  x: number,
  y: number,
): PlacedItem | undefined {
  const p = g.placed.get(FARM_STORE, x, y);
  return p?.id === FISH_POND ? p : undefined;
}

/** The pond whose footprint covers a tile, built or not. */
export function pondCovering(
  g: GameState,
  x: number,
  y: number,
): PlacedItem | undefined {
  return pondsOf(g).find(
    (p) =>
      x >= p.x &&
      x < p.x + POND_FOOTPRINT.w &&
      y >= p.y &&
      y < p.y + POND_FOOTPRINT.h,
  );
}

/** True if a tile is part of a pond's footprint on this map. The whole of it blocks walking. */
export function pondBlocks(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): boolean {
  return isFarmMap(mapId) && pondCovering(g, x, y) !== undefined;
}

/** The days a species takes to breed one fish: 1 to 5, dearer fish slower. */
export function spawnDaysOf(species: PondSpecies): number {
  const row = SPECIES_ROWS[species.id];
  if (row?.spawnDays !== undefined) return row.spawnDays;
  const t = pondData.spawnDays.find((r) => species.sellPrice <= r.maxPrice);
  return t?.days ?? 5;
}

/** The most fish a pond holds now: a legend one, else the step its quests reached. */
export function capOf(s: PondState): number {
  const sp = speciesById(s.species);
  return sp?.legend ? LEGEND_CAP : POND_CAPS[s.capLevel]!;
}

/** True when a species may go in a pond: a fish, shellfish, urchin or coral, never a water find. */
export function pondable(id: string): boolean {
  return !isWaterFind(id) && speciesById(id) !== undefined;
}

const rectsOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Why the carpenter cannot start a pond now: another job under way. */
function pondBusy(g: GameState): string | undefined {
  if (g.animals.build)
    return `The carpenter is busy with your ${g.animals.build.building}.`;
  if (g.animals.siloDays > 0) return "The carpenter is busy with your silo.";
  if (g.houseBuild) return "The carpenter is busy with your house.";
  return undefined;
}

/** What the buyer still lacks of the pond's price, in words, or undefined. */
function pondCostProblem(g: GameState): string | undefined {
  const missing: string[] = [];
  if (g.money < POND_COST.coin)
    missing.push(`${POND_COST.coin - g.money}g more`);
  for (const id of ["stone", "seaweed", "pondweed"] as const) {
    const have = g.inventory.count(id);
    if (have < POND_COST[id])
      missing.push(
        `${POND_COST[id] - have} more ${itemById(id)?.name.toLowerCase() ?? id}`,
      );
  }
  return missing.length > 0 ? `You need ${missing.join(" and ")}.` : undefined;
}

/** The carpenter's menu line: why a pond cannot be ordered now (no spot yet), or undefined. */
export function pondOrderProblem(g: GameState): string | undefined {
  return pondBusy(g) ?? pondCostProblem(g);
}

/** The price in words, for the carpenter's menu line. */
export function pondCostLine(): string {
  const name = (id: string) => itemById(id)?.name.toLowerCase() ?? id;
  return `${POND_COST.coin}g, ${POND_COST.stone} ${name("stone")}, ${POND_COST.seaweed} ${name("seaweed")} and ${POND_COST.pondweed} ${name("pondweed")}, ${POND_BUILD_DAYS} days`;
}

/** One tile that stops a pond standing where the player pointed, and why (the placing screen paints these red). */
export function pondBlockers(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
): { x: number; y: number; why: string }[] {
  const out: { x: number; y: number; why: string }[] = [];
  const fixed = [
    ...(["coop", "barn", "stable", "greenhouse"] as const).flatMap((b) => {
      const r = placedFootprint(g, b, mapId);
      return r ? [r] : [];
    }),
    ...(SILO_SITES[mapId]
      ? [{ ...SILO_SITES[mapId]!, w: SILO_FOOTPRINT.w, h: SILO_FOOTPRINT.h }]
      : []),
  ];
  for (let ty = y; ty < y + POND_FOOTPRINT.h; ty++)
    for (let tx = x; tx < x + POND_FOOTPRINT.w; tx++) {
      const cell = { x: tx, y: ty, w: 1, h: 1 };
      let why: string | undefined;
      if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height)
        why = "that is off the farm";
      else if (fixed.some((r) => rectsOverlap(r, cell))) why = "a building";
      else if (
        pondsOf(g).some((p) =>
          rectsOverlap({ x: p.x, y: p.y, ...POND_FOOTPRINT }, cell),
        )
      )
        why = "another pond";
      else if (!isClear(g, map, tx, ty)) why = "the ground is not clear";
      if (why) out.push({ x: tx, y: ty, why });
    }
  return out;
}

/** Why the carpenter cannot build a pond with its top left here, or undefined. */
export function pondProblem(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
): string | undefined {
  if (!mayPlaceOn(FISH_POND, placeTag(map, mapId)))
    return "A pond can only be built on the farm.";
  const busy = pondBusy(g);
  if (busy !== undefined) return busy;
  const here = { x, y, w: POND_FOOTPRINT.w, h: POND_FOOTPRINT.h };
  const fixed = [
    ...(["coop", "barn", "stable", "greenhouse"] as const).flatMap((b) => {
      const r = placedFootprint(g, b, mapId);
      return r ? [r] : [];
    }),
    ...(SILO_SITES[mapId]
      ? [{ ...SILO_SITES[mapId]!, w: SILO_FOOTPRINT.w, h: SILO_FOOTPRINT.h }]
      : []),
  ];
  if (fixed.some((r) => rectsOverlap(r, here)))
    return "That spot is taken by a building.";
  for (const p of pondsOf(g))
    if (rectsOverlap({ x: p.x, y: p.y, ...POND_FOOTPRINT }, here))
      return "That spot is taken by another pond.";
  for (let ty = y; ty < y + here.h; ty++)
    for (let tx = x; tx < x + here.w; tx++)
      if (!isClear(g, map, tx, ty) && !pondCovering(g, tx, ty))
        return "The ground there is not clear.";
  return pondCostProblem(g);
}

/** Pay for a pond and start the job. The placed item stands from today, the water waits two days. */
export function orderPond(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
): Outcome {
  const why = pondProblem(g, map, mapId, x, y);
  if (why !== undefined) return fail(why);
  const placed: PlacedItem = { x, y, id: FISH_POND };
  setState(placed, { building: POND_BUILD_DAYS, count: 0, capLevel: 0 });
  if (!g.placed.add(FARM_STORE, placed)) return fail("cannot place here");
  g.money -= POND_COST.coin;
  for (const id of ["stone", "seaweed", "pondweed"] as const)
    g.inventory.remove(id, POND_COST[id]);
  return { ok: true };
}

/** One morning of the carpenter's pond jobs. A festival day does not count. Returns ponds opened today. */
export function advancePonds(g: GameState): number {
  if (festivalDayToday(g.day.clock.day)) return 0;
  let opened = 0;
  for (const p of pondsOf(g)) {
    const s = stateOf(p);
    if (s.building <= 0) continue;
    s.building -= 1;
    if (s.building === 0) opened += 1;
    setState(p, s);
  }
  return opened;
}

/** Whether a pond is built and ready for fish. */
export function pondOpen(p: PlacedItem): boolean {
  return stateOf(p).building === 0;
}

/** The first quality of a base item the pack holds, lowest first (the pond takes any quality). */
function heldId(g: GameState, base: string): string | undefined {
  return QUALITIES.map((q) => withQuality(base, q)).find(
    (id) => g.inventory.count(id) > 0,
  );
}

/** Why this item cannot go in this pond, or undefined. */
export function putProblem(
  g: GameState,
  x: number,
  y: number,
  item: string,
): string | undefined {
  const p = pondAt(g, x, y);
  if (!p) return "There is no pond here.";
  const s = stateOf(p);
  if (s.building > 0) return "The pond is not finished yet.";
  const base = splitQuality(item).base;
  if (!pondable(base)) return "That cannot live in a pond.";
  if (s.species !== undefined && s.count > 0 && s.species !== base)
    return "The pond already holds another kind.";
  if (heldId(g, base) === undefined) return "You do not have one.";
  if (s.count >= capOf({ ...s, species: base }))
    return "The pond is full. Fish are not wanted until the pond has room.";
  return undefined;
}

/**
 * Put one fish in. Any quality. The first sets the species and starts the
 * breeding clock; more up to the cap do not reset it.
 */
export function putFish(
  g: GameState,
  x: number,
  y: number,
  item: string,
): Outcome {
  const why = putProblem(g, x, y, item);
  if (why !== undefined) return fail(why);
  const p = pondAt(g, x, y)!;
  const base = splitQuality(item).base;
  const s = stateOf(p);
  g.inventory.remove(heldId(g, base)!, 1);
  s.species = base;
  s.count += 1;
  startClocks(s);
  setState(p, s);
  return { ok: true, item: base };
}

/** Start the breeding clock when fish are in and there is room, and the quest wait at a full pond. */
function startClocks(s: PondState): void {
  const sp = speciesById(s.species);
  if (!sp || s.count === 0) return;
  const cap = capOf(s);
  if (s.count < cap && !sp.legend) {
    s.spawn ??= spawnDaysOf(sp);
  } else if (s.count >= cap) {
    delete s.spawn;
  }
}

/**
 * Take one fish out with the rod: no bar, no bait, no tackle wear, always
 * normal quality, no XP, never a fish log entry. Emptying the pond resets it,
 * the capacity from quests too.
 */
export function takeFish(g: GameState, x: number, y: number): Outcome {
  const p = pondAt(g, x, y);
  if (!p) return fail("There is no pond here.");
  const s = stateOf(p);
  if (s.building > 0 || s.count === 0 || s.species === undefined)
    return fail("There is no fish to take.");
  if (g.inventory.room(s.species) < 1) return fail("backpack full");
  g.inventory.add(s.species);
  s.count -= 1;
  if (s.count === 0) {
    // An emptied pond starts over; a waiting product stays.
    const out = s.out;
    const fresh: PondState = {
      building: 0,
      count: 0,
      capLevel: 0,
      ...(out ? { out } : {}),
    };
    setState(p, fresh);
    return { ok: true, item: s.species };
  }
  // Removing fish pauses the quest and the quest item stays; the clock runs again below the cap.
  startClocks(s);
  setState(p, s);
  return { ok: true, item: s.species };
}

/** Pick the item a quest asks for: by the fish's water, and a made good or gem for the top quest. */
export function questItemFor(
  species: PondSpecies,
  capLevel: number,
  random: () => number,
): string {
  const q = pondData.questItems;
  const top = capLevel >= POND_CAPS.length - 2;
  const list = top ? q.top : species.group === "sea" ? q.sea : q.fresh;
  if (list.length === 0) return q.fallback;
  const id =
    list[Math.min(Math.floor(random() * list.length), list.length - 1)]!;
  return itemById(id) ? id : q.fallback;
}

/** Pick the product of a night, or undefined. Roe mostly, extra goods by population. */
export function rollProduct(
  species: PondSpecies,
  count: number,
  random: () => number,
): { item: string; count: number } | undefined {
  const c = pondData.productChance;
  const chance = species.legend ? c.legend : count * c.perFish + c.base;
  if (count <= 0 || random() >= chance) return undefined;
  const row = SPECIES_ROWS[species.id];
  const goods = (row?.goods ?? []).filter((g) => g.minPop <= count);
  const roe = row?.roe !== false;
  const total = (roe ? pondData.roeWeight : 0) + goods.length;
  if (total === 0) return undefined;
  let pick = random() * total;
  if (roe) {
    pick -= pondData.roeWeight;
    if (pick < 0) {
      // One roe, and another 20 percent of the time again and again.
      let n = 1;
      while (n < MAX_ROE && random() < pondData.extraRoe) n += 1;
      return { item: roeOf(species.id), count: n };
    }
  }
  const good = goods[Math.min(Math.floor(pick), goods.length - 1)]!;
  return { item: good.item, count: 1 };
}

/**
 * One night for every built pond: the product roll, then breeding, then the
 * quest timer. A quest ticks only while the pond sits at its cap.
 */
export function pondNight(g: GameState, random: () => number): void {
  for (const p of pondsOf(g)) {
    const s = stateOf(p);
    const sp = speciesById(s.species);
    if (s.building > 0 || !sp || s.count === 0) continue;
    const made = rollProduct(sp, s.count, random);
    if (made) {
      if (!s.out) s.out = made;
      else if (s.out.item === made.item) s.out.count += made.count;
    }
    const cap = capOf(s);
    if (s.count < cap && !sp.legend) {
      s.spawn = (s.spawn ?? spawnDaysOf(sp)) - 1;
      if (s.spawn <= 0) {
        s.count += 1;
        if (s.count < cap) s.spawn = spawnDaysOf(sp);
        else delete s.spawn;
      }
    }
    // A full pond with a step to climb sets the quest wait; it runs only at the cap.
    if (s.count >= cap && !sp.legend && s.capLevel < POND_CAPS.length - 1) {
      if (!s.quest) {
        if (s.questWait === undefined) {
          const [lo, hi] = pondData.questDelay as [number, number];
          s.questWait = lo + Math.floor(random() * (hi - lo + 1));
        } else {
          s.questWait -= 1;
        }
        if (s.questWait <= 0) {
          delete s.questWait;
          s.quest = {
            item: questItemFor(sp, s.capLevel, random),
            need: pondData.questCounts[
              Math.min(s.capLevel, pondData.questCounts.length - 1)
            ]!,
            given: 0,
          };
        }
      }
    }
    setState(p, s);
  }
}

/** What the ponds hold this morning, for the report (note 93): products waiting and quests asking. */
export function pondNews(g: GameState): { ready: number; quests: number } {
  let ready = 0;
  let quests = 0;
  for (const p of pondsOf(g)) {
    const s = stateOf(p);
    if (s.building > 0) continue;
    if (s.out) ready += 1;
    if (s.quest) quests += 1;
  }
  return { ready, quests };
}

/** True when a pond has a quest waiting. */
export function questWaiting(p: PlacedItem): boolean {
  return stateOf(p).quest !== undefined;
}

/**
 * Throw the quest item in, one at a time, any quality. Done, the cap rises one
 * step, the fish give fishing XP (20 plus 5 per spawn day), and the breeding
 * clock starts over.
 */
export function giveQuestItem(
  g: GameState,
  x: number,
  y: number,
): Outcome & { done?: boolean } {
  const p = pondAt(g, x, y);
  if (!p) return fail("There is no pond here.");
  const s = stateOf(p);
  const sp = speciesById(s.species);
  if (!s.quest || !sp) return fail("The fish want nothing.");
  const held = heldId(g, s.quest.item);
  if (held === undefined) return fail("You do not have one.");
  g.inventory.remove(held, 1);
  s.quest.given += 1;
  if (s.quest.given < s.quest.need) {
    setState(p, s);
    return { ok: true, item: s.quest.item, done: false };
  }
  s.capLevel += 1;
  delete s.quest;
  delete s.questWait;
  s.spawn = spawnDaysOf(sp);
  setState(p, s);
  const xp = pondData.questXp.base + pondData.questXp.perDay * spawnDaysOf(sp);
  const levelUp = g.skills.gain("fishing", xp);
  const gift = SPECIES_ROWS[sp.id]?.reward;
  if (gift && itemById(gift.item) && !g.inventory.add(gift.item, gift.count))
    g.ground.drop(x, y, gift.item, gift.count);
  return {
    ok: true,
    done: true,
    item: itemById(held)?.id ?? held,
    note: "The fish thank you. The pond can hold more.",
    ...(levelUp
      ? { levelUp: { skill: "fishing" as const, level: levelUp } }
      : {}),
  };
}

/** Take the waiting product (roe or a good) into the pack. */
export function collectProduct(g: GameState, x: number, y: number): Outcome {
  const p = pondAt(g, x, y);
  const s = p && stateOf(p);
  if (!p || !s?.out) return fail("nothing to act on");
  if (g.inventory.room(s.out.item) < s.out.count) return fail("backpack full");
  g.inventory.add(s.out.item, s.out.count);
  const item = s.out.item;
  delete s.out;
  setState(p, s);
  return { ok: true, item };
}

/** What a pond shows when the player faces it with nothing to use: its fish, cap and any ask. */
export function pondStatus(p: PlacedItem): string {
  const s = stateOf(p);
  if (s.building > 0)
    return `The carpenter is still digging the pond (${s.building} ${s.building === 1 ? "day" : "days"} left).`;
  const sp = speciesById(s.species);
  if (!sp || s.count === 0)
    return "An empty pond. Hold a fish and press Action to put it in.";
  const name = itemById(sp.id)?.name ?? sp.id;
  const ask = s.quest
    ? ` They want ${s.quest.need - s.quest.given} ${itemById(s.quest.item)?.name ?? s.quest.item}.`
    : "";
  return `${s.count} of ${capOf(s)} ${name}.${ask}`;
}

/**
 * The Action press on a pond, one rule for the scene: the quest item the fish ask for
 * goes in first, then a waiting product is taken, then a held fish is put in, else the
 * pond says how it stands. `held` is the item id in the player's hand, if any. Taking
 * fish out is the rod's job (`takeFish`).
 */
export function pondUse(
  g: GameState,
  p: PlacedItem,
  held: string | undefined,
): Outcome {
  const s = stateOf(p);
  const base = held ? splitQuality(held).base : undefined;
  if (s.building === 0 && s.quest && base === s.quest.item)
    return giveQuestItem(g, p.x, p.y);
  if (s.building === 0 && s.out) {
    const item = s.out.item;
    const r = collectProduct(g, p.x, p.y);
    return r.ok
      ? { ok: true, item, note: `You take ${itemById(item)?.name ?? item}.` }
      : r;
  }
  if (base && s.building === 0 && pondable(base)) {
    const r = putFish(g, p.x, p.y, held!);
    if (r.ok) return { ...r, note: "The fish slips into the pond." };
    return r;
  }
  return { ok: true, note: pondStatus(p) };
}

/** What the pond menu shows (note 93, "Interface"): the fish, count against the cap, the ask, and whether Empty works. */
export interface PondMenu {
  title: string;
  lines: string[];
  canEmpty: boolean;
}

export function pondMenu(p: PlacedItem): PondMenu {
  const s = stateOf(p);
  if (s.building > 0)
    return { title: "Fish pond", lines: [pondStatus(p)], canEmpty: false };
  const sp = speciesById(s.species);
  if (!sp || s.count === 0)
    return { title: "Fish pond", lines: [pondStatus(p)], canEmpty: false };
  const name = itemById(sp.id)?.name ?? sp.id;
  const lines = [`${name}: ${s.count} of ${capOf(s)}`];
  if (s.quest)
    lines.push(
      `They want ${s.quest.need - s.quest.given} ${itemById(s.quest.item)?.name ?? s.quest.item} (${s.quest.given} of ${s.quest.need} given).`,
    );
  if (s.out)
    lines.push(
      `Waiting: ${s.out.count} ${itemById(s.out.item)?.name ?? s.out.item}.`,
    );
  return { title: "Fish pond", lines, canEmpty: true };
}

/**
 * The Empty button: every fish goes to the pack (the rod's `takeFish`, repeated), so
 * the pond resets. Nothing is taken unless the pack has room for all of them.
 */
export function emptyPond(g: GameState, x: number, y: number): Outcome {
  const p = pondAt(g, x, y);
  if (!p) return fail("There is no pond here.");
  const s = stateOf(p);
  if (s.building > 0 || s.count === 0 || s.species === undefined)
    return fail("There is no fish to take.");
  if (g.inventory.room(s.species) < s.count) return fail("backpack full");
  const item = s.species;
  for (let n = s.count; n > 0; n--) takeFish(g, x, y);
  return { ok: true, item };
}
