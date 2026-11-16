import { moveStack } from "../src/core/packmenu";
import { describe, expect, it } from "vitest";
import {
  cycle,
  findTool,
  heldAt,
  startGame,
  TOOLBAR_SIZE,
  TOOLS,
} from "../src/core/toolbar";

describe("toolbar", () => {
  it("starts with the tools, then the backpack", () => {
    const g = startGame();
    expect(heldAt(g, 0)).toEqual({ kind: "tool", tool: "hoe" });
    expect(heldAt(g, TOOLS.length - 1)).toEqual({
      kind: "tool",
      tool: "pickaxe",
    });
    expect(heldAt(g, TOOLS.length)).toMatchObject({
      kind: "item",
      id: "parsnip-seed",
      count: 15,
    });
    expect(heldAt(g, TOOLS.length + 1)).toEqual({ kind: "empty" });
  });

  it("reads out of range as empty", () => {
    const g = startGame();
    expect(heldAt(g, -1)).toEqual({ kind: "empty" });
    expect(heldAt(g, TOOLBAR_SIZE)).toEqual({ kind: "empty" });
  });

  it("wraps when cycling", () => {
    expect(cycle(0, -1)).toBe(TOOLBAR_SIZE - 1);
    expect(cycle(TOOLBAR_SIZE - 1, 1)).toBe(0);
    expect(cycle(3, 1)).toBe(4);
  });
});

describe("backpack rows", () => {
  it("cycles through every slot and jumps rows with nextRow", async () => {
    const { toolbarSize, nextRow, rowOf } = await import("../src/core/toolbar");
    const g = startGame();
    expect(toolbarSize(g)).toBe(TOOLBAR_SIZE);
    expect(nextRow(g, 4)).toBe(0);
    g.inventory.grow(24);
    expect(toolbarSize(g)).toBe(24);
    expect(nextRow(g, 1)).toBe(12);
    expect(nextRow(g, 12)).toBe(0);
    expect(rowOf(11)).toBe(0);
    expect(rowOf(12)).toBe(1);
    expect(cycle(23, 1, 24)).toBe(0);
  });
});

describe("tools in the pack (note 102)", () => {
  it("finds a tool by what it is, wherever it sits", () => {
    const g = startGame();
    expect(findTool(g.inventory, "axe")).toBe(2);
    expect(moveStack(g.inventory, 2, 9)).toBe(true);
    expect(findTool(g.inventory, "axe")).toBe(9);
    expect(heldAt(g, 9)).toEqual({ kind: "tool", tool: "axe" });
    expect(findTool(g.inventory, "pickaxe")).toBe(3);
  });

  it("swaps a tool with an item and keeps both", () => {
    const g = startGame();
    moveStack(g.inventory, 4, 0);
    expect(heldAt(g, 0)).toMatchObject({ kind: "item", id: "parsnip-seed" });
    expect(heldAt(g, 4)).toEqual({ kind: "tool", tool: "hoe" });
  });

  it("an upgrade follows the tool, whichever slot it is in", () => {
    const g = startGame();
    moveStack(g.inventory, 0, 7);
    g.toolTiers.hoe = 2;
    expect(findTool(g.inventory, "hoe")).toBe(7);
    expect(g.toolTiers.hoe).toBe(2);
    expect(g.inventory.count("tool:hoe")).toBe(1);
  });
});
