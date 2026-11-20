import { describe, expect, it } from "vitest";
import { bedNotice } from "../src/core/bednotice";

describe("bedNotice", () => {
  it("tells a player in bed who is left", () => {
    expect(bedNotice({ asleep: ["Host"], waiting: ["Ann", "Bo"] }, true)).toBe(
      "You are in bed. Waiting for Ann and Bo. Action gets you up.",
    );
    expect(bedNotice({ asleep: ["Host"], waiting: [] }, true)).toBe(
      "You are in bed.",
    );
  });
  it("tells a player who is up who is in bed", () => {
    expect(bedNotice({ asleep: ["Ann"], waiting: ["Host"] }, false)).toBe(
      "Ann is in bed. The day ends when everyone is.",
    );
    expect(
      bedNotice({ asleep: ["A", "B"], waiting: ["Host"] }, false),
    ).toContain("A and B are in bed");
    expect(bedNotice({ asleep: [], waiting: ["Host"] }, false)).toBe("");
  });
});
