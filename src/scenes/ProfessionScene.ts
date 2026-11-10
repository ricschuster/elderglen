import Phaser from "phaser";
import {
  choose,
  optionsFor,
  pendingChoice,
  pendingLevel,
} from "../core/professions";
import type { GameState } from "../core/save";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

const SKILL_NAMES = {
  farming: "Farming",
  foraging: "Foraging",
  mining: "Mining",
  fishing: "Fishing",
  combat: "Combat",
} as const;

/**
 * Asked when a skill reaches level 5 (or 10, under the first pick): pick one of two professions. There is no
 * way to skip it. The farm is paused behind it and resumes once one is chosen.
 */
export class ProfessionScene extends Phaser.Scene {
  constructor() {
    super("profession");
  }

  create(): void {
    const g = this.registry.get(STATE_KEY) as GameState;
    const skill = pendingChoice(g.skills);
    if (!skill) return this.done();
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 0.92)
      .setInteractive();
    this.add
      .text(
        480,
        90,
        `${SKILL_NAMES[skill]} level ${pendingLevel(g.skills, skill)}`,
        {
          fontSize: "34px",
          color: "#ffe9a0",
        },
      )
      .setOrigin(0.5);
    this.add
      .text(480, 140, "Choose a profession. It cannot be changed.", {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    optionsFor(skill, g.skills).forEach((p, i) => {
      const x = 280 + i * 400;
      this.add
        .rectangle(x, 300, 340, 220, 0x3f7d3a, 1)
        .setStrokeStyle(2, 0xffffff, 0.8)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.pick(g, skill, p.id));
      this.add
        .text(x, 250, p.name, { fontSize: "28px", color: "#ffffff" })
        .setOrigin(0.5);
      this.add
        .text(x, 320, p.text, {
          fontSize: "18px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: 300 },
        })
        .setOrigin(0.5);
      this.add
        .text(x, 400, `Key ${i + 1}`, { fontSize: "13px", color: "#ffffffaa" })
        .setOrigin(0.5);
      this.input.keyboard?.on(`keydown-${i === 0 ? "ONE" : "TWO"}`, () =>
        this.pick(g, skill, p.id),
      );
    });
  }

  private pick(
    g: GameState,
    skill: Parameters<typeof choose>[1],
    id: string,
  ): void {
    if (choose(g.skills, skill, id)) this.done();
  }

  private done(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
