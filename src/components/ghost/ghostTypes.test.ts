import { describe, expect, it } from "vitest";
import { GHOST_MOODS, isGhostMood, isRestingMood } from "./ghostTypes";

describe("GHOST_MOODS", () => {
  it("has the nine moods", () => {
    expect([...GHOST_MOODS].sort()).toEqual(
      [
        "idle",
        "wave",
        "cheer",
        "think",
        "spin",
        "sorry",
        "point",
        "sleep",
        "giggle",
      ].sort(),
    );
  });

  it("has no repeats", () => {
    expect(new Set(GHOST_MOODS).size).toBe(GHOST_MOODS.length);
  });
});

describe("isGhostMood", () => {
  it.each([...GHOST_MOODS])("is true for %s", (mood) => {
    expect(isGhostMood(mood)).toBe(true);
  });

  it.each(["dance", "", 5])("is false for %j", (value) => {
    expect(isGhostMood(value)).toBe(false);
  });
});

describe("isRestingMood", () => {
  it("is true only for idle and sleep", () => {
    const resting = GHOST_MOODS.filter((m) => isRestingMood(m));
    expect(resting).toEqual(["idle", "sleep"]);
  });
});
