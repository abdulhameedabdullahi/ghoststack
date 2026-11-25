import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  dailyTotal,
  estimatedProfit,
  recordSale,
  salesNewestFirst,
} from "./sales";
import type { IsoString, Item, Sale, Stack } from "./types";

const kobo = fc.integer({ min: 0, max: 100_000_000 });

const item = (id: string): fc.Arbitrary<Item> =>
  fc.record({
    id: fc.constant(id),
    name: fc.string({ minLength: 1, maxLength: 10 }),
    quantity: fc.integer({ min: 0, max: 1000 }),
    costPrice: kobo,
    sellPrice: kobo,
    lowStockLevel: fc.integer({ min: 0, max: 20 }),
  });

const items = fc
  .integer({ min: 1, max: 5 })
  .chain((n) =>
    fc.tuple(...Array.from({ length: n }, (_, i) => item(`item-${i}`))),
  );

const stackArb: fc.Arbitrary<Stack> = items.map((its) => ({
  schemaVersion: 1,
  id: "stack-1",
  name: "Test",
  currency: "NGN",
  cards: [
    { id: "stock", type: "stock", title: "Stock", items: its },
    { id: "sales", type: "sales-log", title: "Sales", sales: [] },
    { id: "debts", type: "debts", title: "Debts", debts: [] },
    { id: "summary", type: "daily-summary", title: "Summary" },
  ],
}));

const quantity = fc.oneof(
  fc.integer({ min: 0, max: 1000 }),
  fc.integer({ min: -1000, max: -1 }),
  fc.integer({ min: 1001, max: 5000 }),
  fc.double({ min: -10, max: 1500, noNaN: true }),
  fc.constantFrom(0, -0, 0.5, NaN, Infinity, -Infinity),
);

const itemId = fc.oneof(
  fc.integer({ min: 0, max: 6 }).map((i) => `item-${i}`),
  fc.constant("missing"),
);

const attempts = fc.array(fc.record({ itemId, quantity }), {
  minLength: 1,
  maxLength: 30,
});

function stockOf(stack: Stack): Item[] {
  const card = stack.cards.find((c) => c.type === "stock");
  return card && card.type === "stock" ? card.items : [];
}

describe("invariant 1: stock never below zero", () => {
  it("**Validates: Requirements 7.2, 7.6, 7.7** keeps every quantity >= 0 and rejects oversize sales unchanged", () => {
    fc.assert(
      fc.property(stackArb, attempts, (start, list) => {
        let stack = start;
        list.forEach((a, n) => {
          const before = structuredClone(stack);
          const available = stockOf(stack).find((i) => i.id === a.itemId);
          const result = recordSale({
            stack,
            stockCardId: "stock",
            salesCardId: "sales",
            itemId: a.itemId,
            quantity: a.quantity,
            saleId: `sale-${n}`,
            time: "2024-01-01T00:00:00.000Z",
          });

          if (
            available &&
            Number.isInteger(a.quantity) &&
            a.quantity > available.quantity
          ) {
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error.code).toBe("NOT_ENOUGH_STOCK");
            }
          }

          if (result.ok) {
            stack = result.value;
          } else {
            expect(stack).toEqual(before);
          }
          // The input is never mutated either way.
          if (!result.ok) expect(stack).toEqual(before);

          for (const i of stockOf(stack)) {
            expect(i.quantity).toBeGreaterThanOrEqual(0);
          }
        });
      }),
      { numRuns: 200 },
    );
  });
});

