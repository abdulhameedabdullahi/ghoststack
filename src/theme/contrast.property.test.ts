import { describe, it } from 'vitest';
import fc from 'fast-check';
import { contrastRatio } from './contrast';

const hexDigit = fc.constantFrom(...'0123456789abcdefABCDEF'.split(''));
const hex3 = fc
  .array(hexDigit, { minLength: 3, maxLength: 3 })
  .map((d) => `#${d.join('')}`);
const hex6 = fc
  .array(hexDigit, { minLength: 6, maxLength: 6 })
  .map((d) => `#${d.join('')}`);
const anyHex = fc.oneof(hex3, hex6);

const expand = (c: string) =>
  '#' +
  c
    .slice(1)
    .split('')
    .map((d) => d + d)
    .join('');

describe('contrastRatio properties', () => {
  // Feature: design-polish, Property 1: Contrast ratio is symmetric
  // **Validates: Requirements 12.1**
  it('is symmetric', () => {
    fc.assert(
      fc.property(anyHex, anyHex, (a, b) => {
        return contrastRatio(a, b) === contrastRatio(b, a);
      }),
      { numRuns: 200 },
    );
  });

  // Feature: design-polish, Property 2: Contrast ratio is between 1 and 21
  // **Validates: Requirements 12.2**
  it('lies between 1 and 21', () => {
    fc.assert(
      fc.property(anyHex, anyHex, (a, b) => {
        const r = contrastRatio(a, b);
        return r >= 1 && r <= 21;
      }),
      { numRuns: 200 },
    );
  });

  // Feature: design-polish, Property 3: A colour on itself has ratio 1
  // **Validates: Requirements 12.4**
  it('gives 1 for a colour on itself', () => {
    fc.assert(
      fc.property(anyHex, (a) => contrastRatio(a, a) === 1),
      { numRuns: 200 },
    );
  });

  // Feature: design-polish, Property 4: 3-digit and 6-digit hex give the same ratio
  // **Validates: Requirements 12.5, 12.6**
  it('treats a 3-digit colour the same as its 6-digit form', () => {
    fc.assert(
      fc.property(hex3, anyHex, (short, other) => {
        return (
          contrastRatio(short, other) === contrastRatio(expand(short), other) &&
          contrastRatio(other, short) === contrastRatio(other, expand(short))
        );
      }),
      { numRuns: 200 },
    );
  });
});
