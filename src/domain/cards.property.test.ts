import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  NAME_MAX_LENGTH,
  moveCard,
  renameCard,
  renameStack,
  setCardHidden,
  visibleCards,
} from "./cards";
import type { Card, Debt, Item, Sale, Stack } from "./types";
import { isStack } from "../storage/isStack";

// ---------------------------------------------------------------------------
// Shared generators (reused by later property tests in this file)
// ---------------------------------------------------------------------------

const DATE = "2024-01-01";

const itemArb = (id: string): fc.Arbitrary<Item> =>
  fc.record({
    id: fc.constant(id),
    name: fc.string({ minLength: 1, maxLength: 10 }),
    quantity: fc.integer({ min: 0, max: 1000 }),
    costPrice: fc.integer({ min: 0, max: 1_000_000 }),
    sellPrice: fc.integer({ min: 0, max: 1_000_000 }),
    lowStockLevel: fc.integer({ min: 0, max: 20 }),
  });

const saleArb = (id: string): fc.Arbitrary<Sale> =>
  fc.record({
    id: fc.constant(id),
    itemId: fc.string({ minLength: 1, maxLength: 6 }),
    quantity: fc.integer({ min: 1, max: 100 }),
    unitPrice: fc.integer({ min: 0, max: 1_000_000 }),
    unitCost: fc.integer({ min: 0, max: 1_000_000 }),
    time: fc.constant(`${DATE}T10:00:00.000Z`),
  });

const debtArb = (id: string): fc.Arbitrary<Debt> =>
  fc.record({
    id: fc.constant(id),
    customer: fc.string({ minLength: 1, maxLength: 10 }),
    amount: fc.integer({ min: 1, max: 1_000_000 }),
    date: fc.constant(DATE),
    status: fc.constantFrom("unpaid" as const, "paid" as const),
  });

function listArb<T>(
  make: (id: string) => fc.Arbitrary<T>,
  prefix: string,
): fc.Arbitrary<T[]> {
  return fc
    .integer({ min: 0, max: 4 })
    .chain((n) =>
      fc.tuple(...Array.from({ length: n }, (_, i) => make(`${prefix}-${i}`))),
    );
}

const hiddenArb = fc.constantFrom<boolean | undefined>(undefined, true, false);

/** A card with a unique id ("card-<index>") and an optional hidden flag. */
const cardArb = (index: number): fc.Arbitrary<Card> => {
  const id = `card-${index}`;
  const title = fc.string({ minLength: 1, maxLength: 20 });
  const withHidden = (card: Card, hidden: boolean | undefined): Card =>
    hidden === undefined ? card : { ...card, hidden };
  return fc.oneof(
    fc
      .tuple(title, listArb(itemArb, `${id}-item`), hiddenArb)
      .map(([t, items, h]) =>
        withHidden({ id, type: "stock", title: t, items }, h),
      ),
    fc
      .tuple(title, listArb(saleArb, `${id}-sale`), hiddenArb)
      .map(([t, sales, h]) =>
        withHidden({ id, type: "sales-log", title: t, sales }, h),
      ),
    fc
      .tuple(title, listArb(debtArb, `${id}-debt`), hiddenArb)
      .map(([t, debts, h]) =>
        withHidden({ id, type: "debts", title: t, debts }, h),
      ),
    fc
      .tuple(title, hiddenArb)
      .map(([t, h]) =>
        withHidden({ id, type: "daily-summary", title: t }, h),
      ),
  );
};

/**
 * A valid Stack: 1 to 8 cards with unique ids, filled Items, Sales and Debts,
 * some cards hidden, and at least one card always visible.
 */
export const stackArb: fc.Arbitrary<Stack> = fc
  .integer({ min: 1, max: 8 })
  .chain((n) =>
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.tuple(...Array.from({ length: n }, (_, i) => cardArb(i))),
      fc.integer({ min: 0, max: n - 1 }),
    ),
  )
  .map(([name, cards, keepVisible]) => {
    const fixed = cards.map((c, i) => {
      if (i !== keepVisible) return c;
      const { hidden: _drop, ...rest } = c;
      return rest as Card;
    });
    return {
      schemaVersion: 1,
      id: "stack-1",
      name,
      currency: "NGN",
      cards: fixed,
    } satisfies Stack;
  });

