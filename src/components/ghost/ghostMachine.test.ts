import { describe, expect, it } from "vitest";
import { initialState, next } from "./ghostMachine";
import type { GhostEvent, GhostMood, GhostState } from "./ghostTypes";

// The module name is built at run time because the project has no Node type package.
type Fs = { readFileSync(path: URL, encoding: "utf8"): string };
const fs = (await import(/* @vite-ignore */ ["node", "fs"].join(":"))) as Fs;

const source = fs.readFileSync(new URL("./ghostMachine.ts", import.meta.url), "utf8");

function st(mood: GhostMood, nightcap = false, sleepy = false): GhostState {
  return { mood, nightcap, sleepy };
}

describe("initialState", () => {
  it("starts idle, awake, with the nightcap following midnight", () => {
    expect(initialState(false)).toEqual(st("idle", false, false));
    expect(initialState(true)).toEqual(st("idle", true, false));
  });
});

describe("transition table", () => {
  const rows: [string, GhostEvent, GhostState, GhostState][] = [
    ["appOpened", { type: "appOpened" }, st("idle"), st("wave")],
    ["saleRecorded", { type: "saleRecorded" }, st("idle"), st("cheer")],
    ["debtPaid", { type: "debtPaid" }, st("think", false, true), st("cheer")],
    ["debtAdded", { type: "debtAdded" }, st("idle"), st("think")],
    ["errorShown", { type: "errorShown" }, st("wave"), st("sorry")],
    ["emptyScreen", { type: "emptyScreen" }, st("idle"), st("point")],
    ["poked", { type: "poked" }, st("cheer"), st("giggle")],
    ["poked from sleep", { type: "poked" }, st("sleep"), st("giggle")],
    [
      "midnightToggled on",
      { type: "midnightToggled", on: true },
      st("idle", false),
      st("spin", true),
    ],
    [
      "midnightToggled off",
      { type: "midnightToggled", on: false },
      st("wave", true),
      st("spin", false),
    ],
    ["idleTimeout from idle", { type: "idleTimeout" }, st("idle"), st("sleep")],
    ["idleTimeout from sleep", { type: "idleTimeout" }, st("sleep"), st("sleep")],
    ["idleTimeout from busy", { type: "idleTimeout" }, st("wave"), st("wave", false, true)],
    ["animationDone from sleep", { type: "animationDone" }, st("sleep"), st("idle")],
    ["animationDone from idle", { type: "animationDone" }, st("idle"), st("idle")],
    ["animationDone from busy", { type: "animationDone" }, st("point"), st("idle")],
    [
      "animationDone from busy and sleepy",
      { type: "animationDone" },
      st("point", false, true),
      st("sleep"),
    ],
  ];

  it.each(rows)("%s", (_name, event, from, to) => {
    expect(next(from, event)).toEqual(to);
  });

  it("keeps the nightcap on every non-midnight event", () => {
    expect(next(st("idle", true), { type: "saleRecorded" }).nightcap).toBe(true);
    expect(next(st("cheer", true), { type: "animationDone" }).nightcap).toBe(true);
    expect(next(st("idle", true), { type: "idleTimeout" }).nightcap).toBe(true);
  });
});

describe("idleTimeout during cheer", () => {
  it("keeps cheer and sets sleepy, then sleeps, then goes idle", () => {
    const cheer = next(st("idle"), { type: "saleRecorded" });
    const sleepy = next(cheer, { type: "idleTimeout" });
    expect(sleepy).toEqual(st("cheer", false, true));
    const asleep = next(sleepy, { type: "animationDone" });
    expect(asleep).toEqual(st("sleep"));
    expect(next(asleep, { type: "animationDone" })).toEqual(st("idle"));
  });
});

describe("poked from sleep", () => {
  it("gives giggle", () => {
    expect(next(st("sleep"), { type: "poked" }).mood).toBe("giggle");
  });
});

describe("purity", () => {
  it("does not change its input", () => {
    const input = Object.freeze(st("cheer", true, true));
    expect(() => next(input, { type: "animationDone" })).not.toThrow();
    expect(input).toEqual(st("cheer", true, true));
  });

  it("source has no clock, randomness, timers or React", () => {
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date");
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("performance");
    expect(source).not.toContain('from "react"');
  });
});
