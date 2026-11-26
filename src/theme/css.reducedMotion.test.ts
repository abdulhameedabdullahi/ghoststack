import { describe, expect, it } from "vitest";

// The module name is built at run time because the project has no Node type package.
type Fs = {
  readdirSync(
    path: URL,
    options: { withFileTypes: true },
  ): { name: string; isDirectory(): boolean }[];
  readFileSync(path: URL, encoding: "utf8"): string;
};
const fs = (await import(/* @vite-ignore */["node", "fs"].join(":"))) as Fs;

function findCssFiles(dir: URL): URL[] {
  const found: URL[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      found.push(...findCssFiles(new URL(`${entry.name}/`, dir)));
    } else if (entry.name.endsWith(".css")) {
      found.push(new URL(entry.name, dir));
    }
  }
  return found;
}

const REDUCED = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/;

/** Returns the body of the first reduced-motion block, matching braces. */
function reducedMotionBlock(css: string): string | null {
  const match = REDUCED.exec(css);
  if (!match) return null;
  let depth = 1;
  let i = match.index + match[0].length;
  const start = i;
  while (i < css.length && depth > 0) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") depth--;
    i++;
  }
  return css.slice(start, i - 1);
}

const srcDir = new URL("../", import.meta.url);
const cssFiles = findCssFiles(srcDir);

describe("reduced motion CSS (Requirement 13.8)", () => {
  it("finds CSS files under src", () => {
    expect(cssFiles.length).toBeGreaterThan(0);
  });

  it("at least one CSS file has a prefers-reduced-motion rule", () => {
    const withRule = cssFiles.filter((f) =>
      REDUCED.test(fs.readFileSync(f, "utf8")),
    );
    expect(withRule.length).toBeGreaterThan(0);
  });

  it("StockCardView.css turns off the sale-notice animation", () => {
    const file = cssFiles.find((f) => f.pathname.endsWith("/StockCardView.css"));
    expect(file).toBeDefined();
    const block = reducedMotionBlock(fs.readFileSync(file as URL, "utf8"));
    expect(block, "missing reduced-motion block").not.toBeNull();
    const body = block as string;
    expect(body).toMatch(/\.sale-notice--pop\b/);
    expect(body).toMatch(/\.sale-notice--pop-b\b/);
    expect(body).toMatch(/animation\s*:\s*none/);
  });
});
