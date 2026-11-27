import fc from "fast-check";

export const fullUnicodeString: fc.Arbitrary<string> = fc.string({
  unit: "binary",
});

const LONE_SURROGATES = [
  "\uD800",
  "\uD83D",
  "\uDBFF",
  "\uDC00",
  "\uDE00",
  "\uDFFF",
];

export const loneSurrogateString: fc.Arbitrary<string> = fc
  .array(
    fc.oneof(
      fc.constantFrom(...LONE_SURROGATES),
      fc.constantFrom("a", "b", " ", "Z", "1"),
    ),
    { minLength: 1, maxLength: 20 },
  )
  .filter((parts) => parts.some((p) => LONE_SURROGATES.includes(p)))
  .map((parts) => parts.join(""));

export const emptyString: fc.Arbitrary<string> = fc.constant("");

export const veryLongString: fc.Arbitrary<string> = fc
  .integer({ min: 200, max: 2000 })
  .chain((len) =>
    fc.string({ unit: "grapheme-ascii", minLength: len, maxLength: len }),
  );

const RTL_CHARS = [
  ..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي",
  ..."אבגדהוזחטיכלמנסעפצקרשת",
];
const BIDI_CHARS = [
  "\u202A",
  "\u202B",
  "\u202C",
  "\u202D",
  "\u202E",
  "\u2066",
  "\u2067",
  "\u2068",
  "\u2069",
  "\u200E",
  "\u200F",
];

export const rtlString: fc.Arbitrary<string> = fc
  .array(
    fc.oneof(
      { weight: 4, arbitrary: fc.constantFrom(...RTL_CHARS) },
      { weight: 2, arbitrary: fc.constantFrom(...BIDI_CHARS) },
      { weight: 1, arbitrary: fc.constantFrom(" ", "a", "1") },
    ),
    { minLength: 1, maxLength: 40 },
  )
  .map((parts) => parts.join(""));

const FAMILY = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}";

export const emojiString: fc.Arbitrary<string> = fc
  .array(
    fc.constantFrom(
      FAMILY,
      "😀",
      "👻",
      "🎃",
      "👍🏽",
      "🇳🇬",
      "❤️",
      "a",
      " ",
    ),
    { minLength: 1, maxLength: 20 },
  )
  .map((parts) => parts.join(""));

const CONTROL_AND_SPACE = [
  "\u0000",
  "\u0001",
  "\u0007",
  "\b",
  "\t",
  "\n",
  "\v",
  "\f",
  "\r",
  "\u001B",
  "\u007F",
  "\u0085",
  "\u009F",
  " ",
  "\u00A0",
  "\u2003",
  "\u2028",
  "\u2029",
  "\u200B",
  "\u3000",
  "\uFEFF",
];

export const controlWhitespaceString: fc.Arbitrary<string> = fc
  .array(
    fc.oneof(
      { weight: 5, arbitrary: fc.constantFrom(...CONTROL_AND_SPACE) },
      { weight: 1, arbitrary: fc.constantFrom("a", "B", "7") },
    ),
    { minLength: 1, maxLength: 40 },
  )
  .map((parts) => parts.join(""));

export const nameArb: fc.Arbitrary<string> = fc.oneof(
  fullUnicodeString,
  loneSurrogateString,
  emptyString,
  veryLongString,
  rtlString,
  emojiString,
  controlWhitespaceString,
);

export const validKoboArb: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
  fc.constantFrom(1, 100, Number.MAX_SAFE_INTEGER),
);

export const zeroOrMoreKoboArb: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  fc.constantFrom(0, 1, 100, Number.MAX_SAFE_INTEGER),
);

export const lowStockNamesArb: fc.Arbitrary<string[]> = fc.array(nameArb, {
  minLength: 0,
  maxLength: 50,
});

/**
 * Runs a property with fc.check. On failure, throws an Error that carries
 * the seed, the counterexample and the shrunk error so it can be replayed.
 */
export function checkProperty<T>(
  property: fc.IPropertyWithHooks<T> | fc.IProperty<T>,
  runs = 100,
): void {
  const details = fc.check(property, { numRuns: Math.max(runs, 100) });
  if (details.failed) {
    const counterexample = safeStringify(details.counterexample);
    const err = details.errorInstance;
    const errText =
      err instanceof Error ? (err.stack ?? err.message) : String(err ?? "");
    throw new Error(
      `Property failed after ${details.numRuns} runs (${details.numShrinks} shrinks).\n` +
        `seed: ${details.seed}\n` +
        `path: ${details.counterexamplePath}\n` +
        `counterexample: ${counterexample}\n` +
        `error: ${errText}`,
    );
  }
}

function safeStringify(value: unknown): string {
  try {
    return fc.stringify(value);
  } catch {
    return String(value);
  }
}