/** Picks the id of an existing card in the given Stack. */
export const cardIdArb = (stack: Stack): fc.Arbitrary<string> =>
  fc.constantFrom(...stack.cards.map((c) => c.id));

/** Gives an id that matches no card in the given Stack. */
export const absentIdArb = (stack: Stack): fc.Arbitrary<string> =>
  fc
    .string({ maxLength: 12 })
    .filter((id) => !stack.cards.some((c) => c.id === id));

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Property 1: name validation
// ---------------------------------------------------------------------------

const padArb = fc
  .array(fc.constantFrom(" ", "\t", "\n"), { maxLength: 4 })
  .map((a) => a.join(""));

const wordArb = (min: number, max: number) =>
  fc
    .array(fc.constantFrom(..."abcXYZ019 -'"), { minLength: min, maxLength: max })
    .map((a) => a.join(""))
    .filter((s) => s.trim().length === s.length);

const blankArb = fc
  .array(fc.constantFrom(" ", "\t", "\n", "\r"), { maxLength: 10 })
  .map((a) => a.join(""));

const nonStringArb = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.integer(),
  fc.boolean(),
  fc.array(fc.string(), { maxLength: 3 }),
  fc.record({ a: fc.string() }),
);

const tooLongArb = fc
  .tuple(padArb, wordArb(NAME_MAX_LENGTH + 1, 80), padArb)
  .map(([a, w, b]) => a + w + b);

const validArb = fc
  .tuple(padArb, wordArb(1, NAME_MAX_LENGTH), padArb)
  .map(([a, w, b]) => ({ raw: a + w + b, trimmed: w }));

function titleOf(stack: Stack, cardId: string): string | undefined {
  return stack.cards.find((c) => c.id === cardId)?.title;
}

