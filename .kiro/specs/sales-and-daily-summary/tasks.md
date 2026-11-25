# Implementation Plan: Sales log, Daily summary and tab bar

## Overview

Build from the bottom up: pure domain functions with their tests, domain exports, the UI-layer helpers (`formatSignedKobo` and the day range), the Tab_Bar, the record-a-sale flow, the two new card views, then App_Shell wiring and a final check. Each property test sits in the same group as the function it covers. Existing behaviour and existing tests do not change.

## Tasks

- [x] 1. `dailyTotal` and `estimatedProfit` in the domain
  - [x] 1.1 Implement `dailyTotal` in `src/domain/sales.ts`
    - Signature `dailyTotal(sales, start, end): Result<Kobo>`. Parse `start` and `end` once with `Date.parse`. For each Sale parse its `time`; skip it if `NaN`, before `start`, or at or after `end`. Compute the Sale's own amount `quantity * unitPrice` and check it with `Number.isSafeInteger` before adding it to the running sum; return `err("AMOUNT_TOO_BIG")` if the amount is unsafe. Then add it to the running sum and return `err("AMOUNT_TOO_BIG")` as soon as the sum is not a safe integer. Return `ok(0)` when nothing is in range.
    - Pure. No clock, no string comparison of times, no mutation of inputs. Reuse the existing `AMOUNT_TOO_BIG` code. Leave `saleTotal` and `recordSale` unchanged.
    - _Requirements: 1.1 to 1.8_
  - [x] 1.2 Implement `estimatedProfit` in `src/domain/sales.ts`
    - Same shape as `dailyTotal`, adding `(unitPrice - unitCost) * quantity` per Sale. Check each Sale's own amount with `Number.isSafeInteger` before adding it to the running sum, and return `err("AMOUNT_TOO_BIG")` if the amount is unsafe. Use each Sale's own `unitPrice` and `unitCost`, never an Item's current prices.
    - Design decision: both functions stop at the first unsafe running sum. For `estimatedProfit` an amount can be negative, so a list whose final sum is safe can still return `AMOUNT_TOO_BIG` if an earlier partial sum overflowed, and the same Sales in another order might succeed. This is accepted; do not "fix" it by summing differently.
    - _Requirements: 2.1 to 2.9_
  - [x] 1.3 Write unit tests in `src/domain/sales.test.ts`
    - Add examples only; do not edit existing tests. Cover: empty Sales gives `ok(0)`; a Sale exactly at `start` is included; a Sale exactly at `end` is excluded; a Sale with an unparseable time mixed with valid Sales is skipped and the result is not `NaN`; a sum that overflows on the second Sale returns `AMOUNT_TOO_BIG` and not a partial sum; `estimatedProfit` uses the Sale's stored prices; a negative profit (price below cost) works.
    - _Requirements: 1.1 to 1.8, 2.1 to 2.9, 8.1_
  - [x] 1.4 Write fast-check property test for `dailyTotal` window sum
    - File: `src/domain/sales.property.test.ts`. At least 100 runs. Add the shared generators here: `arbIsoInstant`, `arbUnparseableTime`, `arbSale`, `arbDayRange`.
    - Use bounded generators (`quantity` 1 to 50, the existing bounded price generator, short lists) so a generated list never overflows by accident. Only Property 21 builds overflowing lists, on purpose.
    - **Property 16: `dailyTotal` equals the sum of in-range sale amounts**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.7, 8.2, 8.7**
  - [x] 1.5 Write fast-check property test for `estimatedProfit` window sum
    - Use the same bounded generators. This matters most here: `estimatedProfit` stops at the first unsafe running sum, so its result can depend on order when amounts are negative. Bounded values keep every generated case away from that order-dependent overflow.
    - **Property 17: `estimatedProfit` equals the sum of in-range profit amounts**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.8, 8.3, 8.7**
  - [x] 1.6 Write fast-check property test for split-point additivity
    - Add `arbSplitInstant`. Use the bounded generators. Skip cases where either call returns an error.
    - **Property 18: Split-point additivity for daily totals and estimated profit**
    - **Validates: Requirements 8.9**
  - [x] 1.7 Write fast-check property test for unparseable times
    - Mix unparseable times into the Sales with `fc.oneof` weights 4 to 1. Use the bounded generators.
    - **Property 20: Unparseable Sale times never make a total `NaN`**
    - **Validates: Requirements 1.8, 2.9, 8.4, 8.11**
  - [x] 1.8 Write fast-check property test for overflow
    - Generate Sales with large prices and quantities near `Number.MAX_SAFE_INTEGER` on purpose so the in-range sum can pass the safe limit. This is the one property that does not use bounded generators. Compare with a `BigInt` sum, and only assert `AMOUNT_TOO_BIG` for cases where the true total (and, for `estimatedProfit`, a partial sum) is unsafe, as the design's stop-at-first-unsafe-sum decision describes. Also assert that whenever the result is ok, its value equals the exact `BigInt` sum of the in-range amounts.
    - **Property 21: Overflow always returns an error, never an unsafe number**
    - **Validates: Requirements 1.6, 2.7, 8.4**
  - [x] 1.9 Write fast-check property test for frozen Sales input
    - Deep-freeze the Sales and call `dailyTotal` and `estimatedProfit` with valid and overflowing input. Compare with a snapshot taken before the call. Bounded generators for the valid cases.
    - **Property 22: `dailyTotal`, `estimatedProfit` and `lowStockItems` never mutate a frozen input (Sales part)**
    - **Validates: Requirements 1.5, 2.6, 8.5**

