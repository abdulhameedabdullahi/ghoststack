import { err, ok } from '../domain/result';
import type { Result } from '../domain/result';
import type { Kobo } from '../domain/types';

const NAIRA = '\u20A6';

/** Formats kobo as Naira text, e.g. 125050 -> "₦1,250.50". String building only. */
export function formatKobo(kobo: Kobo): string {
  let digits = String(kobo);
  while (digits.length < 3) digits = '0' + digits;

  const whole = digits.slice(0, digits.length - 2);
  const koboPart = digits.slice(digits.length - 2);

  let grouped = '';
  for (let i = 0; i < whole.length; i++) {
    const fromEnd = whole.length - i;
    if (i > 0 && fromEnd % 3 === 0) grouped += ',';
    grouped += whole[i];
  }

  return `${NAIRA}${grouped}.${koboPart}`;
}

/** Parses Naira text into kobo using digit strings only. Errors use BAD_PRICE. */
export function parseKobo(text: string): Result<Kobo> {
  let s = text.trim();
  if (s.startsWith(NAIRA)) {
    s = s.slice(NAIRA.length).trim();
  }
  if (s === '') return err('BAD_PRICE');

  s = s.split(',').join('');
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(s)) return err('BAD_PRICE');

  const dot = s.indexOf('.');
  const wholeDigits = dot === -1 ? s : s.slice(0, dot);
  let koboDigits = dot === -1 ? '0' : s.slice(dot + 1);
  if (koboDigits.length === 1) koboDigits += '0';
  if (koboDigits === '0') koboDigits = '00';

  const kobo = Number(wholeDigits + koboDigits);
  if (!Number.isSafeInteger(kobo)) return err('BAD_PRICE');
  return ok(kobo);
}
