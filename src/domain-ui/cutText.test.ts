import { describe, expect, it } from "vitest";
import { cutText } from "./cutText";

describe("cutText", () => {
  it("returns text unchanged when it already fits", () => {
    expect(cutText("hello", 5)).toBe("hello");
    expect(cutText("hello", 100)).toBe("hello");
    expect(cutText("", 3)).toBe("");
  });

  it("returns an empty string when max is 0", () => {
    expect(cutText("hello", 0)).toBe("");
    expect(cutText("😀", 0)).toBe("");
  });

  it("drops the first half of a pair when the cut lands between the halves", () => {
    // "a😀" is 3 UTF-16 units: 'a', high surrogate, low surrogate.
    expect(cutText("a😀", 2)).toBe("a");
    expect(cutText("ab😀c", 3)).toBe("ab");
  });

  it("keeps a whole pair when the cut lands after it", () => {
    expect(cutText("a😀b", 3)).toBe("a😀");
  });

  it("returns an empty string when an emoji at the start does not fit", () => {
    expect(cutText("😀abc", 1)).toBe("");
    expect(cutText("😀abc", 2)).toBe("😀");
  });

  it("cuts plain ASCII at exactly max characters", () => {
    expect(cutText("abcdef", 3)).toBe("abc");
    expect(cutText("abcdef", 1)).toBe("a");
  });
});
