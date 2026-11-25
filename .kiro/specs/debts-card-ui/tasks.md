# Implementation Plan: Debts card view, "Record a debt" and "Mark as paid"

## Overview

Build from the bottom up: the two pure domain functions with their unit and property tests, domain exports, the UI error-wording helper, the component test setup (jsdom and `@testing-library/react`), the Debt_Form, the Debts_Card_View, the `DebtsPanel` and App_Shell wiring, then component tests and a final check. Each property test sits in the same group as the function it covers (Requirement 8.13) and runs at least 100 cases. Existing behaviour, existing tests' expected results and the Daily summary do not change.

## Tasks

- [x] 1. `debtsUnpaidFirst` in the domain
  - [x] 1.1 Implement `debtsUnpaidFirst` in `src/domain/debts.ts`
    - Signature `debtsUnpaidFirst(debts: readonly Debt[]): Debt[]`. Map to `{ debt, index, t: Date.parse(debt.date) }`. Sort with a comparator: unpaid group before paid group; within a group, unparseable dates (`NaN`) last; parsed dates newest first; equal dates (or both unparseable) by `index` descending. Return `indexed.map((e) => e.debt)` as a new array of the same Debt references.
    - Pure. No clock, no mutation of the input or any Debt. An empty list returns `[]`. Leave `recordDebt`, `settleDebt` and `totalOwed` unchanged.
    - _Requirements: 1.1 to 1.7_
  - [x] 1.2 Write unit tests in `src/domain/debts.test.ts`
    - Add examples only; do not edit existing tests. Cover: an empty list gives `[]`; a mix of paid and unpaid Debts puts all unpaid first; two Debts in the same group with the same date (later input position first); a Debt with an unparseable date mixed with valid ones in the same group sorts last in that group; two unparseable dates keep later-first order; the input array order is unchanged after the call.
    - _Requirements: 1.1 to 1.7, 8.1, 8.2_
  - [x] 1.3 Write fast-check property test for permutation
    - File: `src/domain/debts.property.test.ts`. At least 100 runs. Add the shared generators here and leave the existing `debtArb`, `debtsArb`, `stackArb` and invariant-5 test untouched: `arbIsoInstant`, `arbDebtDate` (`fc.oneof` weights 4 to 1 between valid instants and unparseable strings such as `""`, `"not-a-date"`, `"2024-13-45"`), `arbCustomerName` (base names with padding, extra inner spaces and case variants), and `arbDebtWithKeyCollisions` / a list generator with unique ids, bounded amounts (1 to 1,000,000) and short lists (0 to 8).
    - Check the same Debt objects by reference, none lost, none repeated, none added.
    - **Property 1: `debtsUnpaidFirst` is a permutation of its input**
    - **Validates: Requirements 1.1, 1.7, 8.4, 8.14, 8.15**
  - [x] 1.4 Write fast-check property test for ordering
    - Use the same bounded generators and `arbDebtDate`. Check unpaid before paid, newest first within each group, unparseable after valid in the same group, and later-input-first for equal dates or two unparseable dates.
    - **Property 2: `debtsUnpaidFirst` groups unpaid before paid and orders each group newest-first with later-input ties winning**
    - **Validates: Requirements 1.2, 1.3, 1.4, 8.5, 8.14**
  - [x] 1.5 Write fast-check property test for frozen input (`debtsUnpaidFirst` part)
    - Reuse the existing `deepFreeze` helper. Compare the input with a snapshot taken before the call. Use `arbDebtDate` so unparseable dates are covered.
    - **Property 7: `debtsUnpaidFirst` and `debtsByCustomer` never mutate a frozen input (`debtsUnpaidFirst` part)**
    - **Validates: Requirements 1.5, 1.6, 8.6, 8.14**

