export const NAME_MAX = 30;
export const ITEM_MAX = 20;

const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const CONTROL_AND_BIDI = /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;

/**
 * Makes user text safe for a share message: fixes lone surrogates, strips
 * control and bidi characters, collapses whitespace, trims, and cuts to
 * `max` code points.
 */
export function sanitiseText(value: string, max: number): string {
  const wellFormed = value.replace(LONE_SURROGATE, "\uFFFD");
  const stripped = wellFormed.replace(CONTROL_AND_BIDI, "");
  const collapsed = stripped.replace(/\s+/g, " ").trim();
  const cut = Array.from(collapsed).slice(0, max).join("");
  return cut.replace(/\s+$/, "");
}
