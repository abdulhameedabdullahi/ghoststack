# Requirements Document

## Introduction

**Feature:** Sales log, Daily summary and a simple tab bar.

This spec gives the owner the other half of the everyday loop that `app-shell-stock-card` started: recording a sale from the Stock card, seeing a log of past sales, and seeing today's totals at a glance. It adds three pure domain functions (`dailyTotal`, `estimatedProfit`, `lowStockItems`), a "Record a sale" flow wired to the existing `recordSale`, a Sales_Log_Card_View, a Daily_Summary_Card_View, and a tab bar so the owner can move between the four starter cards instead of only ever seeing the Stock card.

It builds on `ghoststack-foundation` and `app-shell-stock-card` and follows `product.md`, `tech.md`, `design-retro.md`, `plain-language.md` and `money-rules.md`. Existing behaviour (domain types, `recordSale`, `recordDebt`, `settleDebt`, `totalOwed`, `addItem`, `updateItem`, `deleteItem`, storage functions, the Stock card UI, and all existing tests) does not change.

**Out of scope:** Debts card UI (the Debts tab shows a placeholder only), builder mode, PWA setup, export and import.

## Glossary

- **Kobo:** the smallest money unit. All money is a whole number of kobo. 100 kobo is 1 Naira.
- **Stack:** one shop's set of cards and their data.
- **Sale:** a record on a Sales log card: item id, quantity, unit price, unit cost and time.
- **Day range:** a start time and an end time (both ISO 8601 strings) that together mark one calendar day, passed in by the caller. The start is inclusive and the end is exclusive. For Today, the end is the start of the next local calendar day, computed in the UI layer.
- **Today:** the owner's local calendar day. The App_Shell computes the day range for today and passes it to the domain; the domain never reads the clock or the device's time zone.
- **Instant:** a point in time, read from an ISO 8601 timestamp by parsing it. Times are always compared as instants, never as strings.
- **Domain function:** a pure function in `src/domain/`. No React, no storage, no clock.
- **Result:** the return value of a domain function that can fail. It holds either the new data or an error with a plain-language message.
- **Low stock:** an Item whose quantity is at or below its low-stock level, per the existing `isLowStock` check.
- **Money_Formatter:** the UI-layer code (`formatKobo`) that turns kobo into Naira text.
- **Signed_Money_Formatter:** the UI-layer function `formatSignedKobo` (in `src/domain-ui/money.ts`) that turns a kobo amount that may be negative into text starting with "Profit: " (zero or positive) or "Loss: " (negative), followed by the Naira text of the absolute amount, produced by `formatKobo`.
- **Sales_Log_Card_View:** the React screen that lists Sales, newest first.
- **Daily_Summary_Card_View:** the React screen that shows today's total sales, estimated profit, low-stock items and money owed.
- **Tab_Bar:** the React component that lets the owner switch between the Stock, Sales log, Debts and Daily summary cards.
- **Deleted item:** a Sale whose `itemId` no longer matches any Item on any Stock card, because the Item was deleted (see `app-shell-stock-card` Assumption A1).

## Requirements

### Requirement 1: Daily total

**User Story:** As a shop owner, I want to see how much I sold today, so that I know how business is going without doing sums myself.

#### Acceptance Criteria

1. THE domain SHALL provide a `dailyTotal` function that takes a Sales log card's Sales and a day range (start time, end time) and returns the sum, in kobo, of `quantity * unitPrice` for every Sale whose time falls within the day range.
2. WHEN a Sale's time is before the day range's start or at or after the day range's end, THE `dailyTotal` function SHALL NOT include that Sale in the sum.
3. WHEN no Sale falls within the day range, THE `dailyTotal` function SHALL return 0.
4. THE `dailyTotal` function SHALL take the start time and the end time as inputs and SHALL NOT read the clock.
5. THE `dailyTotal` function SHALL NOT change its input Sales list.
6. IF the running sum would not be a safe integer, THEN THE `dailyTotal` function SHALL return an error result instead of an unsafe number.
7. THE `dailyTotal` function SHALL compare each Sale's time and the day range's start and end times as instants (parsed timestamps), and SHALL NOT compare them as strings.
8. WHEN a Sale's time cannot be parsed, THE `dailyTotal` function SHALL leave that Sale out of the sum and SHALL NOT return `NaN`.

