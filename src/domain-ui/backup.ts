import type { Card, Stack } from "../domain/types";
import { isStack } from "../storage/isStack";
import { cutText } from "./cutText";

export const BACKUP_FORMAT = "ghoststack-backup";
export const BACKUP_VERSION = 1;
export const SIZE_LIMIT = 5 * 1024 * 1024; // bytes of UTF-8 text
export const NAME_LIMIT = 40;
export const RESTORED_SUFFIX = " (restored)"; // 11 characters
export const RESTORED_NAME_FALLBACK = "My shop (restored)";

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  backupVersion: typeof BACKUP_VERSION;
  stack: Stack;
}

export type BackupErrorCode =
  | "TOO_LARGE"
  | "NOT_JSON"
  | "NOT_A_BACKUP"
  | "WRONG_BACKUP_VERSION"
  | "WRONG_STACK_VERSION"
  | "INVALID_STACK";

export type BackupError = { code: BackupErrorCode; message: string };

export type BackupResult =
  | { ok: true; value: Stack }
  | { ok: false; error: BackupError };

export const BACKUP_ERROR_MESSAGES: Record<BackupErrorCode, string> = {
  TOO_LARGE:
    'This file is too big to be a GhostStack backup. A backup is much smaller. Choose a file you saved with "Save a backup".',
  NOT_JSON:
    'This file is not a GhostStack backup. Choose a file you saved with "Save a backup".',
  NOT_A_BACKUP:
    'This file does not look like a GhostStack backup. Choose a file you saved with "Save a backup".',
  WRONG_BACKUP_VERSION:
    "This backup was made by a different version of GhostStack. Update the app, or use a newer backup.",
  WRONG_STACK_VERSION:
    "This backup holds a shop from a different version of GhostStack. Update the app, or use a newer backup.",
  INVALID_STACK: "This backup is damaged. Try another backup file.",
};

/** Writes the Stack as a backup file, indented with two spaces. */
export function serializeStack(stack: Stack): string {
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    stack,
  };
  return JSON.stringify(file, null, 2);
}

function fail(code: BackupErrorCode): BackupResult {
  return { ok: false, error: { code, message: BACKUP_ERROR_MESSAGES[code] } };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/** Reads an own property only. Inherited names give undefined. */
function getOwn(obj: Record<string, unknown>, key: string): unknown {
  return hasOwn(obj, key) ? obj[key] : undefined;
}

/** UTF-8 byte length without making a big copy. Matches TextEncoder. */
function utf8ByteLength(text: string): number {
  if (text.length > SIZE_LIMIT) return text.length; // each UTF-16 unit is at least 1 byte
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (
      c >= 0xd800 &&
      c <= 0xdbff &&
      i + 1 < text.length &&
      text.charCodeAt(i + 1) >= 0xdc00 &&
      text.charCodeAt(i + 1) <= 0xdfff
    ) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

const MAX_BASE = NAME_LIMIT - RESTORED_SUFFIX.length; // 29

function restoredName(fileName: string): string {
  const trimmed = fileName.trim();
  if (trimmed === "") return RESTORED_NAME_FALLBACK;
  const base = cutText(trimmed, MAX_BASE).trimEnd();
  return base + RESTORED_SUFFIX;
}

function rebuildCard(c: Card): Card {
  let card: Card;
  switch (c.type) {
    case "stock":
      card = {
        id: c.id,
        type: "stock",
        title: c.title,
        items: c.items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          costPrice: i.costPrice,
          sellPrice: i.sellPrice,
          lowStockLevel: i.lowStockLevel,
        })),
      };
      break;
    case "sales-log":
      card = {
        id: c.id,
        type: "sales-log",
        title: c.title,
        sales: c.sales.map((s) => ({
          id: s.id,
          itemId: s.itemId,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          unitCost: s.unitCost,
          time: s.time,
        })),
      };
      break;
    case "debts":
      card = {
        id: c.id,
        type: "debts",
        title: c.title,
        debts: c.debts.map((d) => ({
          id: d.id,
          customer: d.customer,
          amount: d.amount,
          date: d.date,
          status: d.status,
        })),
      };
      break;
    case "daily-summary":
      card = { id: c.id, type: "daily-summary", title: c.title };
      break;
  }
  if (c.hidden !== undefined) card.hidden = c.hidden;
  return card;
}

function titlesOk(cards: Card[]): boolean {
  return cards.every((c) => {
    const n = c.title.trim().length;
    return n >= 1 && n <= NAME_LIMIT;
  });
}

/**
 * Checks backup text and builds a Restored_Stack with the given id.
 * Pure. Never throws. Copies known fields only.
 */
export function parseBackup(text: string, freshId: string): BackupResult {
  try {
    if (utf8ByteLength(text) > SIZE_LIMIT) return fail("TOO_LARGE");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail("NOT_JSON");
    }

    if (
      !isPlainObject(parsed) ||
      getOwn(parsed, "format") !== BACKUP_FORMAT ||
      !hasOwn(parsed, "stack")
    ) {
      return fail("NOT_A_BACKUP");
    }
    if (getOwn(parsed, "backupVersion") !== BACKUP_VERSION) {
      return fail("WRONG_BACKUP_VERSION");
    }

    const stack = getOwn(parsed, "stack");
    if (isPlainObject(stack) && getOwn(stack, "schemaVersion") !== 1) {
      return fail("WRONG_STACK_VERSION");
    }
    if (!isStack(stack) || !titlesOk(stack.cards)) {
      return fail("INVALID_STACK");
    }

    return {
      ok: true,
      value: {
        schemaVersion: 1,
        id: freshId,
        name: restoredName(stack.name),
        currency: stack.currency,
        cards: stack.cards.map(rebuildCard),
      },
    };
  } catch {
    return fail("INVALID_STACK");
  }
}

const MAX_BEFORE_EXTENSION = 60;
const DATE_PART = 10; // YYYY-MM-DD
const MAX_SHOP_PART = MAX_BEFORE_EXTENSION - 1 - DATE_PART; // 49

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Builds the file name for a backup: `<shop>-YYYY-MM-DD.json`. `month` is 1 to 12. */
export function backupFileName(
  shopName: string,
  date: { year: number; month: number; day: number },
): string {
  const cleaned = shopName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const shop = cutText(cleaned === "" ? "shop" : cleaned, MAX_SHOP_PART).replace(
    /-+$/,
    "",
  );
  const stamp = `${String(date.year).padStart(4, "0")}-${pad2(date.month)}-${pad2(date.day)}`;
  return `${shop}-${stamp}.json`;
}
