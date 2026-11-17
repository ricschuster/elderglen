import { describe, expect, it } from "vitest";
import { escTaken, takeEsc } from "../src/scenes/escape";

describe("Esc closes only the top screen", () => {
  it("is taken for the frame it was used in, then free again", () => {
    let frame = 10;
    const scene = { game: { getFrame: () => frame } };
    expect(escTaken(scene)).toBe(false);
    takeEsc(scene);
    expect(escTaken(scene)).toBe(true);
    frame = 11;
    expect(escTaken(scene)).toBe(false);
  });
});
