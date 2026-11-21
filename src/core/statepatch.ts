import { DAYS_PER_SEASON, SEASONS, type Season } from "./calendar";
import { DAY_START } from "./clock";
import { giveItem } from "./debug";
import { allItems } from "./items";
import { BUILT_FLOORS, minesOpen } from "./mines";
import { NURSERY_TIER } from "./children";
import { MAX_HOUSE_TIER } from "./house";
import {
  COURT_HEARTS,
  MARRIAGE_HOUSE_TIER,
  MAX_CHILDREN,
  PROPOSE_HEARTS,
} from "./marriage";
import { eventById } from "./heartevents";
import { HEART, heartCap, isCandidate } from "./friendship";
import { Inventory } from "./inventory";
import { LEVEL_XP, MAX_LEVEL, SKILLS, type Skill } from "./skills";
import type { GameState } from "./save";
import { setFlag } from "./worldflags";
import { VILLAGERS, villagerById } from "./villagers";
import { choose, optionsFor, pendingChoice } from "./professions";
import type { Weather } from "./weather";
import { WEATHERS } from "./weather";
import type { Quality } from "./quality";
import { withQuality } from "./quality";

/**
 * A state patch for the dev-only `window.farmState(patch)` hook, so a playtest
 * can jump to "day 40, hall rooms done, 5000g" in one call instead of playing
 * there (`42_debug_menu.md`). Every key is optional. It goes through the
 * game's own rules (the Hall's hand-in, Skills XP, Friendship points) rather
 * than writing fields other code derives. Nothing here is a game feature.
 */
export interface StatePatch {
  /** Jump to this absolute day (1 based), at the morning time, energy full. */
  day?: number;
  /** Jump to the start of a season instead (`dayOfSeason` default 1, `year` default 1). Ignored if `day` is set. */
  season?: Season;
  dayOfSeason?: number;
  year?: number;
  /** Set the clock to this many minutes since midnight, a multiple of 10 (after `day`/`season`, so it wins over the morning time). */
  minutes?: number;
  /** Set today's weather. */
  weather?: Weather;
  /** Mark these heart events as seen (a story that needs an order, `after`). */
  eventsSeen?: string[];
  /** The map to stand on after the jump (read by the `farmState` hook, not here). Default: stay. */
  map?: string;
  /** The entry on that map (read by the hook). Default "door". */
  entry?: string;
  /** Set the money to exactly this. */
  money?: number;
  /** Add items to the backpack: id to count. Stops with a problem when it is full. */
  items?: Record<string, number>;
  /** Raise a skill to at least this level (1 to 10). Never lowers one. */
  skills?: Partial<Record<Skill, number>>;
  /** Finish every bundle in these hall rooms (rooms they depend on are not filled for you). */
  hallRooms?: string[];
  /** Finish these bundles by id. */
  hallBundles?: string[];
  /** Raise these world flags (`core/worldflags.ts`). */
  flags?: string[];
  /** Raise a villager's friendship to at least this many hearts (capped by their heart limit). */
  hearts?: Record<string, number>;
  /** Raise the house to at least this tier (0 to 3). Never lowers it. */
  houseTier?: number;
  /** Mark this mine floor as reached (it is dug for today), so the lift stops there. Needs the mines open (day 5). */
  minesDeepest?: number;
  /**
   * Take a candidate through the courtship rules to this stage (default "married"), then add
   * `children` (0 to 2, married only; the nursery tier is raised for them). The villager's hearts
   * are raised through Friendship first. Only on a game that is not already courting.
   */
  marriage?: {
    spouse: string;
    stage?: "courting" | "engaged" | "married";
    children?: number;
  };
  /** Meet everyone in the roster, so the Social tab shows names instead of "???". */
  meetAll?: boolean;
  /** Take the first option of every pending profession choice, so no prompt queues up on load. */
  autoProfessions?: boolean;
  /** Fill the backpack with one of every item until it is full (after `items`). */
  fillPack?: boolean;
}

export interface PatchResult {
  /** Things that could not be applied (unknown id, full pack). Empty when all went in. */
  problems: string[];
}

const QUALITY_BY_RANK: Quality[] = ["gold", "silver", "normal"];

