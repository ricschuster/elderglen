import Phaser from "phaser";
import {
  animalRows,
  giftLogRows,
  socialRows,
  specialItems,
  unmetCount,
} from "../core/menupages";
import type { Taste } from "../core/friendship";
import type { GameState } from "../core/save";
import { frame } from "./panel";
import { STATE_KEY } from "./state";

const TITLE = { fontSize: "30px", color: "#ffe9a0" };
const BODY = { fontSize: "20px", color: "#ffffff", lineSpacing: 8 };
const FADED = { fontSize: "18px", color: "#ffffffaa" };

const hearts = (n: number, max: number): string =>
  "♥".repeat(n) + "♡".repeat(Math.max(0, max - n));

const TASTE_WORD: Record<Taste, string> = {
  love: "loves",
  like: "likes",
  neutral: "is fine with",
  dislike: "dislikes",
  hate: "hates",
};

/**
 * The Social tab (note 49): everyone met, with hearts and whether you spoke or
 * gave a gift today. Tap a person to read the gift tastes learned (note 61).
 */
export class SocialScene extends Phaser.Scene {
  private picked = 0;

  constructor() {
    super("social");
  }

  init(): void {
    this.picked = 0;
  }

  create(): void {
    const g = this.registry.get(STATE_KEY) as GameState;
    frame(this, "Social", () => undefined);
    this.add.text(24, 90, "Social", TITLE);
    const rows = socialRows(g);
    if (rows.length === 0) {
      this.add.text(
        24,
        140,
        "You have not met anyone yet. Talk to your neighbours to see them here.",
        { ...BODY, wordWrap: { width: 840 } },
      );
      return;
    }
    const log = this.add.text(470, 130, "", {
      fontSize: "18px",
      color: "#ffffff",
      lineSpacing: 4,
      wordWrap: { width: 450 },
    });
    const boxes: Phaser.GameObjects.Rectangle[] = [];
    const show = (i: number): void => {
      this.picked = i;
      boxes.forEach((b, n) =>
        b.setFillStyle(n === i ? 0xa0482e : 0x000000, 0.5),
      );
      const r = rows[i]!;
      const entries = giftLogRows(g, r.id);
      log.setText(
        entries.length === 0
          ? `${r.name}: no gift tastes learned yet.`
          : `${r.name}\n` +
              entries.map((e) => `${TASTE_WORD[e.taste]} ${e.item}`).join("\n"),
      );
    };
    rows.forEach((r, i) => {
      const y = 130 + i * 34;
      const box = this.add
        .rectangle(24, y - 4, 430, 32, 0x000000, 0.5)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });
      box.on("pointerdown", () => show(i));
      boxes.push(box);
      this.add.text(32, y, r.name, { fontSize: "18px", color: "#ffffff" });
      this.add.text(
        190,
        y,
        `${hearts(r.hearts, r.maxHearts)}${r.talkedToday ? "  talked" : ""}${r.giftedToday ? "  gift" : ""}`,
        { fontSize: "16px", color: "#ffe9a0" },
      );
    });
    const left = unmetCount(g);
    if (left > 0) this.add.text(24, 460, `${left} more to meet.`, FADED);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => show(Math.max(0, this.picked - 1)));
    kb?.on("keydown-DOWN", () =>
      show(Math.min(rows.length - 1, this.picked + 1)),
    );
    show(0);
  }
}

/** The Animals tab (note 49): the horse and every farm animal, with hearts and petting. */
export class AnimalsScene extends Phaser.Scene {
  constructor() {
    super("animals");
  }

  create(): void {
    const g = this.registry.get(STATE_KEY) as GameState;
    frame(this, "Animals", () => undefined);
    this.add.text(24, 90, "Animals", TITLE);
    animalRows(g).forEach((r, i) => {
      const y = 134 + (i % 10) * 32;
      const x = 24 + Math.floor(i / 10) * 460;
      this.add.text(x, y, `${r.name} (${r.kind})`, {
        fontSize: "18px",
        color: "#ffffff",
      });
      if (r.hearts === undefined) return;
      this.add.text(
        x + 250,
        y,
        `${hearts(r.hearts, r.maxHearts ?? 5)}  ${r.petted ? "petted" : "not petted"}`,
        { fontSize: "16px", color: r.petted ? "#8fd18a" : "#ffe9a0" },
      );
    });
  }
}

/** The Special Items tab (note 49): keepsakes and keys held, and what each does. */
export class SpecialScene extends Phaser.Scene {
  constructor() {
    super("special");
  }

  create(): void {
    const g = this.registry.get(STATE_KEY) as GameState;
    frame(this, "Special Items", () => undefined);
    this.add.text(24, 90, "Special Items", TITLE);
    specialItems(g).forEach((s, i) => {
      const y = 140 + i * 70;
      this.add.text(24, y, s.name, { fontSize: "22px", color: "#ffe9a0" });
      this.add.text(24, y + 30, s.text, {
        fontSize: "17px",
        color: "#ffffff",
        wordWrap: { width: 880 },
      });
    });
  }
}
