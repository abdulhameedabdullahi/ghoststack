import { describe, expect, it } from "vitest";
import { parseThemeVariables } from "./parseThemeVariables";

const MIDNIGHT = '[data-theme="midnight"] { --color-bg: #000000; }';

describe("parseThemeVariables", () => {
  it("ignores comments, including ones that hide declarations", () => {
    const css = `
      /* header { with braces } */
      :root {
        --color-bg: #ffffff; /* inline note */
        /* --color-hidden: #123456; */
        --color-fg: #111;
      }
      ${MIDNIGHT}
    `;
    const { light } = parseThemeVariables(css);
    expect(light["--color-bg"]).toBe("#ffffff");
    expect(light["--color-fg"]).toBe("#111");
    expect(light["--color-hidden"]).toBeUndefined();
  });

  it("resolves var() chains", () => {
    const css = `
      :root {
        --color-a: #abcdef;
        --color-b: var(--color-a);
        --color-c: var( --color-b );
      }
      ${MIDNIGHT}
    `;
    const { light } = parseThemeVariables(css);
    expect(light["--color-c"]).toBe("#abcdef");
    expect(light["--color-b"]).toBe("#abcdef");
  });

  it("throws on a circular reference", () => {
    const css = `
      :root { --color-a: var(--color-b); --color-b: var(--color-a); }
      ${MIDNIGHT}
    `;
    expect(() => parseThemeVariables(css)).toThrow(/Circular/);
  });

  it("throws on an unknown reference and names it", () => {
    const css = `
      :root { --color-a: var(--color-missing); }
      ${MIDNIGHT}
    `;
    expect(() => parseThemeVariables(css)).toThrow(/--color-missing/);
  });

  it("throws on a non-hex colour and names the variable and value", () => {
    const css = `
      :root { --color-bg: rgb(0, 0, 0); }
      ${MIDNIGHT}
    `;
    expect(() => parseThemeVariables(css)).toThrow(/--color-bg/);
    expect(() => parseThemeVariables(css)).toThrow(/rgb\(0, 0, 0\)/);
  });

  it("lets midnight inherit light values it does not set", () => {
    const css = `
      :root {
        --color-bg: #ffffff;
        --color-ink: #111111;
        --color-fg: var(--color-ink);
        --space-1: 4px;
      }
      [data-theme="midnight"] { --color-ink: #eeeeee; }
    `;
    const { light, midnight } = parseThemeVariables(css);
    expect(midnight["--color-bg"]).toBe("#ffffff");
    expect(midnight["--space-1"]).toBe("4px");
    // Chains are resolved with the midnight value.
    expect(midnight["--color-fg"]).toBe("#eeeeee");
    expect(light["--color-fg"]).toBe("#111111");
  });

  it("ignores a :root block inside @media", () => {
    const css = `
      :root { --color-bg: #ffffff; }
      @media (prefers-reduced-motion: reduce) {
        :root { --color-bg: #ff0000; --color-extra: #00ff00; }
      }
      ${MIDNIGHT}
    `;
    const { light } = parseThemeVariables(css);
    expect(light["--color-bg"]).toBe("#ffffff");
    expect(light["--color-extra"]).toBeUndefined();
  });
});