- [x] 2. `debtsByCustomer` in the domain
  - [x] 2.1 Implement `CustomerTotal`, `customerKey` and `debtsByCustomer` in `src/domain/debts.ts`
    - Export `interface CustomerTotal { name: string; total: Kobo }`. Add an unexported `customerKey(customer)`: `trim()`, collapse `\s+` to one space, `toLowerCase()`. No accent folding.
    - Signature `debtsByCustomer(debts: readonly Debt[]): Result<CustomerTotal[]>`. Walk the Debts in order, skip every paid Debt. For each unpaid Debt, insert a key on first sight with `name: debt.customer.trim()` and its first index, then add `debt.amount` to that key's total. Check `Number.isSafeInteger` after every addition and return `err("AMOUNT_TOO_BIG")` at once if it fails. Sort by `total` descending, ties by smaller first index. Drop the internal first index from the returned entries. Return `ok([])` when no unpaid Debt exists.
    - Pure. No clock, no mutation of the input or any Debt, never `NaN`. Reuse the existing `AMOUNT_TOO_BIG` code; do not touch `src/domain/result.ts`.
    - _Requirements: 2.1 to 2.10_
  - [x] 2.2 Write unit tests in `src/domain/debts.test.ts`
    - Add examples only. Cover: an empty list gives `ok([])`; only paid debts give `ok([])`; "Ada", " ada " and "ADA" make one customer; the name is the trimmed text of the first unpaid debt, not a later or lower-cased one; a paid debt for a customer does not add to their total; a tie between two totals puts the customer whose first unpaid debt came earlier first; a list that overflows on a later addition returns `AMOUNT_TOO_BIG` and not a partial list.
    - _Requirements: 2.1 to 2.10, 8.1, 8.3_
  - [x] 2.3 Write fast-check property test for ignoring paid debts
    - File: `src/domain/debts.property.test.ts`. At least 100 runs. Compare the result for a list with the result after changing a paid Debt's customer, amount or date, and after adding or removing paid Debts. Use the bounded generators.
    - **Property 3: `debtsByCustomer` ignores every paid debt**
    - **Validates: Requirements 2.2, 8.8, 8.14**
  - [x] 2.4 Write fast-check property test for grouping, name and sum
    - Use `arbCustomerName` so names that must collide and names that must not both occur. Compute the expected groups with an independent reference implementation of the Customer key inside the test. Check one entry per distinct key, `name` equal to the trimmed first unpaid name, `total` equal to the sum, and no entry for a key with no unpaid Debt.
    - **Property 4: `debtsByCustomer` groups unpaid debts by Customer key, with the first-typed name and the correct sum**
    - **Validates: Requirements 2.3, 2.4, 8.9, 8.14**
  - [x] 2.5 Write fast-check property test for ordering
    - Check largest total first, and for equal totals the customer whose first unpaid Debt appears earlier in the input first. Bounded generators with few base names so ties occur often.
    - **Property 5: `debtsByCustomer` orders Customer totals largest-first with earlier-first-appearance ties winning**
    - **Validates: Requirements 2.5, 8.9, 8.14**
  - [x] 2.6 Write fast-check property test for overflow and `NaN`
    - Add `arbOverflowingDebts`: short lists of unpaid Debts sharing one Customer key with amounts near `Number.MAX_SAFE_INTEGER`. This is the one property that does not use bounded generators. Compare with a `BigInt` sum. Assert the result is either `ok` with every `total` a safe integer (equal to the exact sum), or an error with code `AMOUNT_TOO_BIG`; never `NaN`, `Infinity` or an unsafe number. Also run it on the ordinary bounded lists.
    - **Property 6: `debtsByCustomer` never returns `NaN` or an unsafe total, and overflow always returns `AMOUNT_TOO_BIG`**
    - **Validates: Requirements 2.7, 2.10, 8.11, 8.14, 8.15**
  - [x] 2.7 Write fast-check property test for frozen input (`debtsByCustomer` part)
    - Deep-freeze the input and call `debtsByCustomer` with valid and overflowing lists. Compare with a snapshot taken before the call.
    - **Property 7: `debtsUnpaidFirst` and `debtsByCustomer` never mutate a frozen input (`debtsByCustomer` part)**
    - **Validates: Requirements 2.8, 2.9, 8.10, 8.14**
  - [x] 2.8 Write fast-check property test for the sum of Customer totals
    - Skip cases where `debtsByCustomer` returns an error. Compare the sum of the totals with the existing `totalOwed` of the same list (money-rules invariant 5).
    - **Property 8: The sum of Customer totals equals `totalOwed`**
    - **Validates: Requirements 8.7, 8.14**
  - [x] 2.9 Write fast-check property test for settling a debt
    - Generate a Stack with a Debts card holding at least one unpaid Debt and pick one unpaid Debt `d`. Call the existing `settleDebt`, then compare `debtsByCustomer` before and after by Customer key. The total for `d`'s key falls by exactly `d.amount` (absent means 0), and every other key is unchanged. Do not compare displayed names.
    - **Property 9: Settling a debt reduces exactly that customer's total by that debt's amount**
    - **Validates: Requirements 8.12, 8.14**

