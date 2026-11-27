import { describe, expect, it } from "vitest";
import { ITEM_MAX, NAME_MAX, sanitiseText } from "./sanitise";

describe("sanitiseText", () => {
  it("exposes the name and item limits", () => {
    expect(NAME_MAX).toBe(30);
    expect(ITEM_MAX).toBe(20);
  });

  it("removes every forbidden control character", () => {
    const forbidden: number[] = [];
    for (let c = 0x00; c <= 0x1f; c++) forbidden.push(c);
    forbidden.push(0x7f);
    for (let c = 0x202a; c <= 0x202e; c++) forbidden.push(c);
    for (let c = 0x2066; c <= 0x2069; c++) forbidden.push(c);
    for (const code of forbidden) {
      const ch = String.fromCharCode(code);
      expect(sanitiseText(`a${ch}b`, 30)).toBe("ab");
    }
  });

  it("turns a newline between letters into nothing", () => {
    expect(sanitiseText("a\nb", 30)).toBe("ab");
  });

  it("collapses runs of whitespace to one space", () => {
    expect(sanitiseText("a   b \u00A0  c", 30)).toBe("a b c");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitiseText("   hello  ", 30)).toBe("hello");
  });

  it("counts an emoji as one code point when cutting", () => {
    expect(sanitiseText("😀😀😀😀", 3)).toBe("😀😀😀");
  });

  it("trims a cut that ends on a space", () => {
    expect(sanitiseText("abc def", 4)).toBe("abc");
  });

  it("replaces a lone surrogate with U+FFFD", () => {
    expect(sanitiseText("a\uD800b", 30)).toBe("a\uFFFDb");
    expect(sanitiseText("a\uDC00b", 30)).toBe("a\uFFFDb");
  });

  it("keeps a valid surrogate pair intact", () => {
    expect(sanitiseText("a😀b", 30)).toBe("a😀b");
  });

  it("returns an empty string for empty or all-forbidden input", () => {
    expect(sanitiseText("", 30)).toBe("");
    expect(sanitiseText("\n\t \u202E", 30)).toBe("");
  });
});