/** Fill a bundle through the hall's own hand-in, with a throwaway pack and wallet (no reward is paid). */
function fillBundle(g: GameState, bundleId: string, problems: string[]): void {
  const def = g.hall.bundles.find((b) => b.id === bundleId);
  if (!def) {
    problems.push(`unknown bundle ${bundleId}`);
    return;
  }
  const wallet = { money: 0 };
  for (const slot of def.items) {
    // The Hall only takes a room's goods once the room is open: that stays a rule.
    const good = slot.anyOf?.[0] ?? slot.id;
    const stack = withQuality(
      good,
      QUALITY_BY_RANK.find((q) => q === slot.minQuality) ?? "normal",
    );
    for (let i = g.hall.have(bundleId, slot.id); i < slot.count; i++) {
      if (g.hall.complete(bundleId)) return;
      const inv = new Inventory(1);
      inv.add(stack, 1);
      if (g.hall.handIn(inv, wallet, bundleId, stack) === "rejected") {
        problems.push(
          `bundle ${bundleId}: ${g.hall.problem(inv, bundleId, stack) ?? "rejected"}`,
        );
        return;
      }
    }
  }
}

/** Apply a patch to a game state. Order: day, minutes, weather, seen events, money, skills, hall, flags, hearts, items. */
export function applyStatePatch(g: GameState, p: StatePatch): PatchResult {
  const problems: string[] = [];

  let day = p.day;
  if (day === undefined && p.season) {
    const s = SEASONS.indexOf(p.season);
    const year = p.year ?? 1;
    day =
      (year - 1) * SEASONS.length * DAYS_PER_SEASON +
      s * DAYS_PER_SEASON +
      (p.dayOfSeason ?? 1);
  }
  if (day !== undefined) {
    if (!Number.isInteger(day) || day < 1) problems.push(`bad day ${day}`);
    else g.day.restore(day, g.day.energy.max, DAY_START);
  }

  if (p.minutes !== undefined) {
    // The game clock ticks in 10 minute steps, so only those times are valid.
    if (
      !Number.isInteger(p.minutes) ||
      p.minutes < 0 ||
      p.minutes > 1559 ||
      p.minutes % 10 !== 0
    )
      problems.push(`bad minutes ${p.minutes}`);
    else g.day.restore(g.day.clock.day, g.day.energy.max, p.minutes);
  }

  if (p.weather !== undefined) {
    if (!WEATHERS.includes(p.weather))
      problems.push(`bad weather ${p.weather}`);
    else g.weather = p.weather;
  }

  for (const id of p.eventsSeen ?? []) {
    if (!eventById(id)) problems.push(`unknown event ${id}`);
    else g.heartEvents.mark(id, 0);
  }

  if (p.money !== undefined) g.money = Math.max(0, Math.floor(p.money));

  for (const [skill, level] of Object.entries(p.skills ?? {})) {
    if (!SKILLS.includes(skill as Skill) || !(level >= 1 && level <= MAX_LEVEL))
      problems.push(`bad skill ${skill}=${level}`);
    else {
      const need = LEVEL_XP[level - 1]! - g.skills.xpOf(skill as Skill);
      if (need > 0) g.skills.gain(skill as Skill, need);
    }
  }

  if (p.autoProfessions) {
    for (
      let s = pendingChoice(g.skills);
      s !== undefined;
      s = pendingChoice(g.skills)
    ) {
      const first = optionsFor(s, g.skills)[0];
      if (!first || !choose(g.skills, s, first.id)) break;
    }
  }

  // Raising combat or mining levels (or taking Steady) lifts the health ceiling, and
  // `sync` never heals, so a staged farmer would start part-full. A new game starts
  // full, so top the bar up to the new ceiling.
  if (p.skills || p.autoProfessions) {
    g.combat.sync(g.skills);
    g.combat.health.current = g.combat.health.max;
  }

  // A room only takes hand-ins once it is open, so go round until nothing more fits.
  const rooms = new Set(p.hallRooms ?? []);
  for (const r of rooms)
    if (!g.hall.rooms.some((x) => x.id === r)) {
      problems.push(`unknown room ${r}`);
      rooms.delete(r);
    }
  const ids = [
    ...(p.hallBundles ?? []),
    ...g.hall.bundles.filter((b) => rooms.has(b.room)).map((b) => b.id),
  ];
  let pending = ids.filter((id) => !g.hall.complete(id));
  let guard = pending.length + 1;
  while (pending.length > 0 && guard-- > 0) {
    const before = pending.length;
    const quiet: string[] = [];
    for (const id of pending) fillBundle(g, id, quiet);
    pending = pending.filter((id) => !g.hall.complete(id));
    if (pending.length === before) {
      problems.push(...quiet);
      break;
    }
  }

  for (const f of p.flags ?? []) setFlag(g, f);

  if (p.meetAll) for (const v of VILLAGERS) g.friendship.meet(v.id);

  for (const [id, hearts] of Object.entries(p.hearts ?? {})) {
    if (!villagerById(id)) {
      problems.push(`unknown villager ${id}`);
      continue;
    }
    g.friendship.meet(id);
    const need = hearts * HEART - g.friendship.points(id);
    if (need > 0) g.friendship.award(id, need);
    // A candidate stops at 8 hearts until the bouquet (note 61): give it for the 9th and 10th.
    if (isCandidate(id) && hearts > heartCap(id, false)) {
      g.friendship.giveBouquet(id);
      const more = hearts * HEART - g.friendship.points(id);
      if (more > 0) g.friendship.award(id, more);
    }
  }

  if (p.houseTier !== undefined) {
    if (
      !Number.isInteger(p.houseTier) ||
      p.houseTier < 0 ||
      p.houseTier > MAX_HOUSE_TIER
    )
      problems.push(`bad houseTier ${p.houseTier}`);
    else g.houseTier = Math.max(g.houseTier, p.houseTier);
  }

  if (p.minesDeepest !== undefined) {
    if (
      !minesOpen(g.day.clock.day) ||
      !Number.isInteger(p.minesDeepest) ||
      p.minesDeepest < 1 ||
      p.minesDeepest > BUILT_FLOORS
    )
      problems.push(`bad minesDeepest ${p.minesDeepest}`);
    else g.mines.visit(p.minesDeepest, g.day.clock.day);
  }

  if (p.marriage) applyMarriage(g, p.marriage, problems);

  for (const [id, n] of Object.entries(p.items ?? {})) {
    const r = giveItem(g, id, n);
    if (r !== "ok") problems.push(`item ${id}: ${r}`);
  }

  if (p.fillPack)
    for (const item of allItems())
      if (giveItem(g, item.id, 1) === "full") break;

  return { problems };
}

