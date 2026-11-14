import { DAYS_PER_SEASON, SEASONS, type Season } from "./calendar";
import { DAY_START } from "./clock";
import { giveItem } from "./debug";
import { HEART } from "./friendship";
import { Inventory } from "./inventory";
import { LEVEL_XP, MAX_LEVEL, SKILLS, type Skill } from "./skills";
import type { GameState } from "./save";
import { setFlag } from "./worldflags";
import { villagerById } from "./villagers";
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

/** Apply a patch to a game state. Order: day, money, skills, hall, flags, hearts, items. */
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

  if (p.money !== undefined) g.money = Math.max(0, Math.floor(p.money));

  for (const [skill, level] of Object.entries(p.skills ?? {})) {
    if (!SKILLS.includes(skill as Skill) || !(level >= 1 && level <= MAX_LEVEL))
      problems.push(`bad skill ${skill}=${level}`);
    else {
      const need = LEVEL_XP[level - 1]! - g.skills.xpOf(skill as Skill);
      if (need > 0) g.skills.gain(skill as Skill, need);
    }
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

  for (const [id, hearts] of Object.entries(p.hearts ?? {})) {
    if (!villagerById(id)) {
      problems.push(`unknown villager ${id}`);
      continue;
    }
    g.friendship.meet(id);
    const need = hearts * HEART - g.friendship.points(id);
    if (need > 0) g.friendship.award(id, need);
  }

  for (const [id, n] of Object.entries(p.items ?? {})) {
    const r = giveItem(g, id, n);
    if (r !== "ok") problems.push(`item ${id}: ${r}`);
  }

  return { problems };
}
