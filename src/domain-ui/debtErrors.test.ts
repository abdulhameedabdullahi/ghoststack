import { describe, expect, it } from 'vitest';
import { ERROR_CODES, ERROR_MESSAGES, type ErrorCode } from '../domain/result';
import { debtFieldErrorFor } from './debtErrors';

const AMOUNT_CODES: ErrorCode[] = ['BAD_AMOUNT', 'AMOUNT_TOO_BIG', 'BAD_PRICE'];
const FRIENDLY =
  'Please type an amount using numbers only, like 1250 or 1250.50.';

describe('debtFieldErrorFor', () => {
  it.each(AMOUNT_CODES)('%s returns the friendly sentence without "kobo"', (code) => {
    const text = debtFieldErrorFor(code);
    expect(text).toBe(FRIENDLY);
    expect(text).not.toMatch(/kobo/i);
  });

  it('returns ERROR_MESSAGES[code] unchanged for every other code', () => {
    const others = ERROR_CODES.filter((c) => !AMOUNT_CODES.includes(c));
    expect(others.length).toBeGreaterThan(0);
    for (const code of others) {
      expect(debtFieldErrorFor(code)).toBe(ERROR_MESSAGES[code]);
    }
  });
});