- [x] 3. Domain exports
  - [x] 3.1 Export `debtsUnpaidFirst`, `debtsByCustomer` and the `CustomerTotal` type from `src/domain/index.ts`
    - Add only new exports. Do not export anything from `src/domain-ui/` here.
    - _Requirements: 1.1, 2.1_

- [x] 4. `debtFieldErrorFor` in the UI layer
  - [x] 4.1 Implement `debtFieldErrorFor` in `src/domain-ui/debtErrors.ts`
    - `debtFieldErrorFor(code: ErrorCode): string`. For `BAD_AMOUNT`, `AMOUNT_TOO_BIG` and `BAD_PRICE` return "Please type an amount using numbers only, like 1250 or 1250.50." For every other code return `ERROR_MESSAGES[code]`. Import `ErrorCode` and `ERROR_MESSAGES` from `src/domain/result.ts` for reading only; do not change that file.
    - _Requirements: 4.14_
  - [x] 4.2 Write unit tests in `src/domain-ui/debtErrors.test.ts`
    - `BAD_AMOUNT`, `AMOUNT_TOO_BIG` and `BAD_PRICE` return the one friendly sentence, and it never contains "kobo" (case-insensitive). Every other `ErrorCode` returns `ERROR_MESSAGES[code]` unchanged (loop over all codes).
    - _Requirements: 4.14, 8.1_

- [x] 5. Component test setup
  - [x] 5.1 Install `jsdom` and `@testing-library/react` as dev dependencies
    - Run `npm install --save-dev jsdom @testing-library/react` (pre-approved by Requirement 8.17; `@testing-library/dom` arrives as a peer). Check the installed `@testing-library/react` version supports the installed React version, and install the peer package by hand if npm does not. Do not add `@testing-library/jest-dom` or any other package. Do not change `vite.config.ts`.
    - _Requirements: 8.17_
  - [x] 5.2 Create `src/test/setup.ts`
    - Call `afterEach(cleanup)` with `cleanup` from `@testing-library/react`. Define `crypto.randomUUID` only when `typeof crypto?.randomUUID !== "function"`. It is imported explicitly by component tests, not registered through `setupFiles`.
    - _Requirements: 8.16, 8.17_

- [x] 6. Debt_Form
  - [x] 6.1 Create `DebtForm.tsx` in `src/components/cards/`
    - Props `initialCustomerText`, `initialAmountText`, `onSubmit(customerText, amountText)`, `onCancel`, `customerError`, `amountError`, `formError`, `idPrefix`. Two `Field`s: customer name (plain text) and amount (`inputMode="decimal"`), each given its own error so the shared `Field` links it with `aria-describedby` and `role="alert"`. `formError` in a `role="alert"` paragraph at the top. Save and Cancel `Button`s. Same form chrome as `SaleForm` and `ItemForm`. Keep the typed text in local state. Give the customer Field a stable id (`{idPrefix}-customer`) so the view can focus it. Do not change `Field.tsx`.
    - _Requirements: 4.2, 4.13_

