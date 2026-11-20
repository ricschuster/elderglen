import { describe, expect, it } from "vitest";
import { defeatCreature, defeatMessage } from "../src/core/creature-defeat";
import { CREATURES, type Creature } from "../src/core/creatures";
import { newGame } from "../src/core/save";

function creature(kind: string): Creature {
  return {
    uid: 1,
    kind,
    x: 40,
    y: 40,
    hp: 0,
    state: "wander",
    t: 0,
    angle: 0,
    away: 0,
    face: 0,
    struck: false,
  };
}

describe("defeating a creature", () => {
  it("pays nothing for an unknown kind", () => {
    const g = newGame();
    expect(
      defeatCreature(g, creature("nope"), "farm", undefined, 16, () => 0.5),
    ).toBeUndefined();
  });

  it("tallies the kill and gives combat XP", () => {
    const g = newGame();
    const kind = CREATURES[0]!.id;
    const r = defeatCreature(
      g,
      creature(kind),
      "farm",
      undefined,
      16,
      () => 0.99,
    );
    expect(r?.name).toBe(CREATURES[0]!.name);
    expect(r?.ladder).toBe(false);
    expect(defeatMessage(r!)).toContain("beaten.");
  });

  it("builds the message from level, goods and a ladder", () => {
    expect(
      defeatMessage({
        name: "Gloop",
        levelUp: 2,
        got: ["1 slime", "2 gem"],
        ladder: true,
      }),
    ).toBe(
      "Gloop beaten. Combat is now level 2. Dropped 1 slime, 2 gem. A ladder is revealed!",
    );
  });
});
