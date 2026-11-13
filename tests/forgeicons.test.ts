import { describe, expect, it } from "vitest";
import { BOOTS, RINGS, comboId } from "../src/core/equipment";
import { BOMBS } from "../src/core/bombs";
import { LIFE_ELIXIR, MINERS_TREAT, OIL_OF_GARLIC } from "../src/core/items";
import { forgeKey, iconKey } from "../src/scenes/art";

describe("forge goods icons", () => {
  it("every ring, combined ring, boots, bomb and Forge good has a picture key", () => {
    const ids = [
      ...RINGS.map((r) => r.id),
      comboId("glow-ring", "magnet-ring"),
      ...BOOTS.map((b) => b.id),
      ...BOMBS.map((b) => b.id),
      LIFE_ELIXIR,
      MINERS_TREAT,
      OIL_OF_GARLIC,
    ];
    for (const id of ids) expect(iconKey(id), id).toBeDefined();
    expect(iconKey("sturdy-band")).toBe(forgeKey("sturdy-band"));
  });
});
