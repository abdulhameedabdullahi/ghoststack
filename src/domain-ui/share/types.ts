/**
 * Types for WhatsApp sharing.
 *
 * `ShareResult` has the same shape as the domain `Result`, but with its own
 * error codes, so `src/domain/result.ts` stays untouched.
 */

export type Language = "en";

export type ShareErrorCode = "INVALID_AMOUNT" | "ALREADY_PAID";

export const SHARE_ERROR_MESSAGES: Record<ShareErrorCode, string> = {
  INVALID_AMOUNT: "We could not make this message because an amount is not valid.",
  ALREADY_PAID: "This debt is already paid, so there is nothing to remind about.",
};

export type ShareResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: ShareErrorCode; message: string } };

export interface MessageText {
  text: string;
}

export interface DebtReminderInput {
  personName: string;
  shopName: string;
  outstandingKobo: number;
  language: Language;
}

export interface DailySummaryInput {
  shopName: string;
  dateLabel: string;
  salesKobo: number;
  profitKobo: number;
  owedKobo: number;
  lowStockNames: string[];
  language: Language;
}
