# Requirements Document

## Introduction

**Feature:** Debts card view, "Record a debt" form and "Mark as paid".

This spec finishes the everyday loop for money owed to the owner. It replaces the "Coming soon" placeholder on the Debts tab with a real Debts_Card_View. The owner can see the total owed, see who owes them, read the full list of debts, record a new debt, and mark a debt as paid after a confirmation. It adds two pure domain functions, `debtsUnpaidFirst` and `debtsByCustomer`, and wires the existing `recordDebt` and `settleDebt` into the UI.

It builds on `ghoststack-foundation`, `app-shell-stock-card` and `sales-and-daily-summary`, and follows `product.md`, `tech.md`, `design-retro.md`, `plain-language.md` and `money-rules.md`. Existing behaviour (domain types, `recordDebt`, `settleDebt`, `totalOwed`, `recordSale`, the item functions, `dailyTotal`, `estimatedProfit`, `salesNewestFirst`, `lowStockItems`, `formatKobo`, `parseKobo`, `formatSignedKobo`, storage functions, the Stock, Sales log and Daily summary views, the Tab_Bar and all existing tests) does not change.

**Out of scope:** builder mode, PWA setup, export and import, editing a debt, deleting a debt, partial payments.

## Glossary

- **Kobo:** the smallest money unit. All money is a whole number of kobo. 100 kobo is 1 Naira.
- **Naira text:** the money text the owner sees and types, for example `₦1,250.50`.
- **Stack:** one shop's set of cards and their data.
- **Debt:** a record on a Debts card: id, customer name, amount in kobo, date and status (`unpaid` or `paid`).
- **Unpaid debt:** a Debt whose status is `unpaid`. **Paid debt:** a Debt whose status is `paid`.
- **Instant:** a point in time, read from an ISO 8601 timestamp by parsing it. Times are always compared as instants, never as strings.
- **Customer key:** a customer name after trimming spaces at both ends and converting to lower case. Two names with the same Customer key are the same customer.
- **Customer total:** one entry returned by `debtsByCustomer`: the customer's name as first typed and the total they owe in kobo.
- **Domain function:** a pure function in `src/domain/`. No React, no storage, no clock, no id making.
- **Result:** the return value of a domain function that can fail. It holds either the new data or an error with a plain-language message.
- **Money_Formatter:** the UI-layer function `formatKobo` that turns kobo into Naira text.
- **Money_Parser:** the UI-layer function `parseKobo` that turns Naira text typed by the owner into kobo.
- **Debts_Card_View:** the React screen that shows the Debts card in Play mode.
- **Debt_Form:** the "Record a debt" form inside the Debts_Card_View, with Fields for customer name and amount.
- **App_Shell:** the React component in `src/App.tsx` that loads the Stack, saves changes, shows the Tab_Bar and shows the selected card's view.
- **Daily_Summary_Card_View:** the existing React screen that shows today's totals, including the money owed.

## Requirements

### Requirement 1: Unpaid debts first

**User Story:** As a shop owner, I want my debt list to show who still owes me first, so that I do not have to hunt for unpaid debts among paid ones.

#### Acceptance Criteria

1. THE domain SHALL provide a pure `debtsUnpaidFirst` function that takes a list of Debts and returns a new list containing the same Debts, with every unpaid debt before every paid debt.
2. THE `debtsUnpaidFirst` function SHALL order the unpaid debts newest first and the paid debts newest first, comparing each Debt's `date` as an instant.
3. WHEN two Debts in the same group have the same date, THE `debtsUnpaidFirst` function SHALL put the Debt that appears later in the input list first.
4. THE `debtsUnpaidFirst` function SHALL put any Debt whose date cannot be parsed after all Debts in the same group that have a valid date, and SHALL order such Debts among themselves with the Debt that appears later in the input list first.
5. THE `debtsUnpaidFirst` function SHALL NOT change its input list or any Debt in it.
6. THE `debtsUnpaidFirst` function SHALL NOT read the clock.
7. WHEN the input list is empty, THE `debtsUnpaidFirst` function SHALL return an empty list.

### Requirement 2: Who owes you

**User Story:** As a shop owner, I want to see how much each customer owes me in total, so that I know who to ask for money.

#### Acceptance Criteria

