import { describe, expect, it } from "vitest";
import type { Stack } from "../domain/types";
import {
  BACKUP_ERROR_MESSAGES,
  NAME_LIMIT,
  RESTORED_NAME_FALLBACK,
  RESTORED_SUFFIX,
  SIZE_LIMIT,
  backupFileName,
  parseBackup,
  serializeStack,
  type BackupErrorCode,
} from "./backup";

const FRESH = "fresh-id";

function makeStack(overrides: Partial<Stack> = {}): Stack {
  return {
    schemaVersion: 1,
    id: "old-id",
    name: "Provisions Shop",
    currency: "NGN",
    cards: [
      {
        id: "c1",
        type: "stock",
        title: "Stock",
        items: [
          {
            id: "i1",
            name: "Rice",
            quantity: 5,
            costPrice: 100,
            sellPrice: 150,
            lowStockLevel: 2,
          },
        ],
      },
      { id: "c2", type: "sales-log", title: "Sales", sales: [] },
      { id: "c3", type: "debts", title: "Debts", debts: [], hidden: true },
      { id: "c4", type: "daily-summary", title: "Today" },
    ],
    ...overrides,
  };
}

function withCardTitle(title: string): string {
  const stack = makeStack();
  stack.cards[0].title = title;
  return serializeStack(stack);
}

function codeOf(text: string): BackupErrorCode | "OK" {
  const r = parseBackup(text, FRESH);
  return r.ok ? "OK" : r.error.code;
}

function nameOf(name: string): string {
  const r = parseBackup(serializeStack(makeStack({ name })), FRESH);
  if (!r.ok) throw new Error("expected ok, got " + r.error.code);
  return r.value.name;
}

describe("parseBackup error codes", () => {
  it("accepts a saved backup and uses the fresh id", () => {
    const r = parseBackup(serializeStack(makeStack()), FRESH);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id).toBe(FRESH);
      expect(r.value.cards).toEqual(makeStack().cards);
    }
  });

  it("TOO_LARGE with its message", () => {
    const r = parseBackup(" ".repeat(SIZE_LIMIT + 1), FRESH);
    expect(r).toEqual({
      ok: false,
      error: { code: "TOO_LARGE", message: BACKUP_ERROR_MESSAGES.TOO_LARGE },
    });
  });

  it("NOT_JSON", () => {
    expect(codeOf("hello")).toBe("NOT_JSON");
    expect(codeOf('{"format":')).toBe("NOT_JSON");
  });

  it("NOT_A_BACKUP", () => {
    expect(codeOf("[]")).toBe("NOT_A_BACKUP");
    expect(codeOf("null")).toBe("NOT_A_BACKUP");
    expect(codeOf("42")).toBe("NOT_A_BACKUP");
    expect(codeOf('{"format":"other","backupVersion":1,"stack":{}}')).toBe(
      "NOT_A_BACKUP",
    );
    expect(codeOf('{"format":"ghoststack-backup","backupVersion":1}')).toBe(
      "NOT_A_BACKUP",
    );
  });

  it("WRONG_BACKUP_VERSION", () => {
    const file = JSON.parse(serializeStack(makeStack()));
    file.backupVersion = 2;
    expect(codeOf(JSON.stringify(file))).toBe("WRONG_BACKUP_VERSION");
    delete file.backupVersion;
    expect(codeOf(JSON.stringify(file))).toBe("WRONG_BACKUP_VERSION");
  });

  it("WRONG_STACK_VERSION", () => {
    const file = JSON.parse(serializeStack(makeStack()));
    file.stack.schemaVersion = 2;
    expect(codeOf(JSON.stringify(file))).toBe("WRONG_STACK_VERSION");
  });

  it("INVALID_STACK", () => {
    const file = JSON.parse(serializeStack(makeStack()));
    file.stack.cards[0].items[0].quantity = -1;
    expect(codeOf(JSON.stringify(file))).toBe("INVALID_STACK");
    const file2 = JSON.parse(serializeStack(makeStack()));
    file2.stack = "text";
    expect(codeOf(JSON.stringify(file2))).toBe("INVALID_STACK");
  });
});

describe("parseBackup size limit", () => {
  it("empty text is NOT_JSON", () => {
    expect(codeOf("")).toBe("NOT_JSON");
  });

  it("spaces only is NOT_JSON", () => {
    expect(codeOf("     ")).toBe("NOT_JSON");
  });

  it("exactly SIZE_LIMIT bytes passes the size check", () => {
    expect(codeOf(" ".repeat(SIZE_LIMIT))).toBe("NOT_JSON");
    const base = serializeStack(makeStack());
    const padded = base + " ".repeat(SIZE_LIMIT - base.length);
    expect(new TextEncoder().encode(padded).length).toBe(SIZE_LIMIT);
    expect(codeOf(padded)).toBe("OK");
  });

  it("one byte over SIZE_LIMIT is TOO_LARGE", () => {
    const base = serializeStack(makeStack());
    const padded = base + " ".repeat(SIZE_LIMIT + 1 - base.length);
    expect(codeOf(padded)).toBe("TOO_LARGE");
  });

  it("counts multibyte text in bytes", () => {
    // 2-byte characters: exactly the limit, then two bytes over.
    expect(codeOf("é".repeat(SIZE_LIMIT / 2))).toBe("NOT_JSON");
    expect(codeOf("é".repeat(SIZE_LIMIT / 2 + 1))).toBe("TOO_LARGE");
    // 4-byte characters (surrogate pairs): fewer than SIZE_LIMIT characters.
    expect(codeOf("😀".repeat(SIZE_LIMIT / 4))).toBe("NOT_JSON");
    expect(codeOf("😀".repeat(SIZE_LIMIT / 4 + 1))).toBe("TOO_LARGE");
    // 3-byte characters.
    expect(codeOf("€".repeat(Math.floor(SIZE_LIMIT / 3) + 1))).toBe(
      "TOO_LARGE",
    );
  });
});

