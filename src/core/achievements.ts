import achievementData from "../content/achievements.json";
import { CROPS } from "./crops";
import { hatById } from "./hats";
import { RECIPES, buildable } from "./crafting";
import { splitQuality } from "./quality";
import type { GameState } from "./save";
import { SKILLS } from "./skills";

/**
 * Achievements and the hatter (`docs/design/38_achievements.md`). The slice 1
 * list that the game can already measure: money, crafting, shipping, a skill
 * at level 10 and the house. Each unlocks one hat for sale at the hatter, who
 * is a counter on the achievements screen until the valley has a shop for
 * her. Checks run at day end and on load. The rest of note 38's list waits for
 * its systems. Content is `src/content/achievements.json`. Pure rules.
 */
export type AchievementKind =
  "money" | "craft" | "craftAll" | "shipEach" | "shipOne" | "skill" | "house";

export interface AchievementDef {
  id: string;
  name: string;
  goal: string;
  kind: AchievementKind;
  threshold: number;
  /** Hidden on the list until earned. */
  secret: boolean;
  hat: { id: string; name: string; color: string; price: number };
}

export const ACHIEVEMENTS = achievementData as AchievementDef[];

export interface AchievementsSave {
  earned: string[];
  crafted: string[];
}

/** What has been earned, and the different things crafted so far. */
export class Achievements {
  private earned: string[] = [];
  private crafted = new Set<string>();

  has(id: string): boolean {
    return this.earned.includes(id);
  }

  list(): string[] {
    return [...this.earned];
  }

  /** Record that a recipe has been crafted at least once. */
  noteCrafted(id: string): void {
    this.crafted.add(id);
  }

  get craftedCount(): number {
    return this.crafted.size;
  }

  hasCrafted(id: string): boolean {
    return this.crafted.has(id);
  }

  /** Mark an achievement earned. False if unknown or already earned. */
  award(id: string): boolean {
    if (!ACHIEVEMENTS.some((a) => a.id === id) || this.has(id)) return false;
    this.earned.push(id);
    return true;
  }

  save(): AchievementsSave {
    return { earned: [...this.earned], crafted: [...this.crafted] };
  }

  load(raw: unknown): void {
    this.earned = [];
    this.crafted = new Set();
    if (typeof raw !== "object" || raw === null) return;
    const data = raw as Partial<AchievementsSave>;
    if (Array.isArray(data.earned))
      for (const id of data.earned) if (typeof id === "string") this.award(id);
    if (Array.isArray(data.crafted))
      for (const id of data.crafted)
        if (typeof id === "string") this.crafted.add(id);
  }
}

/** How many of a base item have ever been shipped, whatever the quality. */
function shippedOf(g: GameState, base: string): number {
  let n = 0;
  for (const [id, count] of Object.entries(g.bin.save().shipped))
    if (splitQuality(id).base === base) n += count;
  return n;
}

/** True when an achievement's goal is met now. */
export function met(g: GameState, a: AchievementDef): boolean {
  switch (a.kind) {
    case "money":
      // All gold received, as the cave mark counts (SC-54, SC-61).
      return g.cave.earnings >= a.threshold;
    case "craft":
      return g.achievements.craftedCount >= a.threshold;
    case "craftAll":
      return RECIPES.filter(buildable).every((r) =>
        g.achievements.hasCrafted(r.id),
      );
    case "shipEach":
      return CROPS.every((c) => shippedOf(g, c.id) >= a.threshold);
    case "shipOne":
      return CROPS.some((c) => shippedOf(g, c.id) >= a.threshold);
    case "skill":
      return SKILLS.some((s) => g.skills.level(s) >= a.threshold);
    case "house":
      return g.houseTier >= a.threshold;
  }
}

/**
 * Check every goal and award what is met. Returns the achievements earned by
 * this check, so the morning report can name them. Safe to repeat.
 */
export function checkAchievements(g: GameState): AchievementDef[] {
  const won: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS)
    if (!g.achievements.has(a.id) && met(g, a) && g.achievements.award(a.id))
      won.push(a);
  return won;
}

/** Hats on sale at the hatter: those of earned achievements the player does not own. */
export function hatsOnSale(g: GameState): AchievementDef[] {
  return ACHIEVEMENTS.filter(
    (a) => g.achievements.has(a.id) && !g.wardrobe.has(a.hat.id),
  );
}

/** Buy a hat from the hatter. Returns why not, or undefined on success. */
export function buyHat(g: GameState, hatId: string): string | undefined {
  const a = hatsOnSale(g).find((x) => x.hat.id === hatId);
  if (!a || !hatById(hatId)) return "The hatter does not have that.";
  if (g.money < a.hat.price) return "Not enough money.";
  g.money -= a.hat.price;
  g.wardrobe.add(hatId);
  return undefined;
}
