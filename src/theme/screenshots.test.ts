import { describe, expect, it } from "vitest";

// The module name is built at run time because the project has no Node type package.
type Fs = {
  existsSync(path: URL): boolean;
  readFileSync(path: URL, encoding: "utf8"): string;
};
const fs = (await import(/* @vite-ignore */["node", "fs"].join(":"))) as Fs;
const docUrl = new URL("../../docs/SCREENSHOTS.md", import.meta.url);

// Screens named in Requirement 10.3, matched case-insensitively.
const SCREENS: ReadonlyArray<readonly [string, RegExp]> = [
  ["starter chooser", /starter chooser/i],
  ["Stock card with items", /stock card with items/i],
  ["Stock card empty state", /stock card empty state/i],
  ["Sale recorded notice", /"sale recorded" notice/i],
  ["Sales log", /sales log/i],
  ["Debts card", /debts card/i],
  ["Daily summary", /daily summary/i],
  ["Builder mode", /builder mode/i],
  ["backup controls", /backup controls/i],
  ["update notice", /update notice/i],
  ["offline notice", /offline notice/i],
];

describe("docs/SCREENSHOTS.md", () => {
  it("exists", () => {
    expect(fs.existsSync(docUrl)).toBe(true);
  });

  const text = fs.existsSync(docUrl) ? fs.readFileSync(docUrl, "utf8") : "";

  it.each(SCREENS.map((s) => [...s] as [string, RegExp]))(
    "lists the screen: %s",
    (_name, pattern) => {
      expect(text).toMatch(pattern);
    },
  );

  it("mentions the 360 and 768 widths", () => {
    expect(text).toMatch(/\b360\b/);
    expect(text).toMatch(/\b768\b/);
  });

  it("uses the NN-screen-name-WIDTH-THEME.png naming", () => {
    expect(text).toContain("NN-screen-name-WIDTH-THEME.png");
    expect(text).toMatch(/\b\d{2}-[a-z-]+-(360|768)-(light|midnight)\.png/);
  });

  it("names the docs/screenshots/ folder", () => {
    expect(text).toContain("docs/screenshots/");
  });
});
