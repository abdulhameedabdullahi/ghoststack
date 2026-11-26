import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { NOT_USED_FOR_TEXT, PAIR_LIST } from "./palettePairs";
import { parseThemeVariables } from "./parseThemeVariables";

// The module name is built at run time because the project has no Node type package.
type Fs = { readFileSync(path: URL, encoding: "utf8"): string };
const fs = (await import(/* @vite-ignore */["node", "fs"].join(":"))) as Fs;
const parsed = parseThemeVariables(
  fs.readFileSync(new URL("../components/theme.css", import.meta.url), "utf8"),
);

describe("PAIR_LIST sanity", () => {
  it("is not empty", () => {
    expect(PAIR_LIST.length).toBeGreaterThan(0);
  });

  it.each(PAIR_LIST.map((p) => [p.name, p] as const))(
    "%s has a matching minRatio and colour variables",
    (_name, pair) => {
      expect(pair.minRatio).toBe(pair.kind === "text" ? 4.5 : 3);
      expect(pair.fg.startsWith("--color-")).toBe(true);
      expect(pair.bg.startsWith("--color-")).toBe(true);
    },
  );
});

describe("palette contrast in theme.css", () => {
  for (const pair of PAIR_LIST) {
    for (const theme of pair.themes) {
      it(`${pair.name} (${theme}) meets ${pair.minRatio}:1`, () => {
        const vars = parsed[theme];
        const fg = vars[pair.fg];
        const bg = vars[pair.bg];
        if (fg === undefined) {
          throw new Error(
            `Pair "${pair.name}" in ${theme}: ${pair.fg} is missing from theme.css`,
          );
        }
        if (bg === undefined) {
          throw new Error(
            `Pair "${pair.name}" in ${theme}: ${pair.bg} is missing from theme.css`,
          );
        }
        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `Pair "${pair.name}" in ${theme} has ratio ${ratio.toFixed(2)}:1 (${pair.fg} ${fg} on ${pair.bg} ${bg}), needs ${pair.minRatio}:1`,
        ).toBeGreaterThanOrEqual(pair.minRatio);
      });
    }
  }

  it("every --color-* variable is in a pair or in NOT_USED_FOR_TEXT", () => {
    const inPairs = new Set<string>();
    for (const pair of PAIR_LIST) {
      inPairs.add(pair.fg);
      inPairs.add(pair.bg);
    }
    const names = new Set([
      ...Object.keys(parsed.light),
      ...Object.keys(parsed.midnight),
    ]);
    const uncovered = [...names].filter(
      (n) =>
        n.startsWith("--color-") && !inPairs.has(n) && !(n in NOT_USED_FOR_TEXT),
    );
    expect(
      uncovered,
      `These colour variables have no contrast pair and are not in NOT_USED_FOR_TEXT: ${uncovered.join(", ")}`,
    ).toEqual([]);
  });
});
