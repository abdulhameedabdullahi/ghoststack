export const ERROR_MESSAGES = {
  BAD_QUANTITY:
    'The amount must be a whole number, like 1 or 5. Please check it and try again.',
  NOT_ENOUGH_STOCK:
    'You do not have enough of this item in stock. Check the amount or add more stock.',
  BAD_AMOUNT:
    'The money amount must be more than zero. Please check it and try again.',
  AMOUNT_TOO_BIG:
    'This amount is too big to work with. Please use a smaller amount.',
  BAD_CUSTOMER: "Please type the customer's name.",
  ITEM_NOT_FOUND: 'We could not find this item. Pick it from your stock list.',
  CARD_NOT_FOUND: 'We could not find this card. Go back and pick it again.',
  DEBT_NOT_FOUND:
    'We could not find this debt. Go back and pick it from the list.',
  DEBT_ALREADY_PAID: 'This debt is already marked as paid.',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export const ERROR_CODES = Object.keys(ERROR_MESSAGES) as ErrorCode[];

export type DomainError = { code: ErrorCode; message: string };

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: DomainError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function domainError(code: ErrorCode): DomainError {
  return { code, message: ERROR_MESSAGES[code] };
}

export function err<T = never>(code: ErrorCode): Result<T> {
  return { ok: false, error: domainError(code) };
}