describe("Property 1: name validation is consistent for renameStack and renameCard", () => {
  it("**Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 13.9** blank or non-string names give NAME_REQUIRED", () => {
    fc.assert(
      fc.property(
        stackArb,
        fc.nat(),
        fc.oneof(blankArb, nonStringArb),
        (stack, pick, bad) => {
          const cardId = stack.cards[pick % stack.cards.length].id;
          const a = renameStack(stack, bad);
          const b = renameCard(stack, cardId, bad);
          expect(a.ok).toBe(false);
          expect(b.ok).toBe(false);
          if (!a.ok) expect(a.error.code).toBe("NAME_REQUIRED");
          if (!b.ok) expect(b.error.code).toBe("NAME_REQUIRED");
        },
      ),
      { numRuns: 200 },
    );
  });

  it("**Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 13.9** names over 40 trimmed characters give NAME_TOO_LONG", () => {
    fc.assert(
      fc.property(stackArb, fc.nat(), tooLongArb, (stack, pick, bad) => {
        const cardId = stack.cards[pick % stack.cards.length].id;
        const a = renameStack(stack, bad);
        const b = renameCard(stack, cardId, bad);
        expect(a.ok).toBe(false);
        expect(b.ok).toBe(false);
        if (!a.ok) expect(a.error.code).toBe("NAME_TOO_LONG");
        if (!b.ok) expect(b.error.code).toBe("NAME_TOO_LONG");
      }),
      { numRuns: 200 },
    );
  });

  it("**Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 13.9** other names are stored trimmed", () => {
    fc.assert(
      fc.property(stackArb, fc.nat(), validArb, (stack, pick, good) => {
        const cardId = stack.cards[pick % stack.cards.length].id;
        const a = renameStack(stack, good.raw);
        const b = renameCard(stack, cardId, good.raw);
        expect(a.ok).toBe(true);
        expect(b.ok).toBe(true);
        if (a.ok) expect(a.value.name).toBe(good.trimmed);
        if (b.ok) expect(titleOf(b.value, cardId)).toBe(good.trimmed);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: renameCard changes only the targeted Card's title
// ---------------------------------------------------------------------------

describe("Property 2: renameCard changes only the targeted Card's title", () => {
  it("**Validates: Requirements 1.4, 1.9, 13.12** only the target title changes, and renaming twice gives the same Stack", () => {
    fc.assert(
      fc.property(stackArb, fc.nat(), validArb, (stack, pick, good) => {
        const cardId = stack.cards[pick % stack.cards.length].id;
        const first = renameCard(stack, cardId, good.raw);
        expect(first.ok).toBe(true);
        if (!first.ok) return;
        const next = first.value;

        // Stack-level fields and card order are unchanged.
        expect(next.name).toBe(stack.name);
        expect(next.id).toBe(stack.id);
        expect(next.currency).toBe(stack.currency);
        expect(next.schemaVersion).toBe(stack.schemaVersion);
        expect(next.cards.map((c) => c.id)).toEqual(stack.cards.map((c) => c.id));

        for (let i = 0; i < stack.cards.length; i++) {
          const before = stack.cards[i];
          const after = next.cards[i];
          if (before.id === cardId) {
            expect(after.title).toBe(good.trimmed);
            expect(after).toEqual({ ...before, title: good.trimmed });
          } else {
            expect(after).toEqual(before);
          }
        }

        // Idempotence: the same name applied again gives an equal Stack.
        const second = renameCard(next, cardId, good.raw);
        expect(second.ok).toBe(true);
        if (second.ok) expect(second.value).toEqual(next);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: moveCard swaps a Card with its neighbour, counting hidden cards
// ---------------------------------------------------------------------------

describe("Property 3: moveCard swaps a Card with its neighbour, counting hidden cards", () => {
  const dirArb = fc.constantFrom("up" as const, "down" as const);

  it("**Validates: Requirements 2.2, 2.3, 4.4, 13.3** target and neighbour swap, all others keep place, hidden cards counted", () => {
    fc.assert(
      fc.property(
        stackArb,
        fc.nat(),
        dirArb,
        fc.boolean(),
        fc.boolean(),
        (base, pick, direction, hideTarget, hideNeighbour) => {
          const index = pick % base.cards.length;
          const other = direction === "up" ? index - 1 : index + 1;
          // Force hidden flags on the target and neighbour when they exist.
          const cards = base.cards.map((c, i) =>
            (i === index && hideTarget) || (i === other && hideNeighbour)
              ? ({ ...c, hidden: true } as Card)
              : c,
          );
          const stack = deepFreeze({ ...base, cards });
          const cardId = stack.cards[index].id;
          const result = moveCard(stack, cardId, direction);

          if (other < 0 || other >= stack.cards.length) {
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error.code).toBe("CANNOT_MOVE_FURTHER");
            }
            return;
          }
          expect(result.ok).toBe(true);
          if (!result.ok) return;
          const next = result.value;
          expect(next.cards).toHaveLength(stack.cards.length);
          expect(next.cards[other]).toEqual(stack.cards[index]);
          expect(next.cards[index]).toEqual(stack.cards[other]);
          for (let i = 0; i < stack.cards.length; i++) {
            if (i !== index && i !== other) {
              expect(next.cards[i]).toEqual(stack.cards[i]);
            }
          }
          expect(next.name).toBe(stack.name);
          expect(next.id).toBe(stack.id);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("**Validates: Requirements 2.2, 2.3, 4.4, 13.3** cards at the ends give CANNOT_MOVE_FURTHER", () => {
    fc.assert(
      fc.property(stackArb, (stack) => {
        const first = moveCard(stack, stack.cards[0].id, "up");
        const last = moveCard(
          stack,
          stack.cards[stack.cards.length - 1].id,
          "down",
        );
        expect(first.ok).toBe(false);
        expect(last.ok).toBe(false);
        if (!first.ok) expect(first.error.code).toBe("CANNOT_MOVE_FURTHER");
        if (!last.ok) expect(last.error.code).toBe("CANNOT_MOVE_FURTHER");
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: moving a Card and moving it back returns the original Stack
// ---------------------------------------------------------------------------

describe("Property 4: moving a Card up then down (or down then up) returns the original Stack", () => {
  it("**Validates: Requirements 2.7, 2.8, 13.3** a successful move followed by the opposite move gives back the original Stack", () => {
    fc.assert(
      fc.property(
        stackArb,
        fc.nat(),
        fc.constantFrom("up" as const, "down" as const),
        (stack, pick, direction) => {
          const cardId = stack.cards[pick % stack.cards.length].id;
          const opposite = direction === "up" ? "down" : "up";
          const first = moveCard(stack, cardId, direction);
          // Only cards with a neighbour in the first direction are in scope.
          fc.pre(first.ok);
          if (!first.ok) return;
          const back = moveCard(first.value, cardId, opposite);
          expect(back.ok).toBe(true);
          if (back.ok) expect(back.value).toEqual(stack);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: invalid moveCard direction is rejected
// ---------------------------------------------------------------------------

describe("Property 5: invalid moveCard direction is rejected", () => {
  const badDirectionArb = fc
    .oneof(
      fc.string(),
      fc.constantFrom("UP", "Down", " up", "down ", "left", "right", ""),
      nonStringArb,
      fc.double(),
    )
    .filter((d) => d !== "up" && d !== "down");

  it("**Validates: Requirements 2.6** any direction other than up or down gives BAD_DIRECTION and leaves the Stack unchanged", () => {
    fc.assert(
      fc.property(stackArb, fc.nat(), badDirectionArb, (base, pick, bad) => {
        const stack = deepFreeze(base);
        const snapshot = structuredClone(base);
        const cardId = stack.cards[pick % stack.cards.length].id;
        const result = moveCard(stack, cardId, bad);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("BAD_DIRECTION");
        expect(stack).toEqual(snapshot);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: setCardHidden keeps one Card visible and changes only its target
// ---------------------------------------------------------------------------

describe("Property 7: setCardHidden can only hide a Card when another Card stays visible, and only changes the targeted Card's hidden flag", () => {
  const isShown = (c: Card) => c.hidden !== true;

  /** Stacks where exactly one card is visible (every other card hidden). */
  const oneVisibleStackArb: fc.Arbitrary<Stack> = fc
    .tuple(stackArb, fc.nat())
    .map(([base, pick]) => {
      const keep = pick % base.cards.length;
      const cards = base.cards.map((c, i) => {
        if (i !== keep) return { ...c, hidden: true } as Card;
        const { hidden: _drop, ...rest } = c;
        return rest as Card;
      });
      return { ...base, cards };
    });

  const anyStackArb = fc.oneof(stackArb, oneVisibleStackArb);

  it("**Validates: Requirements 3.2, 3.3, 3.4, 3.7, 3.8, 13.13, 13.14** hiding and showing follow the rules and touch only the target", () => {
    fc.assert(
      fc.property(anyStackArb, fc.nat(), fc.boolean(), (base, pick, hide) => {
        const stack = deepFreeze(structuredClone(base));
        const index = pick % stack.cards.length;
        const target = stack.cards[index];
        const result = setCardHidden(stack, target.id, hide);

        const othersVisible = stack.cards.some(
          (c, i) => i !== index && isShown(c),
        );

        if (hide && !othersVisible) {
          expect(result.ok).toBe(false);
          if (!result.ok) expect(result.error.code).toBe("MUST_STAY_VISIBLE");
          return;
        }

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const next = result.value;
        expect(next.cards).toHaveLength(stack.cards.length);
        expect({ ...next, cards: [] }).toEqual({ ...stack, cards: [] });
        for (let i = 0; i < stack.cards.length; i++) {
          if (i !== index) {
            expect(next.cards[i]).toEqual(stack.cards[i]);
          }
        }
        const after = next.cards[index];
        const { hidden: _h, ...restBefore } = target;
        const { hidden: _a, ...restAfter } = after;
        expect(restAfter).toEqual(restBefore);
        if (hide) {
          expect(after.hidden).toBe(true);
        } else {
          expect("hidden" in after).toBe(false);
        }
        // At least one card is still visible.
        expect(next.cards.some(isShown)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("**Validates: Requirements 3.7, 13.13** hiding then showing a card with no hidden flag returns the original Stack", () => {
    fc.assert(
      fc.property(anyStackArb, fc.nat(), (stack, pick) => {
        const index = pick % stack.cards.length;
        const target = stack.cards[index];
        fc.pre(!("hidden" in target));
        const hiddenR = setCardHidden(stack, target.id, true);
        // Hiding can fail only when the target is the single visible card.
        if (!hiddenR.ok) {
          expect(hiddenR.error.code).toBe("MUST_STAY_VISIBLE");
          return;
        }
        const shownR = setCardHidden(hiddenR.value, target.id, false);
        expect(shownR.ok).toBe(true);
        if (shownR.ok) expect(shownR.value).toEqual(stack);
      }),
      { numRuns: 200 },
    );
  });

  it("**Validates: Requirements 3.8, 13.14** asking for the state a card already has returns an equal Stack", () => {
    fc.assert(
      fc.property(anyStackArb, fc.nat(), (stack, pick) => {
        const index = pick % stack.cards.length;
        const target = stack.cards[index];
        const alreadyHidden = target.hidden === true;
        const result = setCardHidden(stack, target.id, alreadyHidden);
        if (alreadyHidden) {
          // Other visible cards exist because the target is hidden.
          expect(result.ok).toBe(true);
          if (result.ok) expect(result.value).toEqual(stack);
        } else {
          // Showing a visible card: only a stray `hidden:false` key may go.
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.value.cards[index].hidden).toBeUndefined();
            expect(result.value.cards.map(isShown)).toEqual(
              stack.cards.map(isShown),
            );
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: setCardHidden rejects non-boolean hidden values
// ---------------------------------------------------------------------------

describe("Property 8: setCardHidden rejects any non-boolean hidden value and leaves the Stack unchanged", () => {
  const nonBooleanArb = fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.integer(),
    fc.double(),
    fc.string(),
    fc.array(fc.boolean(), { maxLength: 3 }),
    fc.record({ hidden: fc.boolean() }),
  );

  it("**Validates: Requirements 3.6** returns BAD_HIDDEN_VALUE and does not change the Stack", () => {
    fc.assert(
      fc.property(stackArb, fc.nat(), nonBooleanArb, (base, pick, value) => {
        const stack = deepFreeze(structuredClone(base));
        const target = stack.cards[pick % stack.cards.length];
        const result = setCardHidden(stack, target.id, value);

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("BAD_HIDDEN_VALUE");
        expect(stack).toEqual(base);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: an unknown card id is rejected the same way by every
// card-targeting Builder_Function
// ---------------------------------------------------------------------------

describe("Property 6: an unknown card id gives CARD_NOT_FOUND from renameCard, moveCard and setCardHidden", () => {
  const unknownCaseArb = stackArb.chain((stack) =>
    fc.tuple(
      fc.constant(stack),
      absentIdArb(stack),
      validArb,
      fc.constantFrom("up" as const, "down" as const),
      fc.boolean(),
    ),
  );

  it("**Validates: Requirements 1.8, 2.5, 3.5** all three functions return CARD_NOT_FOUND and leave the Stack unchanged", () => {
    fc.assert(
      fc.property(unknownCaseArb, ([base, missingId, good, direction, hide]) => {
        const stack = deepFreeze(structuredClone(base));
        const results = [
          renameCard(stack, missingId, good.raw),
          moveCard(stack, missingId, direction),
          setCardHidden(stack, missingId, hide),
        ];
        for (const result of results) {
          expect(result.ok).toBe(false);
          if (!result.ok) expect(result.error.code).toBe("CARD_NOT_FOUND");
        }
        expect(stack).toEqual(base);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: visibleCards returns exactly the visible Cards, in order,
// without changing the Stack
// ---------------------------------------------------------------------------

describe("Property 14: visibleCards returns exactly the visible Cards, in order, without changing the Stack", () => {
  it("**Validates: Requirements 17.2, 17.3, 17.5** returns the cards with hidden !== true in Stack order, leaves a frozen Stack unchanged, and is non-empty when a card is visible", () => {
    fc.assert(
      fc.property(stackArb, (base) => {
        const stack = deepFreeze(structuredClone(base));
        const result = visibleCards(stack);

        const expected = stack.cards.filter((c) => c.hidden !== true);
        expect(result.map((c) => c.id)).toEqual(expected.map((c) => c.id));
        expect(result).toEqual(expected);
        expect(result.every((c) => c.hidden !== true)).toBe(true);

        // Stack is unchanged.
        expect(stack).toEqual(base);

        if (stack.cards.some((c) => c.hidden !== true)) {
          expect(result.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Builder_Functions never change any Item, Sale or Debt, and
// preserve Stack and Card identity on success
// ---------------------------------------------------------------------------

describe("Property 9: Builder_Functions never change any Item, Sale or Debt, and preserve Stack and Card identity on success", () => {
  const anyNameArb = fc.oneof(
    validArb.map((v) => v.raw),
    blankArb,
    nonStringArb,
    tooLongArb,
  );
  const anyDirectionArb = fc.oneof(
    fc.constantFrom<unknown>("up", "down"),
    fc.constantFrom<unknown>("left", "UP", "", 1, null, undefined),
  );
  const anyHiddenArb = fc.oneof(
    fc.boolean(),
    fc.constantFrom<unknown>("true", 0, 1, null, undefined, {}),
  );

  const callArb = stackArb.chain((stack) =>
    fc.tuple(
      fc.constant(stack),
      fc.oneof(cardIdArb(stack), absentIdArb(stack)),
      anyNameArb,
      anyNameArb,
      anyDirectionArb,
      anyHiddenArb,
    ),
  );

  function records(stack: Stack) {
    return stack.cards.map((c) => ({
      id: c.id,
      items: "items" in c ? c.items : undefined,
      sales: "sales" in c ? c.sales : undefined,
      debts: "debts" in c ? c.debts : undefined,
    }));
  }

  it("**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 13.1, 13.2, 13.4, 14.1, 14.4** records are never changed, identity is kept on success, and errors leave the input unchanged", () => {
    fc.assert(
      fc.property(
        callArb,
        ([base, cardId, stackName, cardTitle, direction, hidden]) => {
          const snapshot = structuredClone(base);
          const stack = deepFreeze(structuredClone(base));
          const outcomes = [
            { fn: "renameStack", r: renameStack(stack, stackName) },
            { fn: "renameCard", r: renameCard(stack, cardId, cardTitle) },
            { fn: "moveCard", r: moveCard(stack, cardId, direction) },
            { fn: "setCardHidden", r: setCardHidden(stack, cardId, hidden) },
          ];

          for (const { fn, r } of outcomes) {
            if (!r.ok) {
              expect(stack).toEqual(snapshot);
              continue;
            }
            const next = r.value;
            expect(next.id).toBe(snapshot.id);
            expect(next.currency).toBe(snapshot.currency);
            expect(next.cards).toHaveLength(snapshot.cards.length);

            // Every Item, Sale and Debt is deep-equal to its counterpart.
            const before = records(snapshot);
            const after = records(next);
            for (const b of before) {
              expect(after.find((a) => a.id === b.id)).toEqual(b);
            }

            const idsBefore = snapshot.cards.map((c) => c.id);
            const idsAfter = next.cards.map((c) => c.id);
            if (fn === "moveCard") {
              expect([...idsAfter].sort()).toEqual([...idsBefore].sort());
              for (const c of snapshot.cards) {
                expect(next.cards.find((n) => n.id === c.id)?.type).toBe(
                  c.type,
                );
              }
            } else {
              expect(idsAfter).toEqual(idsBefore);
              expect(next.cards.map((c) => c.type)).toEqual(
                snapshot.cards.map((c) => c.type),
              );
            }
          }
          // No call changed the (frozen) input.
          expect(stack).toEqual(snapshot);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Builder_Functions never throw on or mutate a frozen Stack
// ---------------------------------------------------------------------------

describe("Property 10: Builder_Functions never throw on or mutate a frozen Stack", () => {
  const anyValueArb = fc.oneof(
    validArb.map((v) => v.raw),
    blankArb,
    tooLongArb,
    nonStringArb,
    fc.string(),
    fc.double(),
    fc.boolean(),
    fc.constantFrom<unknown>("up", "down", "left", "UP", "", {}, []),
  );

  const callArb = stackArb.chain((stack) =>
    fc.tuple(
      fc.constant(stack),
      fc.oneof(cardIdArb(stack), absentIdArb(stack)),
      anyValueArb,
      anyValueArb,
      anyValueArb,
      anyValueArb,
    ),
  );

  it("**Validates: Requirements 4.5, 4.7, 13.6** all four functions complete without throwing and leave the frozen Stack deep-equal to its snapshot", () => {
    fc.assert(
      fc.property(
        callArb,
        ([base, cardId, nameArg, titleArg, directionArg, hiddenArg]) => {
          const snapshot = structuredClone(base);
          const stack = deepFreeze(structuredClone(base));

          expect(() => renameStack(stack, nameArg)).not.toThrow();
          expect(() => renameCard(stack, cardId, titleArg)).not.toThrow();
          expect(() => moveCard(stack, cardId, directionArg)).not.toThrow();
          expect(() => setCardHidden(stack, cardId, hiddenArg)).not.toThrow();

          expect(stack).toEqual(snapshot);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: at least one Card stays visible through any sequence of
// Builder_Function calls
// ---------------------------------------------------------------------------

describe("Property 16: at least one Card stays visible through any sequence of Builder_Function calls", () => {
  type Step =
    | { tag: "renameStack"; name: unknown }
    | { tag: "renameCard"; pick: number; useAbsent: boolean; title: unknown }
    | { tag: "moveCard"; pick: number; useAbsent: boolean; direction: unknown }
    | { tag: "setCardHidden"; pick: number; useAbsent: boolean; hidden: unknown };

  const nameArg = fc.oneof(
    validArb.map((v) => v.raw),
    blankArb,
    tooLongArb,
    nonStringArb,
  );
  const directionArg = fc.oneof(
    fc.constantFrom<unknown>("up", "down"),
    fc.constantFrom<unknown>("left", "UP", "", 1, null, undefined),
  );
  const hiddenArg = fc.oneof(
    fc.boolean(),
    fc.boolean(),
    fc.constantFrom<unknown>("true", 0, 1, null, undefined),
  );

  const stepArb: fc.Arbitrary<Step> = fc.oneof(
    nameArg.map((name) => ({ tag: "renameStack" as const, name })),
    fc
      .tuple(fc.nat(), fc.boolean(), nameArg)
      .map(([pick, useAbsent, title]) => ({
        tag: "renameCard" as const,
        pick,
        useAbsent,
        title,
      })),
    fc
      .tuple(fc.nat(), fc.boolean(), directionArg)
      .map(([pick, useAbsent, direction]) => ({
        tag: "moveCard" as const,
        pick,
        useAbsent,
        direction,
      })),
    fc
      .tuple(fc.nat(), fc.boolean(), hiddenArg)
      .map(([pick, useAbsent, hidden]) => ({
        tag: "setCardHidden" as const,
        pick,
        useAbsent,
        hidden,
      })),
  );

  it("**Validates: Requirements 4.6, 13.5** every step leaves at least one visible Card", () => {
    fc.assert(
      fc.property(
        stackArb,
        fc.array(stepArb, { minLength: 1, maxLength: 15 }),
        (initial, steps) => {
          let stack = initial;
          expect(visibleCards(stack).length).toBeGreaterThanOrEqual(1);
          for (const step of steps) {
            const cardId = step.tag === "renameStack"
              ? ""
              : step.useAbsent
                ? "missing-card"
                : stack.cards[step.pick % stack.cards.length].id;
            let result;
            switch (step.tag) {
              case "renameStack":
                result = renameStack(stack, step.name);
                break;
              case "renameCard":
                result = renameCard(stack, cardId, step.title);
                break;
              case "moveCard":
                result = moveCard(stack, cardId, step.direction);
                break;
              case "setCardHidden":
                result = setCardHidden(stack, cardId, step.hidden);
                break;
            }
            if (result.ok) stack = result.value;
            expect(visibleCards(stack).length).toBeGreaterThanOrEqual(1);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: a successful Builder_Function call keeps one Card visible and
// gives a Stack that isStack accepts
// ---------------------------------------------------------------------------

describe("Property 11: a successful Builder_Function call keeps at least one Card visible and the result is accepted by isStack", () => {
  const nameArg = fc.oneof(
    validArb.map((v) => v.raw),
    blankArb,
    tooLongArb,
    nonStringArb,
  );
  const directionArg = fc.oneof(
    fc.constantFrom<unknown>("up", "down"),
    fc.constantFrom<unknown>("left", "UP", "", 1, null, undefined),
  );
  const hiddenArg = fc.oneof(
    fc.boolean(),
    fc.constantFrom<unknown>("true", 0, 1, null, undefined),
  );

  const callArb = stackArb.chain((stack) =>
    fc.tuple(
      fc.constant(stack),
      fc.oneof(cardIdArb(stack), absentIdArb(stack)),
      nameArg,
      nameArg,
      directionArg,
      hiddenArg,
    ),
  );

  it("**Validates: Requirements 4.6, 4.9, 13.11** every successful result has a visible Card and passes isStack", () => {
    fc.assert(
      fc.property(
        callArb,
        ([stack, cardId, stackName, cardTitle, direction, hidden]) => {
          expect(isStack(stack)).toBe(true);
          const results = [
            renameStack(stack, stackName),
            renameCard(stack, cardId, cardTitle),
            moveCard(stack, cardId, direction),
            setCardHidden(stack, cardId, hidden),
          ];
          for (const r of results) {
            if (!r.ok) continue;
            expect(visibleCards(r.value).length).toBeGreaterThanOrEqual(1);
            expect(isStack(r.value)).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
