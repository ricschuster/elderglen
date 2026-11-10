import { describe, expect, it } from "vitest";
import {
  hatColor,
  summitBeatsAfterChoice,
  summitBeatsBeforeChoice,
  summitCast,
  type SummitBeat,
  summitChoiceIds,
} from "../src/core/summitscene";
import { hatById } from "../src/core/hats";

function who(b: SummitBeat | undefined): string | undefined {
  return b?.kind === "line" ? b.speaker : undefined;
}

function said(b: SummitBeat | undefined): string {
  return b?.kind === "line" ? b.text : "";
}

describe("summit scene script", () => {
  it("opens on the steward, then Old Greencoat, and ends before the choice", () => {
    const beats = summitBeatsBeforeChoice();
    const first = beats[0];
    expect(who(first)).toBe("Hall steward");
    const afterToast = beats.find(
      (b) => b.kind === "line" && b.speaker === "Old Greencoat",
    );
    expect(afterToast).toBeDefined();
    expect(beats[beats.length - 1]?.kind).toBe("choice");
    expect(beats.filter((b) => b.kind === "choice")).toHaveLength(1);
  });

  it("puts the household lines between Greencoat and the choice", () => {
    const beats = summitBeatsBeforeChoice();
    const g = beats.findIndex(
      (b) => b.kind === "line" && b.speaker === "Old Greencoat",
    );
    expect(beats.length - 1 - g).toBeGreaterThanOrEqual(15);
  });

  it("every choice has a reply and the scene closes on the steward", () => {
    for (const id of summitChoiceIds()) {
      const after = summitBeatsAfterChoice(id);
      expect(after.length).toBe(2);
      const last = after[after.length - 1];
      expect(who(last)).toBe("Hall steward");
    }
  });

  it("an unknown choice still closes the scene", () => {
    expect(summitBeatsAfterChoice("nope")).toHaveLength(1);
  });

  it("the choices lead to different replies", () => {
    const replies = summitChoiceIds().map((id) => {
      return said(summitBeatsAfterChoice(id)[0]);
    });
    expect(new Set(replies).size).toBe(replies.length);
  });

  it("every person wears a hat that exists, and no line is empty", () => {
    for (const p of summitCast()) expect(hatById(p.hat), p.name).toBeDefined();
    for (const b of summitBeatsBeforeChoice()) {
      if (b.kind === "line") expect(said(b).length).toBeGreaterThan(0);
    }
  });

  it("falls back to grey for an unknown hat", () => {
    expect(hatColor("nope")).toBe("#888888");
    expect(hatColor("summit-crown")).toBe(hatById("summit-crown")?.color);
  });

  it("has no em dashes in the script", () => {
    const all = [
      ...summitBeatsBeforeChoice(),
      ...summitBeatsAfterChoice("humble"),
    ]
      .map((b) => JSON.stringify(b))
      .join("");
    expect(all.includes("\u2014")).toBe(false);
  });
});
