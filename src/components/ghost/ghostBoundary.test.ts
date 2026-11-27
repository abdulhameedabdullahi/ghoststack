import { describe, expect, it } from "vitest";

// Validates: Requirements 4.9
// The module name is built at run time because the project has no Node type package.
type Entry = { name: string; isDirectory(): boolean };
type Fs = {
  readFileSync(path: URL, encoding: "utf8"): string;
  readdirSync(path: URL, options: { withFileTypes: true }): Entry[];
};
const fs = (await import(/* @vite-ignore */ ["node", "fs"].join(":"))) as Fs;

function walk(dir: URL): URL[] {
  const files: URL[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files.push(...walk(new URL(`${entry.name}/`, dir)));
    } else {
      files.push(new URL(entry.name, dir));
    }
  }
  return files;
}

const srcDir = (name: string) => new URL(`../../${name}/`, import.meta.url);
const isTest = (url: URL) => /\.test\.tsx?$/.test(url.pathname);

describe("ghost boundary", () => {
  it("no file in domain, domain-ui or storage mentions components/ghost", () => {
    const offenders: string[] = [];
    let count = 0;
    for (const name of ["domain", "domain-ui", "storage"]) {
      for (const file of walk(srcDir(name))) {
        count += 1;
        if (fs.readFileSync(file, "utf8").includes("components/ghost")) {
          offenders.push(file.pathname);
        }
      }
    }
    expect(count).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it("non-test ghost files do not import from domain, domain-ui or storage", () => {
    const files = walk(new URL("./", import.meta.url)).filter(
      (f) => !isTest(f) && /\.tsx?$/.test(f.pathname),
    );
    expect(files.length).toBeGreaterThan(0);
    const pattern = /(?:from\s+|import\s*\(?\s*|import\s+)["'][^"']*\b(?:domain|domain-ui|storage)(?:\/[^"']*)?["']/;
    const offenders = files
      .filter((f) => pattern.test(fs.readFileSync(f, "utf8")))
      .map((f) => f.pathname);
    expect(offenders).toEqual([]);
  });
});
