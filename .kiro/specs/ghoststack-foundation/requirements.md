# Requirements: GhostStack foundation

## Introduction

This spec covers the base that every later feature builds on: the domain types, the pure money functions (record a sale, record a debt, settle a debt), offline storage in IndexedDB, and the tests that prove the money rules hold.

It follows `product.md`, `tech.md`, `money-rules.md`, `docs/PRD.md` and `docs/ARCHITECTURE.md`.

**Out of scope:** any UI beyond a bare "app loads" screen, builder mode, PWA setup, export and import. Invariants 3, 4 and 6 from `money-rules.md` are not covered here.

## Glossary

- **Kobo:** the smallest money unit. All money is a whole number of kobo.
- **Stack:** one shop's set of cards and their data.
- **Domain function:** a pure function in `src/domain/`. No React, no storage.
- **Result:** the return value of a domain function. It holds either the new data or an error with a plain-language message.

## Requirements

### Requirement 1: Domain types

**User story:** As a developer, I want clear types for stacks, cards, items, sales and debts, so that every layer shares one model of the data.

#### Acceptance criteria

1. THE domain SHALL define the types Stack, Card, Item, Sale and Debt in `src/domain/`.
2. THE domain SHALL define Card as one of four kinds: Stock, Sales log, Debts, Daily summary.
3. THE Stock card SHALL hold a list of Items. Each Item SHALL have an id, name, quantity, cost price, sell price and low-stock level.
4. THE Sales log card SHALL hold a list of Sales. Each Sale SHALL have an id, item id, quantity, unit price, unit cost and time.
5. THE Debts card SHALL hold a list of Debts. Each Debt SHALL have an id, customer name, amount, date and a status of paid or unpaid.
6. THE Daily summary card SHALL hold no records of its own.
7. THE domain SHALL store every money value (cost price, sell price, unit price, unit cost, debt amount) as an integer number of kobo.
8. THE Stack SHALL include a currency (default Naira) and a schema version.

### Requirement 2: Record a sale

**User story:** As a shop owner, I want to record a sale in two taps, so that my stock goes down and the sale is logged.

#### Acceptance criteria

1. WHEN `recordSale` is called with a valid item and quantity, THE domain SHALL return a new Stack with one new Sale added to the Sales log card.
2. WHEN `recordSale` succeeds, THE domain SHALL reduce that Item's quantity by exactly the quantity sold.
3. WHEN `recordSale` succeeds, THE new Sale SHALL copy the Item's sell price as its unit price and the Item's cost price as its unit cost.
4. IF the quantity sold is larger than the Item's quantity in stock, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
5. IF the quantity is not a whole number greater than zero, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
6. IF the item, the Stock card or the Sales log card cannot be found, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
7. IF the sale total (quantity times unit price) is not a safe whole number, THEN THE domain SHALL return an error.
8. THE `recordSale` function SHALL NOT change the input Stack.
9. THE `recordSale` function SHALL take the sale id and the time as inputs, so the same input always gives the same result.
10. IF the sale id already exists in the Stack, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
11. THE `recordSale` function SHALL take the target Stock card id and the target Sales log card id as inputs.
12. IF the Stock card or the Sales log card is missing, or is the wrong kind of card, THEN THE domain SHALL return an error and SHALL NOT change the Stack.

### Requirement 3: Record a debt

**User story:** As a shop owner, I want to write down who owes me money, so that I do not forget it.

#### Acceptance criteria

1. WHEN `recordDebt` is called with a valid customer name and amount, THE domain SHALL return a new Stack with one new unpaid Debt on the Debts card.
2. IF the amount is not a whole number of kobo greater than zero, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
3. IF the customer name is empty after trimming spaces, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
4. IF the Debts card cannot be found, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
5. THE `recordDebt` function SHALL take the debt id and the date as inputs, and SHALL NOT change the input Stack.
6. IF the debt id already exists in the Stack, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
7. THE `recordDebt` function SHALL take the target Debts card id as an input.
8. IF the Debts card is missing or is the wrong kind of card, THEN THE domain SHALL return an error and SHALL NOT change the Stack.

