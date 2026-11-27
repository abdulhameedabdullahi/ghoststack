import { describe, expect, it } from "vitest";

// The module name is built at run time because the project has no Node type package.
type Fs = { readFileSync(path: URL, encoding: "utf8"): string };
const fs = (await import(/* @vite-ignore */["node", "fs"].join(":"))) as Fs;

const read = (rel: string) =>
  fs
    .readFileSync(new URL(rel, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ");

const OUTLINE_OFF = /outline\s*:\s*(?:none|0)(?![.\w-])/i;

describe("share CSS (Requirements 6.3, 8.2)", () => {
  it("the outline check detects the forbidden forms", () => {
    expect(OUTLINE_OFF.test("a { outline: none; }")).toBe(true);
    expect(OUTLINE_OFF.test("a { outline:0 }")).toBe(true);
    expect(OUTLINE_OFF.test("a { outline: 2px solid var(--x); }")).toBe(false);
  });

  for (const file of ["./ShareStatus.css", "../Button.css"]) {
    it(`${file} never removes the focus outline`, () => {
      expect(OUTLINE_OFF.test(read(file))).toBe(false);
    });
  }

  it("ShareStatus.css defines no --color- variable", () => {
    expect(read("./ShareStatus.css")).not.toMatch(/--color-[\w-]*\s*:/);
  });
});