- [x] 7. Debts_Card_View
  - [x] 7.1 Create `DebtsCardView.tsx` and `DebtsCardView.css` in `src/components/cards/`: display
    - Props `stack`, `card`, `onStackChange`. A `Card` with the card's title. Total owed at the top: `totalOwed(card.debts)`; show `formatKobo(owed)` when `Number.isSafeInteger(owed)`, otherwise show `ERROR_MESSAGES.AMOUNT_TOO_BIG` in its place and keep rendering the rest. "Who owes you" list from `debtsByCustomer`: show the error's message in place of the list when it fails, "No one owes you money right now." when the list is empty, otherwise name and `formatKobo(total)` per row. Full list from `debtsUnpaidFirst`: customer name, `formatKobo(amount)`, `new Date(debt.date).toLocaleString()` (an unparseable date shows "Invalid Date" and never throws), and a status label with icon ("● Not paid" or "✓ Paid", icon `aria-hidden`). Empty state "You have no debts recorded yet." with total ₦0.00. One always-mounted "Record a debt" `Button` (also in the empty state) with `recordButtonRef`. A "Mark as paid" `Button` only on unpaid rows, with `data-debt-pay-button={debt.id}`. Add `rootRef` on the root element. Play mode only, no edit or delete control, no mode prop.
    - Simple English. CSS uses theme variables only, no new focus rule, rows wrap at 360px with no sideways scrolling, tap areas at least `var(--tap-min)`.
    - Buttons may have no handlers yet; later tasks add the flows.
    - _Requirements: 3.1 to 3.12, 4.1, 5.1, 5.9, 7.1, 7.2_
  - [x] 7.2 Add the "Record a debt" flow to `DebtsCardView.tsx`
    - `formMode` and `debtForm` state as in the design. Tapping "Record a debt" clears the form text and opens `DebtForm`. A `useEffect` keyed on the form opening focuses the customer Field (by `document.getElementById` on its id, or a ref, whichever leaves `Field.tsx` unchanged). On save: `parseKobo(amountText)` first (on failure show `debtFieldErrorFor(code)` next to the amount Field, keep both typed texts, no `recordDebt` call). Otherwise call `recordDebt({ stack, debtsCardId: card.id, customer, amount, debtId: crypto.randomUUID(), date: new Date().toISOString() })`, with id and time read in this UI layer. `BAD_CUSTOMER` shows the message next to the customer Field. `BAD_AMOUNT` and `AMOUNT_TOO_BIG` show `debtFieldErrorFor(code)` next to the amount Field. Any other error shows its message at the top of the form. All error paths keep the form open and the typed text. On success close the form, call `onStackChange`, show the "Debt recorded" notice and set `pendingFocus` to the "record" opener. Cancel closes the form with no domain call and sets the same `pendingFocus`.
    - _Requirements: 4.2 to 4.11, 4.14, 9.1, 9.2_
  - [x] 7.3 Add the "Mark as paid" flow and the notices to `DebtsCardView.tsx`
    - `confirm` state is one value (`closed` or `confirm-pay` with a `debtId`), so only one confirmation shows at a time. Tapping "Mark as paid" clears `settleError` and opens the confirmation showing the customer's name and `formatKobo(amount)` with "Yes, mark as paid" and "Not yet" `Button`s. All "Mark as paid" buttons and "Record a debt" stay mounted while it is open. "Yes, mark as paid" calls `settleDebt({ stack, debtsCardId: card.id, debtId })`: on success close, call `onStackChange`, show "Debt marked as paid", set `pendingFocus` to `{ kind: "pay", debtId }`; on error close, show the message in a `role="alert"` paragraph near the list, leave the Stack unchanged (no `onStackChange` call) and set the same `pendingFocus`. "Not yet" closes with no `settleDebt` call and sets `pendingFocus`.
    - Notices: one always-present `<p aria-live="polite">`, one `notice` state, one `noticeTimeout` ref. `showNotice(text)` clears any pending timeout, sets the text and clears it after 3000 ms. A `useEffect` with an empty dependency list clears the pending timeout on unmount so nothing sets state on a removed view.
    - _Requirements: 4.12, 5.1 to 5.10_
  - [x] 7.4 Add focus management to `DebtsCardView.tsx`
    - `pendingFocus` is `{ kind: "record" } | { kind: "pay"; debtId } | undefined`. A `useEffect` on `[pendingFocus, card.debts]` finds the target: for `pay`, `rootRef.current?.querySelector('[data-debt-pay-button="<CSS.escape(debtId)>"]')`; for `record`, `recordButtonRef.current`. It focuses the target or falls back to `recordButtonRef.current`, then clears `pendingFocus`. When the confirmation opens, a `useEffect` keyed on `confirm` focuses "Not yet" through `notYetButtonRef`. The form's error paths do not set `pendingFocus`, since the form stays open. Use `CSS.escape` only if jsdom provides it, otherwise write a small safe fallback so the component tests run; do not use non-null assertions.
    - _Requirements: 9.1 to 9.3_

- [x] 8. `DebtsPanel` and App_Shell wiring
  - [x] 8.1 Create `DebtsPanel.tsx` in `src/components/cards/`
    - Props `{ stack: Stack; card?: DebtsCard; onStackChange }`. Render `DebtsCardView` when `card` is defined, otherwise a paragraph "Debts can't be shown because this shop has no Debts card." No non-null assertion; check `card` before reading it.
    - _Requirements: 6.4, 6.5_
  - [x] 8.2 Wire the Debts tab in `src/App.tsx`
    - Narrow the lookup with a type guard: `stack?.cards.find((c): c is DebtsCard => c.type === "debts")`. In the Debts tab branch render `<DebtsPanel stack={stack} card={debtsCard} onStackChange={onStackChange} />` where the "Coming soon" paragraph is now, using the same save-queue handler the Stock tab already uses. Only the Debts branch changes: leave the Tab_Bar, the other three views, the load effect, the save queue, retry, and the theme toggle as they are. Do not change `DailySummaryCardView.tsx` (it already uses `totalOwed` and `formatKobo`).
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 7.1 to 7.4_