### Requirement 2: Estimated profit

**User Story:** As a shop owner, I want to see my estimated profit for today, so that I know if my prices are covering my costs.

#### Acceptance Criteria

1. THE domain SHALL provide an `estimatedProfit` function that takes a Sales log card's Sales and a day range (start time, end time) and returns the sum, in kobo, of `(unitPrice - unitCost) * quantity` for every Sale whose time falls within the day range.
2. WHEN a Sale's time is before the day range's start or at or after the day range's end, THE `estimatedProfit` function SHALL NOT include that Sale in the sum.
3. WHEN no Sale falls within the day range, THE `estimatedProfit` function SHALL return 0.
4. THE `estimatedProfit` function SHALL use each Sale's own `unitPrice` and `unitCost`, so a later change to an Item's prices SHALL NOT change the estimated profit of a past Sale.
5. THE `estimatedProfit` function SHALL take the start time and the end time as inputs and SHALL NOT read the clock.
6. THE `estimatedProfit` function SHALL NOT change its input Sales list.
7. IF the running sum would not be a safe integer, THEN THE `estimatedProfit` function SHALL return an error result instead of an unsafe number.
8. THE `estimatedProfit` function SHALL compare each Sale's time and the day range's start and end times as instants (parsed timestamps), and SHALL NOT compare them as strings.
9. WHEN a Sale's time cannot be parsed, THE `estimatedProfit` function SHALL leave that Sale out of the sum and SHALL NOT return `NaN`.

### Requirement 3: Low-stock items

**User Story:** As a shop owner, I want to see which items are running low, so that I know what to restock soon.

#### Acceptance Criteria

1. THE domain SHALL provide a `lowStockItems` function that takes a Stack and returns every Item, from every Stock card in the Stack, whose quantity is at or below its low-stock level.
2. THE `lowStockItems` function SHALL use the existing `isLowStock` check and SHALL NOT duplicate its logic.
3. WHEN no Item in the Stack is low on stock, THE `lowStockItems` function SHALL return an empty list.
4. THE `lowStockItems` function SHALL NOT change its input Stack.
5. THE `lowStockItems` function SHALL return Items in the order they appear on their Stock card, and SHALL list the Items of an earlier Stock card before those of a later one.

### Requirement 4: Record a sale from the Stock card

**User Story:** As a shop owner, I want to record a sale straight from my stock list, so that recording a sale is as quick as checking stock.

#### Acceptance Criteria

1. WHILE the Stack has a Sales log card, THE Stock_Card_View SHALL show a "Record a sale" button on each Item row.
2. WHEN the owner taps "Record a sale" on an Item, THE Stock_Card_View SHALL show a form with one Field for quantity, defaulting to 1.
3. WHEN the owner saves the form with a valid quantity, THE Stock_Card_View SHALL call the existing `recordSale` function with a new sale id and the current time, close the form, and show the Item's reduced quantity in the list.
4. IF the typed quantity cannot be read as a positive whole number, THEN THE Stock_Card_View SHALL keep the form open, keep what the owner typed, and show an error next to the quantity Field.
5. IF `recordSale` returns the `NOT_ENOUGH_STOCK` error, THEN THE Stock_Card_View SHALL show the message "Not enough in stock." next to the quantity Field and SHALL keep the form open with the typed quantity.
6. IF `recordSale` returns any other error, THEN THE Stock_Card_View SHALL show that error's message at the top of the form and SHALL keep the form open with the typed quantity.
7. WHEN the owner cancels the form, THE Stock_Card_View SHALL close the form and SHALL NOT call `recordSale`.
8. THE Stock_Card_View SHALL make the new sale id in the UI layer and SHALL read the current time in the UI layer, not in the domain.
9. THE "Record a sale" flow SHALL need the Stack's Sales log card id, which THE App_Shell SHALL pass down to the Stock_Card_View.
10. WHEN `recordSale` succeeds, THE Stock_Card_View SHALL show the message "Sale recorded" in an `aria-live` region for a few seconds and then remove it, and WHEN the Stock_Card_View is removed from the screen before that time has passed, THE Stock_Card_View SHALL cancel the pending removal.
11. IF the Stack has no Sales log card, THEN THE Stock_Card_View SHALL hide the "Record a sale" button on every Item row and SHALL show the message "Sales can't be recorded because this shop has no Sales log card."

