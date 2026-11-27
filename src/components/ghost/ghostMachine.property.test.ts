import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { initialState, next } from "./ghostMachine";
import {
  GHOST_MOODS,
  isGhostMood,
  isRestingMood,
  type GhostEvent,
  type GhostState,
} from "./ghostTypes";

const NUM_RUNS = 100;

const eventArb: fc.Arbitrary<GhostEvent> = fc.oneof(
  fc.boolean().map((on): GhostEvent => ({ type: "midnightToggled", on })),
  fc.constantFrom(
    "appOpened",
    "saleRecorded",
    "debtAdded",
    "debtPaid",
    "errorShown",
    "emptyScreen",
    "idleTimeout",
    "poked",
    "animationDone",
  ).map((type): GhostEvent => ({ type }) as GhostEvent),
);

const stateArb: fc.Arbitrary<GhostState> = fc
  .tuple(fc.constantFrom(...GHOST_MOODS), fc.boolean(), fc.boolean())
  .map(([mood, nightcap, sleepy]) => ({
    mood,
    nightcap,
    sleepy: sleepy && !isRestingMood(mood),
  }));

const busyStateArb = stateArb.filter((s) => !isRestingMood(s.mood));
const restingStateArb = stateArb.filter((s) => isRestingMood(s.mood));

function isValid(s: GhostState): boolean {
  return (
    isGhostMood(s.mood) &&
    typeof s.nightcap === "boolean" &&
    typeof s.sleepy === "boolean" &&
    (!s.sleepy || !isRestingMood(s.mood))
  );
}

describe("ghostMachine properties", () => {
  // Feature: ghost-companion, Property 1: any event sequence keeps the state valid
  it("Property 1: any event sequence stays valid", () => {
    // **Validates: Requirements 2.x, 3.x, 13.1**
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.array(eventArb, { maxLength: 50 }),
        (b, events) => {
          let s = initialState(b);
          expect(isValid(s)).toBe(true);
          for (const e of events) {
            s = next(s, e);
            expect(isValid(s)).toBe(true);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ghost-companion, Property 2: never stuck
  it("Property 2: animationDone once or twice reaches idle or sleep", () => {
    // **Validates: Requirements 13.2**
    fc.assert(
      fc.property(stateArb, (s) => {
        const once = next(s, { type: "animationDone" });
        const twice = next(once, { type: "animationDone" });
        expect(["idle", "sleep"]).toContain(once.mood);
        expect(["idle", "sleep"]).toContain(twice.mood);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ghost-companion, Property 3: poked gives giggle then idle
  it("Property 3: poked gives giggle, then animationDone gives idle", () => {
    // **Validates: Requirements 13.3**
    fc.assert(
      fc.property(stateArb, (s) => {
        const g = next(s, { type: "poked" });
        expect(g.mood).toBe("giggle");
        expect(next(g, { type: "animationDone" }).mood).toBe("idle");
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ghost-companion, Property 4: nightcap only changes on midnightToggled
  it("Property 4: nightcap follows midnightToggled only", () => {
    // **Validates: Requirements 13.4**
    fc.assert(
      fc.property(stateArb, eventArb, (s, e) => {
        const n = next(s, e);
        if (e.type === "midnightToggled") {
          expect(n.nightcap).toBe(e.on);
        } else {
          expect(n.nightcap).toBe(s.nightcap);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ghost-companion, Property 5: event to mood table
  it("Property 5: trigger events give the table mood with sleepy false", () => {
    // **Validates: Requirements 2.x, 3.x**
    const table: Record<string, string> = {
      appOpened: "wave",
      saleRecorded: "cheer",
      debtAdded: "think",
      debtPaid: "cheer",
      errorShown: "sorry",
      emptyScreen: "point",
      midnightToggled: "spin",
      poked: "giggle",
    };
    const triggerArb = eventArb.filter((e) => e.type in table);
    fc.assert(
      fc.property(stateArb, triggerArb, (s, e) => {
        const n = next(s, e);
        expect(n.mood).toBe(table[e.type]);
        expect(n.sleepy).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ghost-companion, Property 6: late idleTimeout never cuts a pose
  it("Property 6: idleTimeout does not cut a Busy pose; Resting goes to sleep", () => {
    // **Validates: Requirements 13.7**
    fc.assert(
      fc.property(busyStateArb, (s) => {
        const t = next(s, { type: "idleTimeout" });
        expect(t.mood).toBe(s.mood);
        expect(next(t, { type: "animationDone" }).mood).toBe("sleep");
      }),
      { numRuns: NUM_RUNS },
    );
    fc.assert(
      fc.property(restingStateArb, (s) => {
        expect(next(s, { type: "idleTimeout" }).mood).toBe("sleep");
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ghost-companion, Property 7: next does not mutate its input
  it("Property 7: next does not change a frozen input", () => {
    // **Validates: Requirements 13.1**
    fc.assert(
      fc.property(stateArb, eventArb, (s, e) => {
        const frozen = Object.freeze({ ...s });
        const copy = { ...frozen };
        const frozenEvent = Object.freeze({ ...e }) as GhostEvent;
        expect(() => next(frozen, frozenEvent)).not.toThrow();
        expect({ ...frozen }).toEqual(copy);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