- [x] 9. Component tests in `src/components/cards/DebtsCardView.test.tsx`
  - [x] 9.1 Create the test file with fixtures and the display tests
    - First line `// @vitest-environment jsdom`, second line `import "../../test/setup";`. Add helpers that build a Stack with a Debts card and render `DebtsCardView` with a spy for `onStackChange` (and a small stateful wrapper that feeds the new Stack back in, so the list re-renders after a change). Tests: the empty state shows the friendly message, a "Record a debt" button and ₦0.00; a paid debt has no "Mark as paid" button and shows "Paid"; an unpaid debt shows "Not paid" and a "Mark as paid" button; an unsafe total (amounts summing past `Number.MAX_SAFE_INTEGER` in a fixture) shows the `AMOUNT_TOO_BIG` message instead of a Naira figure while the list and the other debts still render; an unparseable date still renders the debt; the missing-card message shows when `DebtsPanel` is rendered with no `card`, and `DebtsCardView` is shown when it has one.
    - _Requirements: 3.1 to 3.9, 5.1, 6.4, 8.17_
  - [x] 9.2 Add the "Record a debt" tests
    - Successful save (the wrapper shows the new debt in the list, the total and "Who owes you"; `onStackChange` called once; the form closes); `BAD_CUSTOMER` message (empty name) appears next to the customer Field, form stays open with typed text; unreadable amount text shows the friendly wording next to the amount Field, never contains "kobo", and `recordDebt` is not reached (no `onStackChange` call); an amount that fails in `recordDebt` (for example `0`) shows the friendly wording next to the amount Field; an error shown at the top of the form (for example a Debts card id that is not in the Stack, giving `CARD_NOT_FOUND`) appears in the form-level alert; Cancel closes the form with no `onStackChange` call.
    - _Requirements: 4.2 to 4.10, 4.13, 4.14, 8.17_
  - [x] 9.3 Add the "Mark as paid" tests
    - Tapping "Mark as paid" shows the confirmation with the right name and amount; only one confirmation shows when a second "Mark as paid" is tapped; "Yes, mark as paid" settles the debt (shows "Paid", the button is gone, total owed falls by exactly that amount); "Not yet" leaves the debt unpaid with no `onStackChange` call; a `settleDebt` error (for example a Stack where the debt is already paid or missing) closes the confirmation, shows the message and leaves the Stack unchanged with no `onStackChange` call.
    - _Requirements: 5.1 to 5.4, 5.7, 5.8, 5.10, 8.17_
  - [x] 9.4 Add the notice tests with fake timers
    - Use `vi.useFakeTimers()` and `vi.advanceTimersByTime(3000)`; restore with `vi.useRealTimers()` in `afterEach`. "Debt recorded" shows in the live region after a save and clears after 3 seconds; "Debt marked as paid" does the same; a second action before 3 seconds restarts the timer (the first timer does not clear the new message early); unmounting the view with a pending notice and advancing the timers causes no React warning (spy on `console.error`) and no error.
    - _Requirements: 4.12, 5.5, 5.6, 8.17_
  - [x] 9.5 Add the focus tests
    - Opening the form moves focus to the customer Field; focus returns to "Record a debt" after Cancel and after a successful save; opening a confirmation focuses "Not yet"; after "Not yet" focus returns to that debt's "Mark as paid" button; after "Yes, mark as paid" that button is gone, so focus falls back to "Record a debt".
    - _Requirements: 9.1 to 9.3, 8.17_