### Requirement 5: Sales log card view

**User Story:** As a shop owner, I want a list of my past sales, so that I can check what was sold and when.

#### Acceptance Criteria

1. THE Sales_Log_Card_View SHALL show the Sales log card inside a Card component, using the card's title.
2. THE Sales_Log_Card_View SHALL list Sales with the newest sale first. WHEN two Sales have the same time, THE Sales_Log_Card_View SHALL show the later-recorded Sale first.
3. THE domain SHALL provide a pure `salesNewestFirst` function that takes a list of Sales and returns a new list sorted by time, newest first, comparing times as instants. WHEN two Sales have the same time, `salesNewestFirst` SHALL put the Sale that appears later in the input list first. `salesNewestFirst` SHALL NOT change its input list, and SHALL put any Sale whose time cannot be parsed after all Sales with a valid time. THE Sales_Log_Card_View SHALL use `salesNewestFirst` for its order.
4. THE Sales_Log_Card_View SHALL show, for each Sale, the sold item's name, the quantity sold, the sale's total price in Naira text, and the sale's time.
5. WHEN a Sale's `itemId` does not match any Item on any Stock card in the Stack, THE Sales_Log_Card_View SHALL show the name "Deleted item" for that Sale instead of an item name.
6. WHEN the Sales log card has no Sales, THE Sales_Log_Card_View SHALL show a friendly empty-state message.
7. THE Sales_Log_Card_View SHALL use the existing `saleTotal` function to compute each Sale's total price and SHALL use `formatKobo` to display it.
8. THE Sales_Log_Card_View SHALL show only Play mode and SHALL NOT show any builder controls.
9. THE Sales_Log_Card_View SHALL use simple English in all labels and messages.

### Requirement 6: Daily summary card view

**User Story:** As a shop owner, I want to see today's totals in one place, so that I can close up each day with confidence.

#### Acceptance Criteria

1. THE Daily_Summary_Card_View SHALL show the Daily summary card inside a Card component, using the card's title.
2. WHEN the owner selects the Daily summary tab, or WHEN the document becomes visible after being hidden, THE App_Shell SHALL compute the day range for the owner's local calendar day again and pass it down. THE Daily_Summary_Card_View SHALL pass that day range to `dailyTotal` and `estimatedProfit` without reading the clock itself.
3. THE Daily_Summary_Card_View SHALL show today's total sales in Naira text, computed with `dailyTotal` over the Stack's Sales log card.
4. THE Daily_Summary_Card_View SHALL show today's estimated profit using `formatSignedKobo`, computed with `estimatedProfit` over the Stack's Sales log card, so that a negative value reads "Loss: ₦X" and any other value reads "Profit: ₦X".
5. THE Daily_Summary_Card_View SHALL show the list of low-stock items from `lowStockItems`, each with its name, or a friendly message when the list is empty.
6. THE Daily_Summary_Card_View SHALL show the money owed to the owner, in Naira text, computed with the existing `totalOwed` function over the Stack's Debts card.
7. IF `dailyTotal` or `estimatedProfit` returns an error, THEN THE Daily_Summary_Card_View SHALL show that error's message instead of a Naira amount for the affected total.
8. THE Daily_Summary_Card_View SHALL show only Play mode and SHALL NOT show any builder or editing controls.

### Requirement 7: Tab bar navigation

**User Story:** As a shop owner, I want to switch between my cards with simple tabs, so that I can reach my sales, debts and daily summary without hunting for them.

#### Acceptance Criteria