- [x] 2. `salesNewestFirst` in the domain
  - [x] 2.1 Implement `salesNewestFirst` in `src/domain/sales.ts`
    - Map to `{ sale, index }`, sort with a comparator: unparseable times last, parsed times descending, equal times by `index` descending. Return the Sales in a new array. Never write to the input.
    - _Requirements: 5.2, 5.3_
  - [x] 2.2 Write unit tests in `src/domain/sales.test.ts`
    - Cover: an already-sorted input; two Sales with the same time (later input position first); a Sale with an unparseable time sorts last; two unparseable times keep later-first order; an empty list; the input array order is unchanged after the call.
    - _Requirements: 5.2, 5.3_
  - [x] 2.3 Write fast-check property test for `salesNewestFirst`
    - File: `src/domain/sales.property.test.ts`. At least 100 runs. Check permutation by reference, descending order, unparseable last, later-input-first ties, and a deep-frozen input left unchanged.
    - **Property 23: `salesNewestFirst` is a permutation, sorted newest-first, ties broken by later input position, and does not mutate its input**
    - **Validates: Requirements 5.2, 5.3, 8.10**

- [x] 3. `lowStockItems` in the domain
  - [x] 3.1 Implement `lowStockItems` in `src/domain/items.ts`
    - Signature `lowStockItems(stack): Item[]`. Walk Stock cards in order and their Items in order, keep Items where the existing `isLowStock` is true. Do not copy the `isLowStock` logic. Leave the other item functions unchanged.
    - _Requirements: 3.1 to 3.5_
  - [x] 3.2 Write unit tests in `src/domain/items.test.ts`
    - Add examples only. Cover: a Stack with no Stock card gives `[]`; no low Items gives `[]`; two Stock cards with a mix of low and not-low Items give card-then-item order; an Item exactly at its `lowStockLevel` is included; an out-of-stock Item is included.
    - _Requirements: 3.1 to 3.5, 8.1_
  - [x] 3.3 Write fast-check property test for `lowStockItems`
    - File: `src/domain/items.property.test.ts`. At least 100 runs. Add an `arbStack` variant with two or more Stock cards and `quantity === lowStockLevel` cases.
    - **Property 19: `lowStockItems` matches `isLowStock`, in stack order**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 8.8**
  - [x] 3.4 Write fast-check property test for frozen Stack input
    - **Property 22: `dailyTotal`, `estimatedProfit` and `lowStockItems` never mutate a frozen input (Stack part)**
    - **Validates: Requirements 3.4, 8.5**

- [x] 4. Domain exports
  - [x] 4.1 Export `dailyTotal`, `estimatedProfit`, `salesNewestFirst` and `lowStockItems` from `src/domain/index.ts`
    - Add only new exports. Do not export anything from `src/domain-ui/` here.
    - _Requirements: 8.12_