- [x] 10. Final check
  - [x] 10.1 Run `npx vitest run` and `npx tsc --noEmit`. Fix any failure.
    - Existing foundation, app-shell-stock-card and sales-and-daily-summary tests must still pass with no edits to expected results. `DailySummaryCardView.tsx` and `src/domain/result.ts` must be unchanged.
    - _Requirements: 7.3, 8.1 to 8.17_
  - [x] 10.2 Run the production build.
    - _Requirements: 8.16_
  - [x] 10.3 Do a manual check in the browser and write down the result
    - Debts tab shows the real view and no "Coming soon" text. Total owed, "Who owes you" (largest first; "Ada", " ada " and "ADA" counted as one), and the full list with unpaid debts first. Status shows an icon and a word. Record a debt: form opens with focus in the customer name; empty name shows an error by the name Field; letters in the amount show "Please type an amount using numbers only, like 1250 or 1250.50." by the amount Field and never the word "kobo"; a valid debt closes the form, adds the debt, updates the total, and "Debt recorded" disappears after about 3 seconds; focus returns to "Record a debt". Mark as paid: confirmation shows the name and amount with focus on "Not yet"; "Not yet" changes nothing and returns focus to that button; "Yes, mark as paid" shows "Paid", lowers the total by that amount, and removes the button; "Debt marked as paid" disappears after about 3 seconds. Switching tab during a notice causes no console warning. Daily summary shows the same money owed as the Debts tab after each change. No sideways scroll and 44px tap areas at 360px; visible focus outline. A Stack with no Debts card shows "Debts can't be shown because this shop has no Debts card." Reload and check the debts survive.
    - _Requirements: 3.1 to 3.12, 4.1 to 4.14, 5.1 to 5.10, 6.1 to 6.6, 7.4, 9.1 to 9.3_
  - [x] 10.4 Update `KIRO_NOTES.md` counts and add a log row.
    - Add this spec to the spec count. Add Properties 1 to 9 (property tests for `debtsUnpaidFirst` and `debtsByCustomer`) and any bugs they found. Add the new unit test groups (`debtsUnpaidFirst`, `debtsByCustomer`, `debtFieldErrorFor`), the component tests, the new dev dependencies (`jsdom`, `@testing-library/react`) and the manual check items from 10.3.
    - _Requirements: 8.1 to 8.17_

## Notes

- Property tests sit next to the function they cover (Requirement 8.13) and each runs at least 100 cases. Property 7 is split across 1.5 (`debtsUnpaidFirst` part) and 2.7 (`debtsByCustomer` part) because each part sits with its function. Property 9 sits with `debtsByCustomer` in group 2 and uses the existing `settleDebt`.
- Generators for Properties 1 to 5, 8 and 9 are bounded (amounts 1 to 1,000,000, lists of 0 to 8) so a list never overflows by accident. Property 6 builds overflowing lists on purpose.
- Component tests use a per-file `// @vitest-environment jsdom` line and an explicit `import "../../test/setup";`. `vite.config.ts` does not change, so existing Node-environment tests run as before.
- Tasks 7.1 to 7.4 all edit `DebtsCardView.tsx`, and tasks 9.1 to 9.5 all edit `DebtsCardView.test.tsx`, so each runs in its own wave.
- No existing code behaviour or test expectation changes. `DailySummaryCardView.tsx`, `src/domain/result.ts`, `totalOwed`, `recordDebt` and `settleDebt` stay as they are. Only new exports, new functions, new files and the Debts branch in `src/App.tsx` are added.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["1.3", "2.2"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["2.3"] },
    { "id": 6, "tasks": ["2.4"] },
    { "id": 7, "tasks": ["2.5"] },
    { "id": 8, "tasks": ["2.6"] },
    { "id": 9, "tasks": ["2.7"] },
    { "id": 10, "tasks": ["2.8"] },
    { "id": 11, "tasks": ["2.9"] },
    { "id": 12, "tasks": ["3.1", "4.1", "5.1"] },
    { "id": 13, "tasks": ["4.2", "5.2"] },
    { "id": 14, "tasks": ["6.1"] },
    { "id": 15, "tasks": ["7.1"] },
    { "id": 16, "tasks": ["7.2"] },
    { "id": 17, "tasks": ["7.3"] },
    { "id": 18, "tasks": ["7.4"] },
    { "id": 19, "tasks": ["8.1"] },
    { "id": 20, "tasks": ["8.2", "9.1"] },
    { "id": 21, "tasks": ["9.2"] },
    { "id": 22, "tasks": ["9.3"] },
    { "id": 23, "tasks": ["9.4"] },
    { "id": 24, "tasks": ["9.5"] },
    { "id": 25, "tasks": ["10.1"] },
    { "id": 26, "tasks": ["10.2"] },
    { "id": 27, "tasks": ["10.3"] },
    { "id": 28, "tasks": ["10.4"] }
  ]
}
```
