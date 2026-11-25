import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { isStack } from "./isStack";

const withHidden = (hidden?: unknown, withKey = true) => {
  const card: Record<string, unknown> = { id: "c2", type: "daily-summary", title: "Today" };
  if (withKey) card.hidden = hidden;
  return {
    schemaVersion: 1,
    id: "s1",
    name: "Shop",
    currency: "NGN",
    cards: [card],
  };
};

describe("isStack and Card hidden flag", () => {
  it("accepts a card with no hidden key (Req 5.2)", () => {
    expect(isStack(withHidden(undefined, false))).toBe(true);
  });

  it("accepts hidden: true (Req 5.3)", () => {
    expect(isStack(withHidden(true))).toBe(true);
  });

  it("accepts hidden: false (Req 5.3)", () => {
    expect(isStack(withHidden(false))).toBe(true);
  });

  it('rejects hidden: "yes" (Req 5.4)', () => {
    expect(isStack(withHidden("yes"))).toBe(false);
  });

  it("rejects hidden: null (Req 5.4)", () => {
    expect(isStack(withHidden(null))).toBe(false);
  });

  it("still rejects schemaVersion 2 (Req 5.5)", () => {
    expect(isStack({ ...withHidden(true), schemaVersion: 2 })).toBe(false);
  });
});

// Feature: builder-mode-and-starter-stacks, Property 12: isStack accepts every valid hidden value and rejects every invalid one
// **Validates: Requirements 5.2, 5.3, 5.4, 13.8**
describe("Property 12: isStack and the hidden flag", () => {
  const cardsArb = fc
    .array(fc.constantFrom("stock", "sales-log", "debts", "daily-summary"), {
      minLength: 1,
      maxLength: 8,
    })
    .map((types) =>
      types.map((type, i) => {
        const base = { id: `card-${i}`, type, title: `Card ${i}` };
        if (type === "stock") return { ...base, items: [] };
        if (type === "sales-log") return { ...base, sales: [] };
        if (type === "debts") return { ...base, debts: [] };
        return base;
      }),
    );

  const stackArb = fc.tuple(cardsArb, fc.string({ minLength: 1 })).map(([cards, name]) => ({
    schemaVersion: 1,
    id: "s1",
    name,
    currency: "NGN",
    cards,
  }));

  const validHiddenArb = fc.constantFrom<boolean | undefined>(undefined, true, false);
  const invalidHiddenArb = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.double(),
    fc.constant(null),
    fc.constant([]),
    fc.constant({}),
    fc.array(fc.boolean(), { maxLength: 2 }),
  );

  const overwrite = (
    stack: { cards: Record<string, unknown>[] },
    index: number,
    hidden: unknown,
    remove: boolean,
  ) => {
    const cards = stack.cards.map((c, i) => {
      if (i !== index % stack.cards.length) return c;
      if (remove) {
        const { hidden: _drop, ...rest } = c;
        return rest;
      }
      return { ...c, hidden };
    });
    return { ...stack, cards };
  };

  it("accepts absent, true and false on any one card", () => {
    fc.assert(
      fc.property(stackArb, fc.nat(), validHiddenArb, (stack, index, hidden) => {
        const s = overwrite(stack, index, hidden, hidden === undefined);
        expect(isStack(s)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("accepts a Stack with the flag removed from every card", () => {
    fc.assert(
      fc.property(stackArb, (stack) => {
        const cards = stack.cards.map((c) => {
          const { hidden: _drop, ...rest } = c as Record<string, unknown>;
          return rest;
        });
        expect(isStack({ ...stack, cards })).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects any non-boolean, non-undefined hidden value", () => {
    fc.assert(
      fc.property(stackArb, fc.nat(), invalidHiddenArb, (stack, index, hidden) => {
        expect(isStack(overwrite(stack, index, hidden, false))).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
