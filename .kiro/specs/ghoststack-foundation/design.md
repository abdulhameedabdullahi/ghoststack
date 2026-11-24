# Design: GhostStack foundation

## Overview

Three layers are built here: domain (pure logic), storage (IndexedDB), and a bare app screen. Data flows as in `docs/ARCHITECTURE.md`: UI action, domain function, storage, UI. Only the domain and storage steps are built in this spec.

## Prerequisite and open point

The workspace has no `package.json`, `vite.config.ts` or `src/main.tsx`. The scaffold does not exist yet, although the request says it does. Task 1 checks for the tooling and stops for approval if it is missing. See "Dependencies" below.

## File layout

```
src/domain/
  types.ts        Stack, Card, Item, Sale, Debt, Kobo
  result.ts       Result type, DomainError, error codes and messages
  validate.ts     isWholeNumber, isPositiveWhole, isSafeMoney helpers
  sales.ts        recordSale
  debts.ts        recordDebt, settleDebt, totalOwed
  index.ts        public exports
  *.test.ts       unit tests
  *.property.test.ts   fast-check tests
src/storage/
  db.ts           opens the database
  stackStore.ts   saveStack, loadStack, listStacks
  isStack.ts      shape check for loaded data
  *.test.ts
src/main.tsx, src/App.tsx   bare "GhostStack" screen
```

## Domain types

All money fields are `Kobo`, an alias for `number` that must hold a safe integer. Dates and times are ISO 8601 strings, so Stacks stay plain JSON.

- **Stack:** `schemaVersion` (1), `id`, `name`, `currency` (default `"NGN"`), `cards` (ordered list of Card).
- **Card:** a union tagged by `type`. Every card has `id` and `title`.
  - `stock`: `items: Item[]`
  - `sales-log`: `sales: Sale[]`
  - `debts`: `debts: Debt[]`
  - `daily-summary`: no data
- **Item:** `id`, `name`, `quantity` (whole number, at least 0), `costPrice` (Kobo), `sellPrice` (Kobo), `lowStockLevel` (whole number).
- **Sale:** `id`, `itemId`, `quantity` (whole number, at least 1), `unitPrice` (Kobo), `unitCost` (Kobo), `time` (ISO string).
- **Debt:** `id`, `customer`, `amount` (Kobo, at least 1), `date` (ISO string), `status` (`"unpaid"` or `"paid"`).

Buttons are not part of this spec. They are added with builder mode.

A Sale copies the Item's prices at the time of sale, so later price changes do not rewrite history. `unitCost` is stored now so estimated profit (invariant 4) can be built later.

## Result and errors

```
Result<T> = { ok: true, value: T } | { ok: false, error: DomainError }
DomainError = { code: ErrorCode, message: string }
```

Error codes and messages live in one table in `result.ts`. Messages say what went wrong and what to do next.

| Code | Message |
| --- | --- |
| `BAD_QUANTITY` | "The amount must be a whole number, like 1 or 5. Please check it and try again." |
| `NOT_ENOUGH_STOCK` | "You do not have enough of this item in stock. Check the amount or add more stock." |
| `BAD_AMOUNT` | "The money amount must be more than zero. Please check it and try again." |
| `AMOUNT_TOO_BIG` | "This amount is too big to work with. Please use a smaller amount." |
| `BAD_CUSTOMER` | "Please type the customer's name." |
| `ITEM_NOT_FOUND` | "We could not find this item. Pick it from your stock list." |
| `CARD_NOT_FOUND` | "We could not find this card. Go back and pick it again." |
| `DEBT_NOT_FOUND` | "We could not find this debt. Go back and pick it from the list." |
| `DEBT_ALREADY_PAID` | "This debt is already marked as paid." |

Storage errors are separate and live in `src/storage/` (see Storage).

## Domain functions

All functions are pure. They never mutate their input and return a new Stack that shares unchanged parts. They do not read the clock or make ids. The caller passes `id` and `time` or `date`.

### recordSale

Input: `stack`, `stockCardId`, `salesCardId`, `itemId`, `quantity`, `saleId`, `time`.

Steps:
1. Check `quantity` is a whole number of at least 1. Else `BAD_QUANTITY`.
2. Find the Stock card, the Sales log card and the Item. Else `CARD_NOT_FOUND` or `ITEM_NOT_FOUND`.
3. If `quantity` is more than `item.quantity`, return `NOT_ENOUGH_STOCK`.
4. Check that `quantity * item.sellPrice` is a safe integer. Else `AMOUNT_TOO_BIG`.
5. Return a new Stack with the Item's quantity reduced by `quantity` and a new Sale appended.

Also exported: `saleTotal(sale)` returns `quantity * unitPrice`.

### recordDebt

Input: `stack`, `debtsCardId`, `customer`, `amount`, `debtId`, `date`.