describe("invariant 2: stock drops by exactly the quantity sold", () => {
  it("**Validates: Requirements 7.3, 7.6, 7.7** reduces only the sold item by exactly the quantity and leaves others unchanged", () => {
    fc.assert(
      fc.property(stackArb, attempts, (start, list) => {
        let stack = start;
        list.forEach((a, n) => {
          const before = stockOf(stack);
          const result = recordSale({
            stack,
            stockCardId: "stock",
            salesCardId: "sales",
            itemId: a.itemId,
            quantity: a.quantity,
            saleId: `sale-${n}`,
            time: "2024-01-01T00:00:00.000Z",
          });
          if (!result.ok) return;

          const after = stockOf(result.value);
          expect(after.length).toBe(before.length);
          for (const old of before) {
            const now = after.find((i) => i.id === old.id);
            expect(now).toBeDefined();
            if (old.id === a.itemId) {
              expect(now!.quantity).toBe(old.quantity - a.quantity);
              expect({ ...now!, quantity: 0 }).toEqual({ ...old, quantity: 0 });
            } else {
              expect(now).toEqual(old);
            }
          }
          stack = result.value;
        });
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Shared generators for the sales-and-daily-summary properties.
// All bounded: quantity 1 to 50, price from `kobo`, short lists, so a list
// never overflows by accident (a single amount is at most 5e9, 10 sales at
// most 5e10).
// ---------------------------------------------------------------------------

const T0 = Date.UTC(2024, 0, 1);
const SPAN_MS = 10 * 24 * 60 * 60 * 1000;

/** A valid ISO 8601 instant, written in UTC or with a +/-hh:mm offset. */
export const arbIsoInstant: fc.Arbitrary<IsoString> = fc
  .tuple(
    fc.integer({ min: T0, max: T0 + SPAN_MS }),
    fc.option(fc.integer({ min: -14 * 60, max: 14 * 60 }), { nil: undefined }),
  )
  .map(([ms, offsetMin]) => {
    if (offsetMin === undefined) return new Date(ms).toISOString();
    const local = new Date(ms + offsetMin * 60_000)
      .toISOString()
      .replace("Z", "");
    const sign = offsetMin < 0 ? "-" : "+";
    const abs = Math.abs(offsetMin);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");
    return `${local}${sign}${hh}:${mm}`;
  });

/** A time string that Date.parse cannot read. */
export const arbUnparseableTime: fc.Arbitrary<IsoString> = fc.constantFrom(
  "",
  "not a time",
  "yesterday",
  "2024-13-45T99:99:99Z",
  "T00:00:00Z",
  "2024-02-30T25:61:00.000Z",
  "abc-def",
);

/** A Sale with bounded quantity and prices. */
export const arbSale = (
  time: fc.Arbitrary<IsoString> = arbIsoInstant,
): fc.Arbitrary<Sale> =>
  fc.record({
    id: fc.uuid(),
    itemId: fc.constantFrom("item-0", "item-1", "item-2"),
    quantity: fc.integer({ min: 1, max: 50 }),
    unitPrice: kobo,
    unitCost: kobo,
    time,
  });

/** A day range with start <= end. */
export const arbDayRange: fc.Arbitrary<{ start: IsoString; end: IsoString }> =
  fc
    .tuple(
      fc.integer({ min: T0, max: T0 + SPAN_MS }),
      fc.integer({ min: T0, max: T0 + SPAN_MS }),
    )
    .map(([a, b]) => ({
      start: new Date(Math.min(a, b)).toISOString(),
      end: new Date(Math.max(a, b)).toISOString(),
    }));

const shortSales = fc.array(arbSale(), { maxLength: 10 });

describe("Property 16: dailyTotal equals the sum of in-range sale amounts", () => {
  it("**Validates: Requirements 1.1, 1.2, 1.3, 1.7, 8.2, 8.7** sums start <= time < end by parsed instant", () => {
    fc.assert(
      fc.property(shortSales, arbDayRange, (generated, range) => {
        // Add Sales exactly on both edges so the half-open window is exercised.
        const edge = (time: IsoString, n: number): Sale => ({
          id: `edge-${n}`,
          itemId: "item-0",
          quantity: 3,
          unitPrice: 7,
          unitCost: 1,
          time,
        });
        const sales = [
          ...generated,
          edge(range.start, 0),
          edge(range.end, 1),
        ];

        const startMs = Date.parse(range.start);
        const endMs = Date.parse(range.end);
        let expected = 0;
        for (const s of sales) {
          const t = Date.parse(s.time);
          if (t >= startMs && t < endMs) expected += s.quantity * s.unitPrice;
        }

        const result = dailyTotal(sales, range.start, range.end);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe(expected);

        // No Sale in range gives 0.
        const outside = dailyTotal(sales, range.end, range.end);
        expect(outside).toEqual({ ok: true, value: 0 });
      }),
      { numRuns: 200 },
    );
  });
});

describe("Property 17: estimatedProfit equals the sum of in-range profit amounts", () => {
  it("**Validates: Requirements 2.1, 2.2, 2.3, 2.8, 8.3, 8.7** sums (unitPrice - unitCost) * quantity for start <= time < end, negatives allowed", () => {
    const mixedSales = fc.array(
      fc.oneof(
        { weight: 4, arbitrary: arbSale() },
        { weight: 1, arbitrary: arbSale(arbUnparseableTime) },
      ),
      { maxLength: 10 },
    );
    fc.assert(
      fc.property(mixedSales, arbDayRange, (generated, range) => {
        // Edge Sales: start is included, end is excluded. Price below cost
        // makes the in-range edge a loss.
        const edge = (time: IsoString, n: number): Sale => ({
          id: `edge-${n}`,
          itemId: "item-0",
          quantity: 3,
          unitPrice: 1,
          unitCost: 7,
          time,
        });
        const sales = [
          ...generated,
          edge(range.start, 0),
          edge(range.end, 1),
        ];

        const startMs = Date.parse(range.start);
        const endMs = Date.parse(range.end);
        let expected = 0;
        for (const s of sales) {
          const t = Date.parse(s.time);
          if (t >= startMs && t < endMs) {
            expected += (s.unitPrice - s.unitCost) * s.quantity;
          }
        }

        const result = estimatedProfit(sales, range.start, range.end);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(Number.isNaN(result.value)).toBe(false);
          expect(result.value).toBe(expected);
        }

        // An empty window counts nothing.
        expect(estimatedProfit(sales, range.end, range.end)).toEqual({
          ok: true,
          value: 0,
        });
      }),
      { numRuns: 200 },
    );
  });
});

/** A UTC instant inside the generated span, used as a split point. */
export const arbSplitInstant: fc.Arbitrary<IsoString> = fc
  .integer({ min: T0, max: T0 + SPAN_MS })
  .map((ms) => new Date(ms).toISOString());

describe("Property 18: Split-point additivity for daily totals and estimated profit", () => {
  it("**Validates: Requirements 8.9** [start,end) equals [start,split) plus [split,end) for a split inside the range", () => {
    fc.assert(
      fc.property(
        shortSales,
        arbDayRange,
        arbSplitInstant,
        (sales, range, rawSplit) => {
          // Move the split point inside [start, end].
          const startMs = Date.parse(range.start);
          const endMs = Date.parse(range.end);
          const splitMs = Math.min(
            Math.max(Date.parse(rawSplit), startMs),
            endMs,
          );
          const split = new Date(splitMs).toISOString();

          const pairs = [
            [dailyTotal, "dailyTotal"],
            [estimatedProfit, "estimatedProfit"],
          ] as const;
          for (const [fn] of pairs) {
            const whole = fn(sales, range.start, range.end);
            const left = fn(sales, range.start, split);
            const right = fn(sales, split, range.end);
            if (!whole.ok || !left.ok || !right.ok) continue;
            expect(left.value + right.value).toBe(whole.value);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("Property 20: Unparseable Sale times never make a total NaN", () => {
  it("**Validates: Requirements 1.8, 2.9, 8.4, 8.11** skips unparseable times and sums only parseable in-range Sales", () => {
    const mixedSales = fc.array(
      fc.oneof(
        { weight: 4, arbitrary: arbSale() },
        { weight: 1, arbitrary: arbSale(arbUnparseableTime) },
      ),
      { maxLength: 10 },
    );
    fc.assert(
      fc.property(mixedSales, arbDayRange, (sales, range) => {
        const startMs = Date.parse(range.start);
        const endMs = Date.parse(range.end);
        let expectedTotal = 0;
        let expectedProfit = 0;
        for (const s of sales) {
          const t = Date.parse(s.time);
          if (Number.isNaN(t)) continue;
          if (t >= startMs && t < endMs) {
            expectedTotal += s.quantity * s.unitPrice;
            expectedProfit += (s.unitPrice - s.unitCost) * s.quantity;
          }
        }

        const total = dailyTotal(sales, range.start, range.end);
        const profit = estimatedProfit(sales, range.start, range.end);
        expect(total.ok).toBe(true);
        expect(profit.ok).toBe(true);
        if (total.ok) {
          expect(Number.isNaN(total.value)).toBe(false);
          expect(total.value).toBe(expectedTotal);
        }
        if (profit.ok) {
          expect(Number.isNaN(profit.value)).toBe(false);
          expect(profit.value).toBe(expectedProfit);
        }
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 21: overflow. Deliberately unbounded generators: amounts near
// Number.MAX_SAFE_INTEGER so sums can pass the safe limit.
// ---------------------------------------------------------------------------

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

const bigNumber = fc.oneof(
  { weight: 3, arbitrary: fc.integer({ min: 0, max: 1000 }) },
  { weight: 2, arbitrary: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }) },
  {
    weight: 3,
    arbitrary: fc
      .integer({ min: 0, max: 1_000_000 })
      .map((d) => Number.MAX_SAFE_INTEGER - d),
  },
);

const bigQuantity = fc.oneof(
  { weight: 3, arbitrary: fc.integer({ min: 1, max: 10 }) },
  { weight: 1, arbitrary: fc.integer({ min: 1, max: 1_000_000 }) },
  { weight: 1, arbitrary: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }) },
);

const bigSale: fc.Arbitrary<Sale> = fc.record({
  id: fc.uuid(),
  itemId: fc.constant("item-0"),
  quantity: bigQuantity,
  unitPrice: bigNumber,
  unitCost: bigNumber,
  // Mostly in range, some outside.
  time: fc.constantFrom(
    "2024-01-01T12:00:00.000Z",
    "2024-01-01T00:00:00.000Z",
    "2023-12-31T23:59:59.999Z",
    "2024-01-02T00:00:00.000Z",
  ),
});

const OVERFLOW_START = "2024-01-01T00:00:00.000Z";
const OVERFLOW_END = "2024-01-02T00:00:00.000Z";

/**
 * Exact reference: walks in-range Sales in order with BigInt, stopping at the
 * first unsafe own amount or unsafe running sum.
 */
function exactModel(
  sales: readonly Sale[],
  amountOf: (s: Sale) => bigint,
): { tooBig: true } | { tooBig: false; sum: bigint } {
  const startMs = Date.parse(OVERFLOW_START);
  const endMs = Date.parse(OVERFLOW_END);
  let sum = 0n;
  for (const s of sales) {
    const t = Date.parse(s.time);
    if (Number.isNaN(t) || t < startMs || t >= endMs) continue;
    const amount = amountOf(s);
    if (amount > MAX_SAFE || amount < -MAX_SAFE) return { tooBig: true };
    sum += amount;
    if (sum > MAX_SAFE || sum < -MAX_SAFE) return { tooBig: true };
  }
  return { tooBig: false, sum };
}

describe("Property 21: Overflow always returns an error, never an unsafe number", () => {
  it("**Validates: Requirements 1.6, 2.7, 8.4** matches an exact BigInt sum, errors with AMOUNT_TOO_BIG when unsafe, and never returns an unsafe number", () => {
    let sawError = 0;
    let sawOk = 0;
    fc.assert(
      fc.property(
        fc.array(bigSale, { maxLength: 8 }),
        (sales) => {
          const cases = [
            [
              dailyTotal(sales, OVERFLOW_START, OVERFLOW_END),
              exactModel(
                sales,
                (s) => BigInt(s.quantity) * BigInt(s.unitPrice),
              ),
            ],
            [
              estimatedProfit(sales, OVERFLOW_START, OVERFLOW_END),
              exactModel(
                sales,
                (s) =>
                  (BigInt(s.unitPrice) - BigInt(s.unitCost)) *
                  BigInt(s.quantity),
              ),
            ],
          ] as const;

          for (const [result, model] of cases) {
            if (result.ok) {
              // Never NaN or unsafe, and exactly the BigInt sum.
              expect(Number.isNaN(result.value)).toBe(false);
              expect(Number.isSafeInteger(result.value)).toBe(true);
              expect(model.tooBig).toBe(false);
              if (!model.tooBig) {
                expect(BigInt(result.value)).toBe(model.sum);
              }
              sawOk++;
            } else {
              expect(result.error.code).toBe("AMOUNT_TOO_BIG");
              sawError++;
            }
            if (model.tooBig) {
              expect(result.ok).toBe(false);
              if (!result.ok) {
                expect(result.error.code).toBe("AMOUNT_TOO_BIG");
              }
            }
          }
        },
      ),
      { numRuns: 300 },
    );
    // The generator must reach both outcomes.
    expect(sawError).toBeGreaterThan(0);
    expect(sawOk).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Property 22 (Sales part): frozen input is never mutated.
// ---------------------------------------------------------------------------

function deepFreezeValue<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreezeValue(v);
  }
  return value;
}

describe("Property 22: dailyTotal and estimatedProfit never mutate a frozen input (Sales part)", () => {
  it("**Validates: Requirements 1.5, 2.6, 8.5** leaves a deep-frozen Sales list equal to its snapshot, for valid and overflowing input", () => {
    const validList = fc.array(
      fc.oneof(
        { weight: 4, arbitrary: arbSale() },
        { weight: 1, arbitrary: arbSale(arbUnparseableTime) },
      ),
      { maxLength: 10 },
    );
    const overflowList = fc.array(bigSale, { minLength: 1, maxLength: 8 });

    fc.assert(
      fc.property(
        fc.oneof(validList, overflowList),
        arbDayRange,
        (sales, range) => {
          const snapshot = structuredClone(sales);
          deepFreezeValue(sales);

          const ranges: [string, string][] = [
            [range.start, range.end],
            [OVERFLOW_START, OVERFLOW_END],
          ];
          for (const [start, end] of ranges) {
            expect(() => dailyTotal(sales, start, end)).not.toThrow();
            expect(() => estimatedProfit(sales, start, end)).not.toThrow();
            expect(sales).toEqual(snapshot);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 23: salesNewestFirst.
// ---------------------------------------------------------------------------

// A few shared instants (one written two ways) so equal times are common.
const tieTime = fc.constantFrom(
  "2024-01-02T10:00:00.000Z",
  "2024-01-02T11:00:00.000+01:00", // same instant as the line above
  "2024-01-02T09:00:00.000Z",
  "2024-01-03T00:00:00.000Z",
);

describe("Property 23: salesNewestFirst is a permutation, sorted newest-first, ties broken by later input position, and does not mutate its input", () => {
  it("**Validates: Requirements 5.2, 5.3, 8.10** returns the same Sale references, newest first, unparseable last, later input first on ties, leaving a frozen input unchanged", () => {
    const list = fc.array(
      fc.oneof(
        { weight: 3, arbitrary: arbSale() },
        { weight: 4, arbitrary: arbSale(tieTime) },
        { weight: 2, arbitrary: arbSale(arbUnparseableTime) },
      ),
      { maxLength: 15 },
    );

    fc.assert(
      fc.property(list, (sales) => {
        const snapshot = structuredClone(sales);
        const originalOrder = [...sales];
        deepFreezeValue(sales);

        let out: Sale[] = [];
        expect(() => {
          out = salesNewestFirst(sales);
        }).not.toThrow();

        // Input untouched.
        expect(out).not.toBe(sales);
        expect(sales).toEqual(snapshot);
        sales.forEach((s, i) => expect(s).toBe(originalOrder[i]));

        // Permutation by reference.
        expect(out.length).toBe(sales.length);
        const positions = out.map((s) => sales.indexOf(s));
        expect(positions.every((p) => p >= 0)).toBe(true);
        expect(new Set(positions).size).toBe(sales.length);

        // Adjacent pairs: descending, unparseable last, ties later-first.
        for (let i = 0; i + 1 < out.length; i++) {
          const a = Date.parse(out[i].time);
          const b = Date.parse(out[i + 1].time);
          if (Number.isNaN(a)) {
            expect(Number.isNaN(b)).toBe(true);
            expect(positions[i]).toBeGreaterThan(positions[i + 1]);
          } else if (Number.isNaN(b)) {
            // parseable before unparseable: fine
          } else {
            expect(a).toBeGreaterThanOrEqual(b);
            if (a === b) {
              expect(positions[i]).toBeGreaterThan(positions[i + 1]);
            }
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
