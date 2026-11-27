import { formatDisplay } from "../../components/formatMoney";
import { ITEM_MAX, NAME_MAX, sanitiseText } from "./sanitise";
import { TEMPLATES } from "./templates";
import { SHARE_ERROR_MESSAGES } from "./types";
import type { DailySummaryInput, MessageText, ShareErrorCode, ShareResult } from "./types";

type Kobo = Parameters<typeof formatDisplay>[0];

const ITEMS_SHOWN = 3;

function fail(code: ShareErrorCode): ShareResult<MessageText> {
  return { ok: false, error: { code, message: SHARE_ERROR_MESSAGES[code] } };
}

function isValidKobo(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 0;
}

/** Builds the end-of-day summary text. Pure: same input, same output. */
export function buildDailySummary(input: DailySummaryInput): ShareResult<MessageText> {
  const { salesKobo, profitKobo, owedKobo } = input;
  if (!isValidKobo(salesKobo) || !isValidKobo(profitKobo) || !isValidKobo(owedKobo)) {
    return fail("INVALID_AMOUNT");
  }

  const t = TEMPLATES[input.language];
  const shopName = sanitiseText(input.shopName, NAME_MAX) || t.fallbackShop;
  const dateLabel = sanitiseText(input.dateLabel, NAME_MAX);

  const names = input.lowStockNames
    .map((name) => sanitiseText(name, ITEM_MAX))
    .filter((name) => name !== "");
  const shown = names.slice(0, ITEMS_SHOWN).join(t.itemsSeparator);
  const rest = names.length - ITEMS_SHOWN;
  const items =
    names.length === 0 ? t.itemsNone : rest > 0 ? shown + t.itemsMore(rest) : shown;

  const text = t.dailySummary({
    shopName,
    dateLabel,
    sales: formatDisplay(salesKobo as Kobo),
    profit: formatDisplay(profitKobo as Kobo),
    owed: formatDisplay(owedKobo as Kobo),
    items,
  });

  return { ok: true, value: { text } };
}
