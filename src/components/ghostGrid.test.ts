import { describe, expect, it } from "vitest";
import { GHOST_GRID, GHOST_SIZE_CELLS } from "./ghostGrid";

// The module name is built at run time because the project has no Node type package.
type Fs = { readFileSync(path: URL, encoding: "utf8"): string };
const fs = (await import(/* @vite-ignore */["node", "fs"].join(":"))) as Fs;
const script = fs.readFileSync(new URL("../../scripts/generate-icons.mjs", import.meta.url), "utf8");

/** Reads the quoted rows of `const GHOST = [ ... ];` from the icon script. */
function scriptRows(): string[] {
  const block = /const GHOST = \[([\s\S]*?)\];/.exec(script);
  if (!block) throw new Error("Could not find `const GHOST = [` in scripts/generate-icons.mjs");
  return [...block[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

describe("GHOST_GRID", () => {
  it("is 16 rows of 16 characters, only '#' and '.'", () => {
    expect(GHOST_GRID).toHaveLength(GHOST_SIZE_CELLS);
    for (const row of GHOST_GRID) {
      expect(row).toHaveLength(GHOST_SIZE_CELLS);
      expect(row).toMatch(/^[#.]+$/);
    }
  });

  it("matches the GHOST array in scripts/generate-icons.mjs", () => {
    const rows = scriptRows();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows).toEqual([...GHOST_GRID]);
  });
});