1. THE Tab_Bar SHALL show four tabs, one for each of the Stack's four starter cards: Stock, Sales log, Debts, Daily summary.
2. WHEN the owner taps a tab, THE App_Shell SHALL show that card's view and SHALL hide the other three.
3. THE App_Shell SHALL show the Stock card's view when the app first loads.
4. WHEN the owner taps the Debts tab, THE App_Shell SHALL show a placeholder message instead of a Debts card view.
5. THE Tab_Bar SHALL show which tab is currently selected in a way that does not rely on colour alone.
6. THE Tab_Bar SHALL use simple English labels and SHALL give each tab a tap area at least 44px high and 44px wide.
7. THE Tab_Bar SHALL use the ARIA roles `tablist` for the bar, `tab` for each tab and `tabpanel` for the shown card's view, and SHALL link each tab to its panel.
8. WHEN a tab has keyboard focus and the owner presses the Left or Right arrow key, THE Tab_Bar SHALL select the previous or next tab and move keyboard focus to that tab's button, wrapping from the last tab to the first and the first to the last.
9. WHEN a tab has keyboard focus and the owner presses the Home or End key, THE Tab_Bar SHALL select the first or last tab and move keyboard focus to that tab's button.
10. THE Tab_Bar SHALL show a visible focus outline on the focused tab.

### Requirement 8: Tests and money rules

**User Story:** As a developer, I want automated proof that the new totals are correct, so that the owner can trust the numbers.

#### Acceptance Criteria

1. THE project SHALL have Vitest unit tests for `dailyTotal`, `estimatedProfit` and `lowStockItems`.
2. THE project SHALL have a fast-check property test for invariant 3: for any Sales log card and any day range, `dailyTotal` equals the sum of `quantity * unitPrice` for exactly the Sales whose time falls within that day range, and Sales outside the day range are never counted.
3. THE project SHALL have a fast-check property test for invariant 4: for any Sales log card and any day range, `estimatedProfit` equals the sum of `(unitPrice - unitCost) * quantity` for exactly the Sales whose time falls within that day range, and Sales outside the day range are never counted.
4. THE project SHALL have a fast-check property test that `dailyTotal` and `estimatedProfit` always return either a safe integer result or an error result, never `NaN` or an unsafe number.
5. THE project SHALL have a fast-check property test that `dailyTotal`, `estimatedProfit` and `lowStockItems` leave a deep-frozen input unchanged, whether the call succeeds or returns an error.
6. EACH property test SHALL be written in the same task as the function it covers.
7. THE property tests SHALL run at least 100 cases each.
8. THE project SHALL have a fast-check property test that `lowStockItems` returns exactly the Items for which `isLowStock` is true, in stack order (Stock cards in order, Items in card order).
9. THE project SHALL have a fast-check property test that, for any split point inside a day range, `dailyTotal` over the whole range equals `dailyTotal` over the first part plus `dailyTotal` over the second part, and the same for `estimatedProfit`. THE first part SHALL run from the range's start to the split point and the second part from the split point to the range's end.
10. THE project SHALL have a fast-check property test that `salesNewestFirst` returns a permutation of its input, sorted by time descending, with equal times in later-recorded-first order, and leaves a deep-frozen input unchanged.
11. THE project SHALL have a fast-check property test that Sales with a time that cannot be parsed never make `dailyTotal` or `estimatedProfit` return `NaN`.
12. THE existing foundation and app-shell-stock-card tests SHALL keep passing without edits to their expected results.
13. THE project SHALL have Vitest unit tests for `formatSignedKobo` that cover zero, a positive value, a negative value and a large value.
14. THE project SHALL have a fast-check property test that, for any safe integer `n`, the output of `formatSignedKobo(n)` starts with "Loss: " if and only if `n` is less than 0, and the amount part of the output equals `formatKobo(Math.abs(n))`.

## Confirmed decisions

- **Overflow handling:** confirmed. `dailyTotal` and `estimatedProfit` return an error result (reusing the `AMOUNT_TOO_BIG` code) when their running sum would not be a safe integer (Requirements 1.6, 2.7). `recordSale` is not changed by this spec.
- **Day range boundary:** confirmed. The start is inclusive and the end is exclusive. For Today, the end is the start of the next local calendar day, computed in the UI layer and passed into the domain.