1. THE domain SHALL provide a pure `debtsByCustomer` function that takes a list of Debts and returns a Result holding a list of Customer totals.
2. THE `debtsByCustomer` function SHALL count only unpaid debts, and SHALL ignore every paid debt.
3. THE `debtsByCustomer` function SHALL group unpaid debts by Customer key, so that "Ada", " ada " and "ADA" are one customer.
4. THE `debtsByCustomer` function SHALL return, for each customer, the name as first typed (the trimmed customer name of the first unpaid debt for that customer in the input list) and the sum, in kobo, of that customer's unpaid debt amounts.
5. THE `debtsByCustomer` function SHALL order the Customer totals with the largest total first. WHEN two customers have the same total, THE `debtsByCustomer` function SHALL put the customer whose first unpaid debt appears earlier in the input list first.
6. WHEN no unpaid debt exists, THE `debtsByCustomer` function SHALL return an empty list.
7. IF a running customer sum would not be a safe integer, THEN THE `debtsByCustomer` function SHALL return the existing `AMOUNT_TOO_BIG` error result instead of an unsafe number.
8. THE `debtsByCustomer` function SHALL NOT change its input list or any Debt in it.
9. THE `debtsByCustomer` function SHALL NOT read the clock.
10. THE `debtsByCustomer` function SHALL NOT return `NaN` for any input.

### Requirement 3: Debts card view and total owed

**User Story:** As a shop owner, I want to open the Debts tab and see my debts clearly, so that I know how much money is owed to me.

#### Acceptance Criteria

1. THE Debts_Card_View SHALL show the Debts card inside a Card component, using the card's title.
2. THE Debts_Card_View SHALL show the total owed at the top, computed with the existing `totalOwed` function over the Debts card's Debts and displayed with `formatKobo`.
3. THE Debts_Card_View SHALL show a "Who owes you" list built with `debtsByCustomer`, with each customer's name and total owed displayed with `formatKobo`.
4. THE Debts_Card_View SHALL show the full debt list in the order given by `debtsUnpaidFirst`, with each Debt's customer name, amount displayed with `formatKobo`, and date.
5. THE Debts_Card_View SHALL show a text label on each Debt, "Not paid" for an unpaid debt and "Paid" for a paid debt, together with an icon, so that the status does not rely on colour alone.
6. IF `debtsByCustomer` returns an error, THEN THE Debts_Card_View SHALL show that error's message in place of the "Who owes you" list, and SHALL still show the total owed and the full debt list.
7. WHEN a Debt's date cannot be parsed, THE Debts_Card_View SHALL still show that Debt in the list and SHALL NOT crash.
8. WHEN the Debts card has no Debts, THE Debts_Card_View SHALL show a friendly empty-state message and one clear "Record a debt" button, and SHALL show a total owed of ₦0.00.
9. WHEN the Debts card has Debts but no unpaid debt, THE Debts_Card_View SHALL show a friendly message in place of the "Who owes you" list.
10. THE Debts_Card_View SHALL show only Play mode and SHALL NOT show any builder controls, and SHALL NOT offer to edit or delete a debt.
11. THE Debts_Card_View SHALL use simple English in all labels and messages, for example "money owed to you" and not "accounts receivable".
12. THE Debts_Card_View SHALL work on a screen 360px wide without sideways scrolling, and SHALL take all colours, fonts and spacing from the Theme variables.

### Requirement 4: Record a debt

**User Story:** As a shop owner, I want to write down that a customer owes me money, so that I do not forget it.

#### Acceptance Criteria

1. WHEN the Debts card has Debts, THE Debts_Card_View SHALL show one main "Record a debt" button that is always visible.
2. WHEN the owner taps "Record a debt", THE Debts_Card_View SHALL show the Debt_Form with one Field for customer name and one Field for amount, where the amount is typed as Naira text.
3. WHEN the owner saves the Debt_Form, THE Debts_Card_View SHALL read the amount with the existing `parseKobo` before calling the domain.
4. WHEN the owner saves the Debt_Form with a readable amount, THE Debts_Card_View SHALL call the existing `recordDebt` function with the Debts card id, the typed customer name, the amount in kobo, a new debt id and the current time.
5. WHEN `recordDebt` succeeds, THE Debts_Card_View SHALL close the Debt_Form, hand the new Stack to the App_Shell, and show the new debt in the list, in the total owed and in the "Who owes you" list.
6. IF `parseKobo` returns an error, THEN THE Debts_Card_View SHALL keep the Debt_Form open, keep what the owner typed, and show that error's message next to the amount Field, without calling `recordDebt`.
7. IF `recordDebt` returns the `BAD_CUSTOMER` error, THEN THE Debts_Card_View SHALL keep the Debt_Form open, keep what the owner typed, and show that error's message next to the customer name Field.
8. IF `recordDebt` returns the `BAD_AMOUNT` or `AMOUNT_TOO_BIG` error, THEN THE Debts_Card_View SHALL keep the Debt_Form open, keep what the owner typed, and show that error's message next to the amount Field.
9. IF `recordDebt` returns any other error, THEN THE Debts_Card_View SHALL keep the Debt_Form open, keep what the owner typed, and show that error's message at the top of the Debt_Form.
10. WHEN the owner cancels the Debt_Form, THE Debts_Card_View SHALL close the Debt_Form and SHALL NOT call `recordDebt`.
11. THE Debts_Card_View SHALL make the new debt id and read the current time in the UI layer, not in the domain.
12. WHEN `recordDebt` succeeds, THE Debts_Card_View SHALL show the message "Debt recorded" in an `aria-live` region for a few seconds and then remove it, and WHEN the Debts_Card_View is removed from the screen before that time has passed, THE Debts_Card_View SHALL cancel the pending removal.
13. THE Debt_Form SHALL link each error message to its Field using the shared Field component, so that screen readers read it.
14. THE Debt_Form SHALL use Naira words only and SHALL NOT mention kobo to the owner.