/** Courtship, engagement and wedding through the game's own rules (`marriage.ts`), then the children. */
function applyMarriage(
  g: GameState,
  want: NonNullable<StatePatch["marriage"]>,
  problems: string[],
): void {
  const { spouse } = want;
  const stage = want.stage ?? "married";
  const kids = want.children ?? 0;
  const m = g.marriage;
  // The token needs the first house upgrade (courtship.ts), so a patched marriage has it too.
  g.houseTier = Math.max(g.houseTier, MARRIAGE_HOUSE_TIER);
  if (!isCandidate(spouse) || m.stage !== "none") {
    problems.push(`marriage: cannot court ${spouse}`);
    return;
  }
  if (kids < 0 || kids > MAX_CHILDREN || (kids > 0 && stage !== "married")) {
    problems.push(`marriage: bad children ${kids}`);
    return;
  }
  const today = g.day.clock.day;
  const raise = (hearts: number): number => {
    g.friendship.meet(spouse);
    const need = hearts * HEART - g.friendship.points(spouse);
    if (need > 0) g.friendship.award(spouse, need);
    return g.friendship.points(spouse);
  };
  if (
    !m.court(spouse, raise(COURT_HEARTS)) ||
    !g.friendship.giveBouquet(spouse)
  ) {
    problems.push(`marriage: ${spouse} will not be courted`);
    return;
  }
  setFlag(g, `bouquet-${spouse}`);
  if (stage === "courting") return;
  if (!m.engage(spouse, raise(PROPOSE_HEARTS), today)) {
    problems.push(`marriage: ${spouse} will not be engaged`);
    return;
  }
  if (stage === "engaged") return;
  m.marry(m.weddingDay);
  g.friendship.setSpouse(spouse);
  if (kids > 0) {
    g.houseTier = Math.max(g.houseTier, NURSERY_TIER);
    for (let i = 0; i < kids; i++) m.addChild(today);
  }
}
