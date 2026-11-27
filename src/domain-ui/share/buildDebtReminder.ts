import { formatDisplay } from "../../components/formatMoney";
import { NAME_MAX, sanitiseText } from "./sanitise";
import { TEMPLATES } from "./templates";
import { SHARE_ERROR_MESSAGES } from "./types";
import type { DebtReminderInput, MessageText, ShareErrorCode, ShareResult } from "./types";

type Kobo = Parameters<typeof formatDisplay>[0];

function fail(code: ShareErrorCode): ShareResult<MessageText> {
  return { ok: false, error: { code, message: SHARE_ERROR_MESSAGES[code] } };
}

/** Builds the polite debt reminder text. Pure: same input, same output. */
export function buildDebtReminder(input: DebtReminderInput): ShareResult<MessageText> {
  const kobo = input.outstandingKobo;
  if (kobo === 0) return fail("ALREADY_PAID"); // also true for -0
  if (!Number.isSafeInteger(kobo) || kobo < 1) return fail("INVALID_AMOUNT");

  const t = TEMPLATES[input.language];
  const personName = sanitiseText(input.personName, NAME_MAX) || t.fallbackPerson;
  const shopName = sanitiseText(input.shopName, NAME_MAX) || t.fallbackShop;
  const amount = formatDisplay(kobo as Kobo);

  return { ok: true, value: { text: t.debtReminder({ personName, shopName, amount }) } };
}
