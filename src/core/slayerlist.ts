import { claimSlayerItem, claimSlayerRing, SLAYER_RINGS } from "./combat";
import { SLAYER_GOALS, slayerKills, type SlayerGoal } from "./creatures";
import { HATS, type HatDef } from "./hats";
import { itemById } from "./items";
import type { LetterDef } from "./mail";
import type { RingDef } from "./equipment";
import type { GameState } from "./save";

/**
 * The slayer wall list in the mine hall (`docs/design/22_mines.md`, "The slayer list"):
 * twelve goals, each with a reward Maren hands over free once the count is met,
 * and sells again from her reward shop. Kills are the existing tally
 * (`combat.kills`); nothing new is counted here.
 */
export type RewardKind = "ring" | "hat" | "item";

/** What a goal gives. `price` is the reward shop price, absent for the one-off Bug Meat. */
export interface SlayerReward {
  kind: RewardKind;
  /** The ring or hat id, or the item id for an item stack. */
  id: string;
  name: string;
  count: number;
  price?: number;
}

export type GoalState = "progress" | "ready" | "claimed";

const ringOf = (goal: SlayerGoal): RingDef | undefined =>
  SLAYER_RINGS.find((r) => r.slayer === goal.id);
const hatOf = (goal: SlayerGoal): HatDef | undefined =>
  HATS.find((h) => h.slayer === goal.id);

/** The reward of a goal, from the ring, hat or item data. Undefined only if the data is missing. */
export function rewardOf(goal: SlayerGoal): SlayerReward | undefined {
  const ring = ringOf(goal);
  if (ring)
    return {
      kind: "ring",
      id: ring.id,
      name: ring.name,
      count: 1,
      price: ring.rebuy,
    };
  const hat = hatOf(goal);
  if (hat)
    return {
      kind: "hat",
      id: hat.id,
      name: hat.name,
      count: 1,
      price: hat.rebuy,
    };
  if (goal.reward)
    return {
      kind: "item",
      id: goal.reward.item,
      name: itemById(goal.reward.item)?.name ?? goal.reward.item,
      count: goal.reward.count,
    };
  return undefined;
}

/** Kills so far and the count the goal needs. */
export function goalProgress(
  g: GameState,
  goal: SlayerGoal,
): { kills: number; goal: number } {
  return { kills: slayerKills(goal, g.combat.kills), goal: goal.goal };
}

/** True once the reward was handed over (the key differs by kind: the ring id, or `goal:` plus the goal id). */
export function isClaimed(g: GameState, goal: SlayerGoal): boolean {
  const ring = ringOf(goal);
  return (
    g.combat.slayerClaimed.includes(`goal:${goal.id}`) ||
    (!!ring && g.combat.slayerClaimed.includes(ring.id))
  );
}

/** In progress, ready to claim, or claimed. */
export function goalState(g: GameState, goal: SlayerGoal): GoalState {
  if (isClaimed(g, goal)) return "claimed";
  const p = goalProgress(g, goal);
  return p.kills >= p.goal ? "ready" : "progress";
}

/** Every goal with its state, in the list's order. */
export function wallList(g: GameState): {
  goal: SlayerGoal;
  reward: SlayerReward | undefined;
  state: GoalState;
  kills: number;
}[] {
  return SLAYER_GOALS.map((goal) => ({
    goal,
    reward: rewardOf(goal),
    state: goalState(g, goal),
    kills: slayerKills(goal, g.combat.kills),
  }));
}

/** A letter that carries the reward when the pack had no room. */
function postReward(g: GameState, goal: SlayerGoal, r: SlayerReward): void {
  const letter: LetterDef = {
    id: `slayer-${goal.id}`,
    sender: "Maren",
    title: "Your reward",
    // PLACEHOLDER TEXT, no voice sheet yet.
    body: "PLACEHOLDER TEXT. Your pack was full, so your reward comes by post.",
    trigger: { kind: "first-achievement" },
    attachment: { items: [{ id: r.id, count: r.count }] },
  };
  g.mail.queue(letter.id, g.day.clock.day + 1, letter);
}

const FULL = "Your backpack is full.";

/**
 * Hand over the reward of a met goal, free, once. A full pack sends it by post
 * the next morning. Returns an error line, or undefined when handed over or posted.
 */
export function claimGoal(g: GameState, id: string): string | undefined {
  const goal = SLAYER_GOALS.find((s) => s.id === id);
  const reward = goal && rewardOf(goal);
  if (!goal || !reward) return "She has no such reward.";
  if (isClaimed(g, goal)) return "You already took it.";
  if (goalState(g, goal) !== "ready") return "That goal is not met yet.";
  let problem: string | undefined;
  if (reward.kind === "ring") problem = claimSlayerRing(g, reward.id);
  else if (reward.kind === "item") problem = claimSlayerItem(g, goal.id);
  else g.wardrobe.add(reward.id);
  // "You already have it": found elsewhere, the goal is still done.
  if (problem === FULL) postReward(g, goal, reward);
  else if (problem && problem !== "You already have it.") return problem;
  const key = `goal:${goal.id}`;
  if (!g.combat.slayerClaimed.includes(key)) g.combat.slayerClaimed.push(key);
  return undefined;
}

/** True when the player owns the ring (carried or worn) or the hat. */
function owns(g: GameState, r: SlayerReward): boolean {
  if (r.kind === "hat") return g.wardrobe.has(r.id);
  return g.inventory.count(r.id) > 0 || g.equipment.worn().includes(r.id);
}

/** What Maren's reward shop sells: the reward of every goal that is met, claimed or not. Bug Meat is never sold. */
export function rewardShop(g: GameState): SlayerReward[] {
  const out: SlayerReward[] = [];
  for (const goal of SLAYER_GOALS) {
    const r = rewardOf(goal);
    if (r?.price === undefined) continue;
    if (slayerKills(goal, g.combat.kills) >= goal.goal) out.push(r);
  }
  return out;
}

/** Buy a reward in the shop. Returns an error line, or undefined when bought. */
export function buyReward(g: GameState, id: string): string | undefined {
  const r = rewardShop(g).find((x) => x.id === id);
  if (!r || r.price === undefined) return "She does not sell that.";
  if (owns(g, r)) return "You already have one.";
  if (g.money < r.price) return "Not enough money.";
  if (r.kind === "hat") g.wardrobe.add(r.id);
  else if (!g.inventory.add(r.id, 1)) return FULL;
  g.money -= r.price;
  return undefined;
}
