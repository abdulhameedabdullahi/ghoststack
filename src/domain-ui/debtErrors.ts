import { ERROR_MESSAGES, type ErrorCode } from '../domain/result';

const AMOUNT_FIELD_MESSAGE =
  'Please type an amount using numbers only, like 1250 or 1250.50.';

/**
 * Text shown next to the amount Field in the Debt form.
 * Amount-related codes share one friendly sentence; every other code
 * keeps its normal message from the domain.
 */
export function debtFieldErrorFor(code: ErrorCode): string {
  switch (code) {
    case 'BAD_AMOUNT':
    case 'AMOUNT_TOO_BIG':
    case 'BAD_PRICE':
      return AMOUNT_FIELD_MESSAGE;
    default:
      return ERROR_MESSAGES[code];
  }
}