- [x] 5. UI-layer helpers in `src/domain-ui/`
  - [x] 5.1 Implement `formatSignedKobo` in `src/domain-ui/money.ts`
    - `formatSignedKobo(kobo: number): string`. When `kobo < 0` return `"Loss: " + formatKobo(Math.abs(kobo))`, otherwise return `"Profit: " + formatKobo(kobo)`. Zero counts as "Profit". The sign is carried by the word, never a minus sign. Leave `formatKobo` and `parseKobo` unchanged.
    - _Requirements: 6.4_
  - [x] 5.2 Write unit tests in `src/domain-ui/money.test.ts`
    - Add examples only. Cover: zero (`"Profit: "` + `formatKobo(0)`); a positive value; a negative value (starts with `"Loss: "`, no minus sign, amount equals `formatKobo` of the absolute value); a large value (`Number.MAX_SAFE_INTEGER`) and its negation.
    - _Requirements: 8.13_
  - [x] 5.3 Write fast-check property test for `formatSignedKobo`
    - File: `src/domain-ui/money.property.test.ts`. At least 100 runs. Add `arbSafeInteger` as `fc.integer({ min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER })`.
    - **Property 24: `formatSignedKobo` labels the sign and reuses `formatKobo` for the amount**
    - **Validates: Requirements 6.4, 8.14**
  - [x] 5.4 Implement `DayRange` and `todayRange` in `src/domain-ui/dayRange.ts`
    - `todayRange(now = new Date())`. Use local getters for year, month and date. `start` is local midnight today, `end` is local midnight tomorrow built with `date + 1` (so month and year roll over, and a daylight-saving day is not forced to 24 hours). Return both as `toISOString()` strings.
    - Do not import this file from anything under `src/domain/`.
    - _Requirements: 6.2_
  - [x] 5.5 Write unit tests in `src/domain-ui/dayRange.test.ts`
    - For each fixed `Date`, parse `start` and `end` back into `Date` objects and assert that `getHours()`, `getMinutes()`, `getSeconds()` and `getMilliseconds()` are all `0` for both (local midnight). Assert `end` is the next calendar day by comparing its local year, month and date with a `Date` built from `start`'s local year, month and `date + 1`. Do not assert a fixed 24-hour gap, because a daylight-saving day is 23 or 25 hours long.
    - Cases: a mid-month `Date`; the last day of a month (end rolls into the next month); 31 December (end rolls into the next year); a time of 23:59:59.999 stays on the same day; a time of exactly local midnight gives that midnight as `start`.
    - _Requirements: 6.2, 8.1_

- [x] 6. Tab_Bar
  - [x] 6.1 Create `TabBar.tsx` and `TabBar.css` in `src/components/`
    - Props `tabs`, `selectedId`, `onSelect`. `role="tablist"` bar with `role="tab"` buttons, `id="tab-{id}"`, `aria-selected`, `aria-controls="panel-{id}"`, roving `tabIndex`. Selected tab shows a `▸` marker (`aria-hidden`) as well as `aria-selected`.
    - Keep `tabRefs = useRef<Array<HTMLButtonElement | null>>([])`, filled by a `ref` callback on each tab button. The `onKeyDown` handler handles `ArrowLeft` and `ArrowRight` (previous or next tab, wrapping at both ends) and `Home` and `End` (first or last tab). For each handled key it calls `e.preventDefault()`, calls `onSelect` with the target tab's id, and then calls `tabRefs.current[nextIndex]?.focus()`. Do not rely on the browser to move focus. Other keys return without action.
    - CSS: theme variables only, `min-height` and `min-width` of `var(--tap-min)`, no new focus rule (use the shared `:focus-visible` outline). Layout works at 360px without sideways scrolling.
    - _Requirements: 7.1, 7.5 to 7.10_

- [x] 7. Record a sale from the Stock card
  - Import the new domain functions from `src/domain` once group 4 is done. Do not add component tests (Assumption A4 from `app-shell-stock-card`).
  - [x] 7.1 Create `SaleForm.tsx` in `src/components/cards/`
    - Props `itemName`, `initialQuantityText`, `onSubmit`, `onCancel`, `error`, `formError`. Shows the Item name, one quantity `Field` (`inputMode="numeric"`, default text "1"), Save and Cancel `Button`s, and `formError` in a `role="alert"` paragraph at the top. Same form chrome as `ItemForm`.
    - _Requirements: 4.2, 4.4 to 4.6_
  - [x] 7.2 Add the sale flow to `StockCardView.tsx` and `ItemRow.tsx`
    - `ItemRow` gets an optional `onRecordSale` handler and renders a "Record a sale" `Button` only when it is given. `StockCardView` takes a new optional prop `salesCardId: string | undefined` and a `sale` form mode.
    - When `salesCardId` is defined: pass `onRecordSale` to every `ItemRow`. On save: `parseWholeNumber` first (error next to the Field, typed text kept), then `recordSale` with `crypto.randomUUID()` and `new Date().toISOString()` read in the UI layer. `NOT_ENOUGH_STOCK` shows "Not enough in stock." next to the Field. Any other error shows its message at the top of the form. Both keep the form open with the typed quantity. Cancel closes the form with no domain call. On success close the form and call `onStackChange`. Do not use a non-null assertion on `salesCardId`.
    - When `salesCardId` is `undefined`: pass no `onRecordSale` (no "Record a sale" button on any row), and render once above the item list a `<p>` with "Sales can't be recorded because this shop has no Sales log card." The sale form and `recordSale` are then unreachable.
    - Add an always-present `<p aria-live="polite">` that shows "Sale recorded" on success and clears after 3 seconds. Keep the timeout id in a `useRef` and clear it before starting a new one. Add a `useEffect` with an empty dependency list whose cleanup clears the pending timeout, so the timeout never calls `setSaleNotice` after the view unmounts (for example when the owner switches tab).
    - Add, edit and delete flows and their behaviour stay as they are.
    - _Requirements: 4.1 to 4.11_

