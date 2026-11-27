import { describe, expect, it } from "vitest";

// The module name is built at run time because the project has no Node type package.
type Fs = { readFileSync(path: URL, encoding: "utf8"): string };
const fs = (await import(/* @vite-ignore */["node", "fs"].join(":"))) as Fs;

const css = fs
  .readFileSync(new URL("./GhostMascot.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const NO_PREFERENCE =
  /@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{/;

/** Returns [start, end) of the no-preference block body, matching braces. */
function noPreferenceRange(source: string): [number, number] | null {
  const match = NO_PREFERENCE.exec(source);
  if (!match) return null;
  let depth = 1;
  let i = match.index + match[0].length;
  const start = i;
  while (i < source.length && depth > 0) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
    i++;
  }
  return [start, i - 1];
}

function animationLines(): { text: string; offset: number }[] {
  const out: { text: string; offset: number }[] = [];
  let offset = 0;
  for (const line of css.split("\n")) {
    if (/(^|[\s;{])animation\s*:/.test(line)) out.push({ text: line, offset });
    offset += line.length + 1;
  }
  return out;
}

const COLOUR_NAMES = [
  "black", "white", "red", "green", "blue", "yellow", "orange", "purple",
  "pink", "gray", "grey", "brown", "cyan", "magenta", "silver", "gold",
  "navy", "teal", "lime", "maroon", "olive", "aqua", "fuchsia", "indigo",
  "violet", "coral", "salmon", "crimson", "tan", "beige", "ivory",
];

describe("GhostMascot.css (Requirements 5.4, 5.5, 5.6, 10.5)", () => {
  it("has a no-preference block and animation declarations", () => {
    expect(noPreferenceRange(css)).not.toBeNull();
    expect(animationLines().length).toBeGreaterThan(0);
  });

  it("keeps every animation declaration inside the no-preference block", () => {
    const range = noPreferenceRange(css) as [number, number];
    for (const { text, offset } of animationLines()) {
      expect(
        offset >= range[0] && offset < range[1],
        `outside no-preference block: ${text.trim()}`,
      ).toBe(true);
    }
  });

  it("uses steps( in every animation declaration", () => {
    for (const { text } of animationLines()) {
      expect(text, text.trim()).toMatch(/steps\(/);
    }
  });

  it("contains no hex, rgb( or colour name", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgba?\s*\(/i);
    const words = css.toLowerCase().match(/[a-z]+/g) ?? [];
    const found = words.filter((w) => COLOUR_NAMES.includes(w));
    expect(found).toEqual([]);
  });
});