Steps: check `amount` is a safe whole number of at least 1 (`BAD_AMOUNT`, or `AMOUNT_TOO_BIG` when above the safe limit). Trim `customer`; reject if empty (`BAD_CUSTOMER`). Find the card (`CARD_NOT_FOUND`). Append an unpaid Debt with the trimmed name.

### settleDebt

Input: `stack`, `debtsCardId`, `debtId`.

Steps: find the card and Debt. If already paid, return `DEBT_ALREADY_PAID`. Return a new Stack with that Debt's status set to `"paid"`. The amount is unchanged.

### totalOwed

`totalOwed(debts: Debt[]): Kobo` sums the amounts of unpaid Debts. Recording a debt always checks the amount is safe, but the sum of many safe amounts could pass the safe limit. Domain code treats that as outside real use; the property tests keep amounts small enough to stay safe, and `recordDebt` rejects any debt that would push the unpaid total past `Number.MAX_SAFE_INTEGER` with `AMOUNT_TOO_BIG`.

## Storage

Library: `idb`. Database name `ghoststack`, version 1, one object store `stacks` with key path `id`. The whole Stack is stored as one record. This is simple and makes saves atomic.

Functions in `stackStore.ts` take an optional database handle so tests can pass their own. They return results instead of throwing for expected cases.

- `saveStack(stack)`: put the record. Returns `{ ok: true }` or `{ ok: false, error }` if IndexedDB fails (for example, storage is full or blocked).
- `loadStack(id)`: returns `{ ok: true, value: Stack }`, or `{ ok: false, error }` with code `NOT_FOUND` or `UNREADABLE_DATA`.
- `listStacks()`: returns `{ id, name }[]`.

`isStack.ts` checks the shape of loaded data: schema version, a string id and name, and a list of cards, each with a known type and the right list field. It does not re-check business rules. On failure the error message is "We could not read your saved data. Try again, or restore from a backup."

Rules: storage imports types from the domain but never calls domain functions. The domain never imports from storage.

## Bare app screen

`main.tsx` mounts `App`, which shows the heading "GhostStack" and one short line of text. No cards, no builder, no styling beyond the browser default. Styling comes with the design work later.

## Testing strategy

Vitest runs all tests. fast-check runs the property tests, each with at least 100 runs (`numRuns: 100` or more).

### Generators

- `kobo`: `fc.integer({ min: 0, max: 1_000_000_00 })`
- `item`: id, name, quantity 0 to 1000, prices from `kobo`
- `stack`: a Stack with one card of each type, with generated Items and Debts
- `saleAttempt`: an item id (valid or not) and a quantity (including 0, negative and too large)
- `operation`: one of a sale attempt, a debt record or a debt settle

### Property tests

| Invariant | Property |
| --- | --- |
| 1 | After any sequence of sale attempts, every Item quantity is 0 or more. Any attempt with quantity above stock returns `NOT_ENOUGH_STOCK` and leaves the Stack equal to before. |
| 2 | When a sale succeeds, the Item's new quantity equals the old quantity minus the quantity sold, and every other Item is unchanged. |
| 5 | Total owed equals the sum of unpaid Debt amounts. Settling an unpaid Debt lowers total owed by exactly its amount. |
| 7 | After any sequence of operations (successful or rejected), no number in the Stack is NaN, no Item quantity is negative, and every money value is a safe integer. |

Properties that check "the Stack is unchanged on error" use deep equality against a copy taken before the call, which also covers the "no mutation" requirements.

### Unit tests

Example-based tests cover each acceptance criterion that is not a general property: each error code, trimming of the customer name, copying prices into a Sale, settling an already paid Debt, and missing cards.

Storage tests use `fake-indexeddb` and cover: save then load returns an equal Stack, saving again replaces the record, loading an unknown id returns `NOT_FOUND`, a malformed record returns `UNREADABLE_DATA`, and `listStacks` returns saved ids and names.

## Dependencies

Per `tech.md`, new packages need approval. This spec needs:

- Already named in `tech.md`: `vite`, `react`, `react-dom`, `typescript`, `idb`, `vitest`, `fast-check`.
- **Needs approval:** `fake-indexeddb` (dev only), to test storage in Node. Without it, storage tests would need a browser runner.
- Standard Vite React template packages (`@vitejs/plugin-react`, React type packages) are assumed part of "Vite + React + TypeScript".

## Decisions

- **One record per Stack in storage.** Alternative: one record per Item, Sale and Debt. That allows smaller writes but makes saves non-atomic and needs more code. A shop's data is small, so one record is enough for v1.
- **Caller supplies ids and time.** Keeps domain functions deterministic, which makes property tests reproducible.
- **Results instead of exceptions.** Expected failures (bad input, not enough stock) are normal outcomes, and the UI needs messages for them.
- **Sale copies prices.** Keeps history correct if prices change.