### Requirement 4: Settle a debt

**User story:** As a shop owner, I want to mark a debt as paid, so that my total owed is correct.

#### Acceptance criteria

1. WHEN `settleDebt` is called for an unpaid Debt, THE domain SHALL return a new Stack where that Debt is marked paid.
2. WHEN `settleDebt` succeeds, THE total owed SHALL go down by exactly that Debt's amount.
3. IF the Debt is already paid, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
4. IF the Debt or the Debts card cannot be found, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
5. THE domain SHALL provide a `totalOwed` function that returns the sum of the amounts of all unpaid Debts on a Debts card.
6. THE `settleDebt` function SHALL NOT change the input Stack.
7. THE `settleDebt` function SHALL take the target Debts card id as an input.
8. IF the Debts card is missing or is the wrong kind of card, THEN THE domain SHALL return an error and SHALL NOT change the Stack.

### Requirement 5: Error messages

**User story:** As a shop owner, I want errors that tell me what went wrong and what to do, so that I can fix the problem myself.

#### Acceptance criteria

1. EVERY domain error SHALL have a stable error code and a message in simple English.
2. EVERY domain error message SHALL say what went wrong and what to do next.

### Requirement 6: Offline storage

**User story:** As a shop owner, I want my stacks saved on my device, so that I never lose data when I have no internet.

#### Acceptance criteria

1. THE storage layer SHALL use IndexedDB through the `idb` library and SHALL make no network requests.
2. WHEN `saveStack` is called, THE storage layer SHALL save the whole Stack under its id, replacing any earlier version.
3. WHEN `loadStack` is called with a saved id, THE storage layer SHALL return a Stack equal to the one that was saved.
4. WHEN `loadStack` is called with an unknown id, THE storage layer SHALL return a "not found" result and SHALL NOT throw.
5. THE storage layer SHALL provide `listStacks`, which returns the id and name of every saved Stack.
6. WHEN data is loaded, THE storage layer SHALL check that it has the shape of a Stack. THE storage layer SHALL reject a Stack where any money value or quantity is not a non-negative safe integer, where any Item quantity is fractional, or where the schema version is unknown. IF the data fails any of these checks, THEN THE storage layer SHALL return the "saved data could not be read" error.
7. THE storage layer SHALL contain no business rules and SHALL NOT import from React.
8. THE domain SHALL NOT import from the storage layer or from React.

### Requirement 7: Tests and money rules

**User story:** As a developer, I want automated proof that the money rules hold, so that the numbers are always correct.

#### Acceptance criteria

1. THE project SHALL have Vitest unit tests for `recordSale`, `recordDebt`, `settleDebt`, `totalOwed` and the storage functions.
2. THE project SHALL have a fast-check property test for invariant 1: for any sequence of sale attempts, no Item quantity goes below zero, and a sale larger than the stock is rejected.
3. THE project SHALL have a fast-check property test for invariant 2: a successful sale reduces stock by exactly the quantity sold.
4. THE project SHALL have a fast-check property test for invariant 5: total owed equals the sum of unpaid Debt amounts, and settling a Debt reduces it by exactly that amount.
5. THE project SHALL have a fast-check property test for invariant 7: for any sequence of domain operations, no value is NaN, no stock is negative, and no money value is fractional.
6. EACH property test SHALL be written in the same task as the function it covers.
7. THE property tests SHALL run at least 100 cases each.
8. THE storage tests SHALL use the `fake-indexeddb` dev dependency. This package is approved for this project.
9. THE project SHALL have a fast-check property test that every domain function (`recordSale`, `recordDebt`, `settleDebt` and `totalOwed`) leaves a deep-frozen input Stack unchanged, whether the call succeeds or returns an error.

### Requirement 8: App loads

**User story:** As a developer, I want a bare screen that loads, so that I can see the project runs.

#### Acceptance criteria

1. WHEN the app is opened in a browser, THE app SHALL show a screen with the name "GhostStack".
2. THE screen SHALL contain no builder, play mode or card UI.
