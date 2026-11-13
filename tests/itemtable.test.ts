import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allItems } from "../src/core/items";

/**
 * The item table is a committed JSON snapshot of the item registry (`src/core/items.ts`),
 * read by the wiki generator (note 100), which never parses TypeScript. The registry stays
 * the source. Refresh the file with `npm run items:export` after an item changes.
 */
const FILE = new URL("../src/content/item-table.json", import.meta.url);

function table() {
  return allItems()
    .map(({ id, name, sellPrice, buyPrice, energy, keep }) => ({
      id,
      name,
      sellPrice,
      ...(buyPrice === undefined ? {} : { buyPrice }),
      ...(energy === undefined ? {} : { energy }),
      ...(keep ? { keep: true } : {}),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

describe("item table snapshot", () => {
  const fresh = `${JSON.stringify(table(), null, 2)}\n`;
  if (process.env.UPDATE_ITEM_TABLE === "1") writeFileSync(FILE, fresh);
  it("matches the item registry (run npm run items:export)", () => {
    expect(readFileSync(FILE, "utf8")).toBe(fresh);
  });
  it("has no duplicate ids", () => {
    const ids = table().map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