### Requirement 5: Mark a debt as paid

**User Story:** As a shop owner, I want to mark a debt as paid when a customer pays me, with a check first, so that I do not mark the wrong debt by accident.

#### Acceptance Criteria

1. THE Debts_Card_View SHALL show a "Mark as paid" button on each unpaid debt and SHALL NOT show it on a paid debt.
2. WHEN the owner taps "Mark as paid" on a debt, THE Debts_Card_View SHALL ask for confirmation that shows the customer's name and the amount displayed with `formatKobo`, and offer a "Yes, mark as paid" button and a "Not yet" button.
3. WHEN the owner confirms, THE Debts_Card_View SHALL call the existing `settleDebt` function with the Debts card id and the debt id, close the confirmation, and hand the new Stack to the App_Shell.
4. WHEN `settleDebt` succeeds, THE Debts_Card_View SHALL show the debt as paid, and SHALL show a total owed reduced by exactly that debt's amount.
5. WHEN `settleDebt` succeeds, THE Debts_Card_View SHALL show the message "Debt marked as paid" in an `aria-live` region.
6. WHEN the Debts_Card_View is removed from the screen, THE Debts_Card_View SHALL clear the "Debt marked as paid" message and cancel any pending removal of it, so that the message never changes state on a removed view.
7. WHEN the owner chooses "Not yet", THE Debts_Card_View SHALL close the confirmation and SHALL NOT call `settleDebt`.
8. IF `settleDebt` returns an error, THEN THE Debts_Card_View SHALL close the confirmation, show that error's message, and leave the Stack unchanged.
9. THE "Mark as paid" button and the confirmation buttons SHALL each have a tap area at least 44px high and 44px wide, and SHALL show a visible focus outline on keyboard focus.
10. THE Debts_Card_View SHALL show only one confirmation at a time.

### Requirement 6: Debts tab wiring and missing card

**User Story:** As a shop owner, I want the Debts tab to just work, so that I can reach my debts like I reach my stock and sales.

#### Acceptance Criteria

1. WHEN the owner selects the Debts tab, THE App_Shell SHALL show the Debts_Card_View in place of the "Coming soon" placeholder.
2. THE App_Shell SHALL pass the Debts card and the current Stack to the Debts_Card_View, and SHALL pass an `onStackChange` handler that uses the existing save queue.
3. THE App_Shell SHALL keep the Tab_Bar, the other three card views, the load effect, the save queue and the theme toggle unchanged.
4. IF the Stack has no Debts card, THEN THE App_Shell SHALL show the message "Debts can't be shown because this shop has no Debts card." in place of the Debts_Card_View, and SHALL NOT crash.
5. THE App_Shell and THE Debts_Card_View SHALL NOT use a non-null assertion to read the Debts card or its id.
6. THE App_Shell SHALL show the Debts_Card_View only on the Debts tab, so that the other tabs do not run its effects.

### Requirement 7: Daily summary stays in step

**User Story:** As a shop owner, I want the money owed on my Daily summary to match the Debts tab, so that I never see two different numbers for the same thing.

#### Acceptance Criteria

1. THE Daily_Summary_Card_View SHALL keep showing the money owed computed with the existing `totalOwed` function over the Debts card's Debts, displayed with `formatKobo`.
2. THE Debts_Card_View's total owed and THE Daily_Summary_Card_View's money owed SHALL come from the same `totalOwed` function, so that both show the same figure for the same Stack.
3. IF the Daily_Summary_Card_View already satisfies criteria 1 and 2, THEN THE project SHALL NOT change it.
4. WHEN a debt is recorded or marked as paid and the owner then selects the Daily summary tab, THE Daily_Summary_Card_View SHALL show the updated money owed.

### Requirement 8: Tests and money rules

**User Story:** As a developer, I want automated proof that the debt lists and totals are correct, so that the owner can trust the numbers.

#### Acceptance Criteria