- [x] 8. Sales_Log_Card_View
  - [x] 8.1 Create `SalesLogCardView.tsx` and `SalesLogCardView.css` in `src/components/cards/`
    - Props `stack` and `card`. A `Card` with the card's title. Order with `salesNewestFirst`. Each row shows the Item name (found across every Stock card, or "Deleted item" when none matches), the quantity, `formatKobo(saleTotal(sale))` and the time. Friendly empty state when there are no Sales, for example "No sales yet." Play mode only. Simple English.
    - _Requirements: 5.1 to 5.9_

- [x] 9. Daily_Summary_Card_View
  - [x] 9.1 Create `DailySummaryCardView.tsx` and `DailySummaryCardView.css` in `src/components/cards/`
    - Props `stack` and `dayRange`. A `Card` with the Daily summary card's title. Show `dailyTotal` over the Sales log card using `dayRange.start` and `dayRange.end` as `formatKobo(value)`, and `estimatedProfit` as `formatSignedKobo(value)` (for example "Profit: ₦1,250.00" or "Loss: ₦300.00"). When a Result failed, show the error's message in place of the amount; one failure does not hide the other. Show `lowStockItems(stack)` names, or "Nothing is low on stock right now." when empty. Show `formatKobo(totalOwed(debts))` from the Debts card. Treat a missing Sales log or Debts card as empty. Never read the clock. Play mode only.
    - _Requirements: 6.1 to 6.8_

- [x] 10. App_Shell wiring
  - [x] 10.1 Add tab state, day range state and `salesCardId` in `src/App.tsx`
    - `selectedTab` state starting at `"stock"`. Day range lives in state: `const [dayRange, setDayRange] = useState<DayRange>(() => todayRange())`. Do not use `useMemo` or any mount-once computation for it.
    - Define `selectTab(id)`: when `id === "daily-summary"` call `setDayRange(todayRange())` (also when that tab is already shown), then `setSelectedTab(id)`.
    - Add a `useEffect` with an empty dependency list that adds a `visibilitychange` listener on `document`. The listener calls `setDayRange(todayRange())` when `document.visibilityState === "visible"`. The cleanup removes the listener. Call `todayRange()` only in handlers, never during render.
    - Look up the Stock, Sales log, Debts and Daily summary cards from the loaded Stack. Define the four tabs with the labels "Stock", "Sales log", "Debts", "Daily summary". `salesCardId` is `salesCard?.id` and may be `undefined`; do not use a non-null assertion. Do not change the load effect, save queue, retry or theme toggle.
    - _Requirements: 4.9, 4.11, 6.2, 7.1, 7.3_
  - [x] 10.2 Render the Tab_Bar and the selected panel in `src/App.tsx`
    - Render `TabBar` with `onSelect={selectTab}`, then one `role="tabpanel"` with `id="panel-{selectedTab}"` and `aria-labelledby="tab-{selectedTab}"` holding only the selected view: `StockCardView` (with `salesCardId={salesCard?.id}`), `SalesLogCardView`, a one-line Debts placeholder paragraph, or `DailySummaryCardView` (with `dayRange`). The other three views are not mounted.
    - _Requirements: 4.9, 4.11, 7.2, 7.3, 7.4, 7.7_

