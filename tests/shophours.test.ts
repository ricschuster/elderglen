import { describe, expect, it } from "vitest";
import { newGame } from "../src/core/save";
import { counterShutLine, doorShutLine } from "../src/core/shophours";

const at = (h: number) => h * 60;
// Day 1 is Mon spring 1. Spring 21 (day 21) is a Sun with a noon to 6 pm festival.
function when(day: number, h: number, weather: "sunny" | "rainy" = "sunny") {
  const g = newGame();
  g.day.clock.day = day;
  g.day.clock.minutes = at(h);
  g.weather = weather;
  return g;
}

describe("counter hours", () => {
  it("opens the general store counter in the day and shuts it before and after", () => {
    expect(counterShutLine(when(1, 10), "general-store", "shop")).toBe("");
    expect(counterShutLine(when(1, 7), "general-store", "shop")).toMatch(
      /opens at 9:00 am/,
    );
    expect(counterShutLine(when(1, 18), "general-store", "shop")).toMatch(
      /Only the door is open/,
    );
    expect(counterShutLine(when(1, 22), "general-store", "shop")).toMatch(
      /shut for the day/,
    );
  });

  it("shuts a counter on its closed weekday and opens some in rain", () => {
    // Wed is day 3: the store is closed, the sawmill (Tue, day 2) opens in rain.
    expect(counterShutLine(when(3, 10), "general-store", "shop")).toMatch(
      /shut today/,
    );
    expect(counterShutLine(when(2, 10), "sawmill", "carpenter")).toMatch(
      /shut today/,
    );
    expect(counterShutLine(when(2, 10, "rainy"), "sawmill", "carpenter")).toBe(
      "",
    );
  });

  it("shuts every shop during festival hours", () => {
    expect(counterShutLine(when(21, 11), "library", "counter-library")).toBe(
      "",
    );
    expect(counterShutLine(when(21, 13), "library", "counter-library")).toMatch(
      /shut for the/,
    );
  });

  it("keeps no hours for a counter that has none listed", () => {
    expect(counterShutLine(when(1, 3), "hall", "hall")).toBe("");
  });

  it("keeps the forge open daily and long", () => {
    expect(counterShutLine(when(3, 12), "forge", "smith")).toBe("");
    expect(counterShutLine(when(1, 20), "forge", "smith")).not.toBe("");
  });
});

describe("shop doors", () => {
  it("lock a Hearthwell shop door outside its door hours only", () => {
    expect(doorShutLine(when(1, 18), "general-store")).toBe("");
    expect(doorShutLine(when(1, 22), "general-store")).toMatch(
      /shut for the day/,
    );
    expect(doorShutLine(when(1, 7), "general-store")).toMatch(/opens at/);
    expect(doorShutLine(when(3, 12), "general-store")).toMatch(/shut today/);
    expect(doorShutLine(when(1, 22), "somewhere-else")).toBe("");
  });
});