1. THE project SHALL have Vitest unit tests for `debtsUnpaidFirst` and `debtsByCustomer`.
2. THE project SHALL have Vitest unit tests for `debtsUnpaidFirst` that cover an empty list, a list that mixes paid and unpaid debts, two Debts with the same date, and a Debt with an unparseable date.
3. THE project SHALL have Vitest unit tests for `debtsByCustomer` that cover an empty list, a list with only paid debts, names that differ only in case or surrounding spaces, the name shown as first typed, a tie between two totals, and an overflow returning `AMOUNT_TOO_BIG`.
4. THE project SHALL have a fast-check property test that `debtsUnpaidFirst` returns a permutation of its input (the same Debt objects, none lost or repeated), with every unpaid debt before every paid debt.
5. THE project SHALL have a fast-check property test that, within each group (unpaid, then paid), `debtsUnpaidFirst` orders Debts by date as an instant, newest first, puts a Debt with an unparseable date after every Debt in the group with a valid date, and puts the Debt that appears later in the input list first when dates are equal.
6. THE project SHALL have a fast-check property test that `debtsUnpaidFirst` leaves a deep-frozen input unchanged.
7. THE project SHALL have a fast-check property test (money-rules invariant 5) that, whenever `debtsByCustomer` returns a successful result, the sum of the Customer totals equals `totalOwed` of the same list.
8. THE project SHALL have a fast-check property test that `debtsByCustomer` counts only unpaid debts, so that changing any paid debt, or adding or removing paid debts, does not change the result.
9. THE project SHALL have a fast-check property test that `debtsByCustomer` returns Customer totals ordered largest total first, with one entry per distinct Customer key, and with each name equal to the trimmed name of that customer's first unpaid debt.
10. THE project SHALL have a fast-check property test that `debtsByCustomer` leaves a deep-frozen input unchanged, whether the call succeeds or returns an error.
11. THE project SHALL have a fast-check property test that `debtsByCustomer` always returns either a result whose every total is a safe integer, or an error result, and never `NaN` or an unsafe number, including for generated lists with very large amounts.
12. THE project SHALL have a fast-check property test that settling a debt with the existing `settleDebt` reduces the total owed shown by `debtsByCustomer` for that customer by exactly that debt's amount, and leaves every other customer's total unchanged.
13. EACH property test SHALL be written in the same task as the function it covers.
14. THE property tests SHALL run at least 100 cases each.
15. THE property test generators for ordinary cases SHALL use bounded amounts and short lists so that a generated list does not overflow by accident, and only the overflow property SHALL build overflowing lists on purpose.
16. THE existing foundation, app-shell-stock-card and sales-and-daily-summary tests SHALL keep passing without edits to their expected results.
17. WHERE component tests are wanted, THE project SHALL ask for approval before adding `@testing-library/react` and a DOM test environment, and SHALL NOT add them without approval. Until then, screen behaviour SHALL be checked by a written manual check list.

## Assumptions to confirm

- **A1. Name matching uses trim and lower case.** "Customer key" is the trimmed name converted with `toLowerCase()`. No accent folding or other locale rules are applied. Alternative: also fold accents, which adds complexity for little gain.
- **A2. Ties between equal customer totals** are broken by the customer's first unpaid debt appearing earlier in the input list. The brief only says "largest total first", so this tie-break is added to make the order fully defined and testable.
- **A3. Unparseable debt dates sort last within their group**, matching how `salesNewestFirst` treats unparseable Sale times. The date is shown with `toLocaleString()`, so an unparseable date displays as "Invalid Date" and the debt still shows.
- **A4. Overflow returns `AMOUNT_TOO_BIG` from `debtsByCustomer`.** `recordDebt` already stops the total owed from passing the safe limit, so this only matters for damaged or hand-edited data. `totalOwed` stays unchanged and unchecked.
- **A5. The "Debt marked as paid" message has no timer.** The brief only asks that it clear on unmount. It stays until the view unmounts or the next paid or recorded action replaces it. Alternative: clear it after a few seconds like "Sale recorded".
- **A6. The "Debt recorded" message is added** by analogy with "Sale recorded", although the brief does not ask for it. It can be dropped if it is not wanted.
- **A7. Daily summary probably needs no change.** It already calls `totalOwed` over the Debts card, so the figures already match. The design step will confirm this against the code, and the project SHALL leave the file untouched if so.
- **A8. Confirmation wording.** The buttons "Yes, mark as paid" and "Not yet" are chosen in plain language, in the style of the Stock card's "Delete item" and "Keep item".
- **A9. A debt can be paid only once.** The "Mark as paid" button is hidden on paid debts and there is no "undo". Reversing a payment is out of scope along with editing a debt.