- [ ] 11. Final check
  - [x] 11.1 Run `npx vitest run` and `npx tsc --noEmit`. Fix any failure.
    - Existing foundation and app-shell-stock-card tests must still pass with no edits to expected results.
    - _Requirements: 8.1 to 8.14_
  - [x] 11.2 Run the production build.
    - _Requirements: 8.12_
  - [-] 11.3 Do a manual check in the browser and write down the result
    - Tabs: Stock shows on first load; tapping each tab shows only that card; Debts shows the placeholder; selected tab has the marker and not only a colour change; Left and Right arrows move focus and selection and wrap at both ends; Home moves focus and selection to the first tab and End to the last tab; visible focus outline; every tab at least 44px high and wide at 360px with no sideways scrolling; panel and tab ids are linked.
    - Record a sale: form opens with quantity 1; a valid quantity closes the form and lowers the quantity in the list; "Sale recorded" is announced and disappears after a few seconds; switching tab right after a sale causes no console warning about an unmounted component (timeout cleared on unmount); letters or a decimal keep the form open with the typed text and an error by the Field; a quantity above stock shows "Not enough in stock."; Cancel changes nothing.
    - Missing Sales log card: with a Stack that has no Sales log card, no "Record a sale" button shows on any row and the message "Sales can't be recorded because this shop has no Sales log card." shows above the list.
    - Sales log: newest first; empty state; name, quantity, total and time shown; after deleting an Item its Sales show "Deleted item".
    - Daily summary: total and profit match the sales recorded today; profit reads "Profit: ₦X", and a sale below cost reads "Loss: ₦X" with no minus sign; yesterday's sales are not counted; low-stock names or the friendly message; money owed shown; no builder controls. Day range refresh: change the device or browser date to the next day (or leave the app hidden across midnight), then select the Daily summary tab, and separately hide and show the page, and check that today's totals reset to the new day each time. Reload and check the sales survive.
    - _Requirements: 4.1 to 4.11, 5.1 to 5.9, 6.1 to 6.8, 7.1 to 7.10_
  - [~] 11.4 Update `KIRO_NOTES.md` counts and add a log row.
    - Add this spec to the spec count. Add the property tests, Properties 16 to 24 (nine, including the new `formatSignedKobo` Property 24), and any bugs they found. Add the new unit test groups (`dailyTotal`, `estimatedProfit`, `salesNewestFirst`, `lowStockItems`, `formatSignedKobo`, `todayRange`) and the new manual check items from 11.3 (Home and End keys, day range refresh, missing Sales log card, timeout cleared on unmount).
    - _Requirements: 8.1 to 8.14_

## Notes

- Property tests sit next to the function they cover (Requirement 8.6) and each runs at least 100 cases.
- Property 22 is split across 1.9 (Sales part) and 3.4 (Stack part) because the two functions live in different files.
- `dailyTotal` and `estimatedProfit` stop at the first unsafe running sum, so `estimatedProfit` can depend on order when an amount is negative. The property generators for Properties 16 to 20, 22 and 23 are bounded so a generated list never overflows by accident. Property 21 builds overflow cases on purpose.
- Property 24 sits with `formatSignedKobo` in group 5, in `src/domain-ui/money.property.test.ts`.
- No component tests are added (Assumption A4). Screen behaviour (sale form, aria-live notice, Deleted item, missing Sales log card message, timeout cleared on unmount, day range recompute, arrow, Home and End navigation) is checked by the manual list in 11.3.
- No existing code behaviour or test expectation changes. Only new exports, new functions and new files are added, plus the new `salesCardId` prop and sale flow in `StockCardView`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1"] },
    { "id": 3, "tasks": ["1.4", "2.2"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["1.6"] },
    { "id": 6, "tasks": ["1.7"] },
    { "id": 7, "tasks": ["1.8"] },
    { "id": 8, "tasks": ["1.9"] },
    { "id": 9, "tasks": ["2.3"] },
    { "id": 10, "tasks": ["3.1"] },
    { "id": 11, "tasks": ["3.2", "3.3"] },
    { "id": 12, "tasks": ["3.4"] },
    { "id": 13, "tasks": ["4.1"] },
    { "id": 14, "tasks": ["5.1", "5.4"] },
    { "id": 15, "tasks": ["5.2", "5.5", "6.1"] },
    { "id": 16, "tasks": ["5.3", "7.1"] },
    { "id": 17, "tasks": ["7.2"] },
    { "id": 18, "tasks": ["8.1", "9.1"] },
    { "id": 19, "tasks": ["10.1"] },
    { "id": 20, "tasks": ["10.2"] },
    { "id": 21, "tasks": ["11.1"] },
    { "id": 22, "tasks": ["11.2"] },
    { "id": 23, "tasks": ["11.3"] },
    { "id": 24, "tasks": ["11.4"] }
  ]
}
```
