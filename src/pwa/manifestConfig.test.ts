import { describe, expect, it } from "vitest";
import { BASE_PATH, MANIFEST } from "./manifestConfig";

// Vitest turns CSS imports (even `?raw`) into empty strings, so read the file from disk.
// The module name is built at run time because the project has no Node type package.
type Fs = { readFileSync(path: URL, encoding: "utf8"): string };
const fs = (await import(/* @vite-ignore */["node", "fs"].join(":"))) as Fs;
const themeCss = fs.readFileSync(new URL("../components/theme.css", import.meta.url), "utf8");

/** Reads one custom property from the `:root` block only. */
function rootVar(name: string): string {
  const block = /:root\s*\{([^}]*)\}/.exec(themeCss);
  if (!block) throw new Error("No :root block in theme.css");
  const match = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(block[1]);
  if (!match) throw new Error(`${name} not found in :root`);
  return match[1].trim().toLowerCase();
}

describe("MANIFEST", () => {
  it("has the app name and standalone display", () => {
    expect(MANIFEST.name).toBe("GhostStack");
    expect(MANIFEST.display).toBe("standalone");
  });

  it("starts and scopes at BASE_PATH", () => {
    expect(MANIFEST.start_url).toBe(BASE_PATH);
    expect(MANIFEST.scope).toBe(BASE_PATH);
  });

  it("has 192 and 512 icons and one maskable icon", () => {
    const sizes = MANIFEST.icons.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(MANIFEST.icons.filter((i) => i.purpose === "maskable")).toHaveLength(1);
  });

  it("uses the light theme colors from theme.css", () => {
    expect(MANIFEST.theme_color.toLowerCase()).toBe(rootVar("--color-title-bg"));
    expect(MANIFEST.background_color.toLowerCase()).toBe(rootVar("--color-bg"));
  });

  it("has no cloud, account or payment wording", () => {
    const text = JSON.stringify(MANIFEST).toLowerCase();
    expect(text).not.toMatch(/cloud|sync|account|sign.?in|log.?in|payment|pay\b|card payment|bank/);
  });
});

