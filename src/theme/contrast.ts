const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Turns "#rgb" or "#rrggbb" into three channel values from 0 to 255. */
function parseHex(value: string): [number, number, number] {
  if (typeof value !== 'string' || !HEX_COLOUR.test(value)) {
    throw new Error(`Not a hex colour: "${String(value)}"`);
  }
  const digits = value.slice(1);
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((d) => d + d)
          .join('')
      : digits;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG 2.x relative luminance, from 0 (black) to 1 (white). */
function relativeLuminance(value: string): number {
  const [r, g, b] = parseHex(value).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two hex colours. Result is from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  // Guard against floating-point drift outside the valid range.
  return Math.min(21, Math.max(1, ratio));
}