describe("parseBackup restored name", () => {
  it("29 characters keep the whole name", () => {
    const name = "a".repeat(29);
    const out = nameOf(name);
    expect(out).toBe(name + RESTORED_SUFFIX);
    expect(out.length).toBe(NAME_LIMIT);
  });

  it("30 characters are cut to 29 before the suffix", () => {
    const out = nameOf("a".repeat(30));
    expect(out).toBe("a".repeat(29) + RESTORED_SUFFIX);
    expect(out.length).toBe(NAME_LIMIT);
  });

  it("40 characters are cut to 29 before the suffix", () => {
    const out = nameOf("b".repeat(40));
    expect(out).toBe("b".repeat(29) + RESTORED_SUFFIX);
    expect(out.length).toBe(NAME_LIMIT);
  });

  it("empty and spaces-only names give the fallback", () => {
    expect(nameOf("")).toBe(RESTORED_NAME_FALLBACK);
    expect(nameOf("    ")).toBe("My shop (restored)");
  });

  it("trims the name and removes spaces left by the cut", () => {
    expect(nameOf("  Shop  ")).toBe("Shop" + RESTORED_SUFFIX);
    expect(nameOf("a".repeat(28) + " " + "b".repeat(5))).toBe(
      "a".repeat(28) + RESTORED_SUFFIX,
    );
  });
});

describe("parseBackup hostile input", () => {
  it("deep nesting gives NOT_JSON", () => {
    expect(codeOf("[".repeat(100000))).toBe("NOT_JSON");
  });

  it("a __proto__ key does not count as format or stack", () => {
    const text =
      '{"__proto__":{"format":"ghoststack-backup","backupVersion":1,"stack":{}}}';
    expect(codeOf(text)).toBe("NOT_A_BACKUP");
  });

  it("a __proto__ key inside the stack is dropped and pollutes nothing", () => {
    const file = serializeStack(makeStack()).replace(
      '"currency"',
      '"__proto__": {"polluted": true}, "currency"',
    );
    const r = parseBackup(file, FRESH);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.prototype.hasOwnProperty.call(r.value, "__proto__")).toBe(
        false,
      );
      expect(Object.getPrototypeOf(r.value)).toBe(Object.prototype);
      expect((r.value as unknown as { polluted?: boolean }).polluted).toBe(
        undefined,
      );
    }
    expect(({} as { polluted?: boolean }).polluted).toBe(undefined);
  });

  it("drops unknown keys", () => {
    const file = JSON.parse(serializeStack(makeStack()));
    file.stack.extra = 1;
    file.stack.cards[0].items[0].extra = 2;
    const r = parseBackup(JSON.stringify(file), FRESH);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ ...makeStack(), id: FRESH, name: "Provisions Shop" + RESTORED_SUFFIX });
  });
});

describe("parseBackup card titles", () => {
  it("rejects an empty title", () => {
    expect(codeOf(withCardTitle(""))).toBe("INVALID_STACK");
  });

  it("rejects a spaces-only title", () => {
    expect(codeOf(withCardTitle("   "))).toBe("INVALID_STACK");
  });

  it("rejects 41 characters", () => {
    expect(codeOf(withCardTitle("t".repeat(41)))).toBe("INVALID_STACK");
  });

  it("accepts 41 characters that trim to 40", () => {
    expect(codeOf(withCardTitle(" " + "t".repeat(40)))).toBe("OK");
  });

  it("accepts exactly 40 characters", () => {
    expect(codeOf(withCardTitle("t".repeat(40)))).toBe("OK");
  });
});

describe("backupFileName", () => {
  it("builds a name from shop and date", () => {
    expect(
      backupFileName("Provisions Shop", { year: 2026, month: 10, day: 31 }),
    ).toBe("provisions-shop-2026-10-31.json");
  });

  it("pads single-digit month and day", () => {
    expect(backupFileName("Shop", { year: 2026, month: 1, day: 5 })).toBe(
      "shop-2026-01-05.json",
    );
  });

  it("uses shop when the name has no letters or digits", () => {
    const date = { year: 2026, month: 3, day: 9 };
    expect(backupFileName("", date)).toBe("shop-2026-03-09.json");
    expect(backupFileName("!!! ???", date)).toBe("shop-2026-03-09.json");
    expect(backupFileName("---", date)).toBe("shop-2026-03-09.json");
  });

  it("keeps a 100-character name within 60 characters before .json", () => {
    const out = backupFileName("a".repeat(100), {
      year: 2026,
      month: 10,
      day: 31,
    });
    expect(out.endsWith("-2026-10-31.json")).toBe(true);
    expect(out.length - ".json".length).toBeLessThanOrEqual(60);
  });
});

describe("BACKUP_ERROR_MESSAGES wording", () => {
  const banned = /kobo|schema|json parse|serialize|payload|cache/i;
  for (const [code, message] of Object.entries(BACKUP_ERROR_MESSAGES)) {
    it(`${code} avoids technical words`, () => {
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(banned);
    });
  }
});
