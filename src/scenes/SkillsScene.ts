import Phaser from "phaser";
import type { GameState } from "../core/save";
import { professionById } from "../core/professions";
import { MAX_LEVEL, skillRows } from "../core/skills";
import { frame } from "./panel";
import { STATE_KEY } from "./state";

const NAMES = {
  farming: "Farming",
  foraging: "Foraging",
  mining: "Mining",
  fishing: "Fishing",
  combat: "Combat",
} as const;

/** The skills screen, drawn over the paused farm: levels and progress. */
export class SkillsScene extends Phaser.Scene {
  constructor() {
    super("skills");
  }

  create(): void {
    const g = this.registry.get(STATE_KEY) as GameState;
    frame(this, "Skills", () => this.close());
    skillRows(g.skills).forEach((row, i) => {
      const y = 84 + i * 76;
      const pro = professionById(g.skills.professionOf(row.skill) ?? "");
      this.add.text(
        48,
        y,
        `${NAMES[row.skill]}  level ${row.level}${pro ? `  ${pro.name}` : ""}`,
        { fontSize: "28px", color: "#ffffff" },
      );
      const bar = 600;
      this.add.rectangle(48, y + 50, bar, 18, 0x000000, 0.5).setOrigin(0);
      const share = row.next === undefined ? 1 : Math.min(row.xp / row.next, 1);
      this.add.rectangle(48, y + 50, bar * share, 18, 0x8fd18a, 1).setOrigin(0);
      const detail =
        row.level >= MAX_LEVEL
          ? `${row.xp} XP, top level`
          : `${row.xp} of ${row.next} XP to level ${row.level + 1}`;
      this.add.text(48, y + 74, detail, {
        fontSize: "16px",
        color: "#ffffffcc",
      });
    });
    this.add.text(
      24,
      486,
      "Better farming means better crop quality and cheaper tool swings. Better foraging means better forage quality. Better mining means cheaper pickaxe swings and more ore. Better fishing means bigger, better fish, and rare fish from level 5. Better combat means more health.   Esc: close",
      { fontSize: "13px", color: "#ffffffaa", wordWrap: { width: 780 } },
    );
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
