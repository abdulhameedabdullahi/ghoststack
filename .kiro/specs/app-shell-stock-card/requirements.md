# Requirements Document

## Introduction

**Feature:** App shell and Stock card.

This spec adds the first real screen to GhostStack: a retro Mac themed app shell with a midnight mode, three shared components (Card, Button, Field), and a working Stock card in Play mode where the owner can list, add, edit and delete items. It also adds three pure domain functions (`addItem`, `updateItem`, `deleteItem`) and wires up saving, so the owner's stock is still there the next time the app opens.

It builds on `ghoststack-foundation` and follows `product.md`, `tech.md`, `design-retro.md`, `plain-language.md` and `money-rules.md`. Existing foundation behaviour (types, `recordSale`, `recordDebt`, `settleDebt`, `totalOwed`, storage functions) does not change.

**Out of scope:** Sales log UI, Debts UI, Daily summary UI, builder mode, PWA setup, export and import, a "record sale" button on the Stock card, and the Sales log showing deleted items by name.

## Glossary

- **Kobo:** the smallest money unit. All money is a whole number of kobo. 100 kobo is 1 Naira.
- **Naira text:** the money text the owner sees and types, for example `₦1,250.50`.
- **Stack:** one shop's set of cards and their data.
- **Stock card:** the card that holds the list of Items.
- **Item:** one product in stock, with a name, quantity, cost price, sell price and low-stock level.
- **Low stock:** an Item whose quantity is at or below its low-stock level.
- **Out of stock:** an Item whose quantity is 0.
- **Domain function:** a pure function in `src/domain/`. No React, no storage.
- **Result:** the return value of a domain function. It holds either the new data or an error with a plain-language message.
- **Money_Formatter:** the UI-layer code that turns kobo into Naira text.
- **Money_Parser:** the UI-layer code that turns Naira text typed by the owner into kobo.
- **Theme:** the one CSS file that holds all colours, fonts and spacing as CSS variables.
- **Midnight mode:** the dark version of the Theme.
- **Stock_Card_View:** the React screen that shows the Stock card in Play mode.
- **App_Shell:** the React component that loads the Stack, saves changes and shows the Stock_Card_View.
- **Starter_Stack:** the default "Provisions shop" Stack created when no saved Stack exists.
- **Shared_Components:** the Card, Button and Field React components in `src/components/`.
- **parseWholeNumber:** the UI-layer function that turns typed quantity or low-stock text into a whole number, or an error.
- **parseItemForm:** the UI-layer function that turns the raw text of the item form into parsed item values, or into one error per bad Field.
- **Save_Queue:** the App_Shell mechanism that runs saves one at a time and always writes the latest Stack.

## Requirements

### Requirement 1: Add an item

**User Story:** As a shop owner, I want to add a new item to my stock, so that I can keep track of what I have.

#### Acceptance Criteria

1. WHEN `addItem` is called with valid item details, THE domain SHALL return a new Stack with one new Item added to the end of the target Stock card's list.
2. WHEN `addItem` succeeds, THE new Item SHALL have exactly the id, name, quantity, cost price, sell price and low-stock level that were passed in, with the name trimmed of spaces at both ends.
3. THE `addItem` function SHALL take the target Stock card id and the new item id as inputs, and SHALL NOT make ids or read the clock.
4. IF the item id already exists on any Stock card in the Stack, THEN THE domain SHALL return a `DUPLICATE_ID` error and SHALL NOT change the Stack.
5. IF the item name is empty after trimming spaces, THEN THE domain SHALL return a `BAD_ITEM_NAME` error and SHALL NOT change the Stack.
6. IF the quantity or the low-stock level is not a whole number of at least 0, THEN THE domain SHALL return an error and SHALL NOT change the Stack.
7. IF the cost price or the sell price is not a safe whole number of kobo of at least 0, THEN THE domain SHALL return a `BAD_PRICE` error and SHALL NOT change the Stack.
8. IF the Stock card is missing or is the wrong kind of card, THEN THE domain SHALL return a `CARD_NOT_FOUND` error and SHALL NOT change the Stack.
9. THE `addItem` function SHALL NOT change the input Stack.

### Requirement 2: Edit an item

**User Story:** As a shop owner, I want to change an item's name, amount or prices, so that my stock list stays correct.

#### Acceptance Criteria

1. WHEN `updateItem` is called with an existing item id and valid details, THE domain SHALL return a new Stack where that Item has the new name, quantity, cost price, sell price and low-stock level, with the name trimmed of spaces at both ends.
2. WHEN `updateItem` succeeds, THE domain SHALL keep the Item's id, its position in the list, and every other Item unchanged.
3. THE `updateItem` function SHALL take the target Stock card id and the item id as inputs.
4. THE `updateItem` function SHALL apply the same checks on name, quantity, low-stock level and prices as `addItem`, and SHALL return the same error codes for the same bad input.
5. IF the Item cannot be found on the target Stock card, THEN THE domain SHALL return an `ITEM_NOT_FOUND` error and SHALL NOT change the Stack.
6. IF the Stock card is missing or is the wrong kind of card, THEN THE domain SHALL return a `CARD_NOT_FOUND` error and SHALL NOT change the Stack.
7. WHEN `updateItem` succeeds, THE Sales already recorded for that Item SHALL stay unchanged, because each Sale holds its own copy of the unit price and unit cost.
8. THE `updateItem` function SHALL NOT change the input Stack.

### Requirement 3: Delete an item

**User Story:** As a shop owner, I want to remove an item I no longer sell, so that my stock list stays tidy.

#### Acceptance Criteria

1. WHEN `deleteItem` is called with an existing item id, THE domain SHALL return a new Stack where that Item is removed from the target Stock card and every other Item keeps its order.
2. THE `deleteItem` function SHALL take the target Stock card id and the item id as inputs.
3. IF the Item cannot be found on the target Stock card, THEN THE domain SHALL return an `ITEM_NOT_FOUND` error and SHALL NOT change the Stack.
4. IF the Stock card is missing or is the wrong kind of card, THEN THE domain SHALL return a `CARD_NOT_FOUND` error and SHALL NOT change the Stack.
5. WHEN an Item that has Sales recorded against it is deleted, THE domain SHALL delete the Item and SHALL leave every Sale in the Stack unchanged. *(Assumption A1: see "Assumptions to confirm".)*
6. THE `deleteItem` function SHALL NOT change the input Stack.

### Requirement 4: Item error messages and low-stock check

**User Story:** As a shop owner, I want clear messages when something is wrong, so that I know how to fix it.

#### Acceptance Criteria

1. THE domain SHALL add the error codes `BAD_ITEM_NAME` and `BAD_PRICE` to the existing error table, each with a message in simple English that says what went wrong and what to do next.
2. THE domain SHALL keep every existing error code and message unchanged.
3. THE domain SHALL provide an `isLowStock` function that returns true for an Item whose quantity is at or below its low-stock level, and false otherwise.
4. THE domain SHALL provide an `isOutOfStock` function that returns true for an Item whose quantity is 0, and false otherwise.
5. THE `BAD_PRICE` message SHALL be "Please type a price using numbers only, like 1250 or 1250.50."
6. THE error messages and UI text in this spec SHALL use Naira words only, and SHALL NOT mention kobo to the owner.

### Requirement 5: Money display and entry

**User Story:** As a shop owner, I want to see and type prices in Naira, so that I never have to think about kobo.

#### Acceptance Criteria

1. THE Money_Formatter SHALL turn a kobo value into Naira text with the Naira sign, thousands separators and exactly two decimal places, for example 125050 becomes `₦1,250.50`.
2. WHEN the owner types a price in a Field, THE Money_Parser SHALL accept whole Naira (`1250`), Naira with one or two decimal places (`1250.5`, `1250.50`), and thousands separators (`1,250.50`), with one optional leading `₦` and spaces around the sign and around the number (`" ₦ 1,250.50 "`), and SHALL return a whole number of kobo.
3. THE Money_Parser SHALL work on the typed text digit by digit and SHALL NOT use floating-point multiplication.
4. IF the typed price is empty, has letters, has more than two decimal places, is negative, is only a `₦` sign, has a second `₦` sign, or is larger than the safe limit once turned into kobo, THEN THE Money_Parser SHALL return an error that says what is wrong and how to fix it.
5. FOR ALL kobo values `k` from 0 to `Number.MAX_SAFE_INTEGER`, `parseKobo(formatKobo(k))` SHALL return `ok(k)`, and SHALL still return `ok(k)` when leading or trailing spaces are added to the formatted text (round-trip property).
6. THE domain SHALL NOT import the Money_Formatter or the Money_Parser, and all kobo to Naira conversion SHALL happen in the UI layer only.

### Requirement 6: Theme and midnight mode

**User Story:** As a shop owner, I want a clear, friendly retro look with a dark mode, so that the app is easy to read at any time of day.

#### Acceptance Criteria

1. THE Theme SHALL be one CSS file that defines every colour, font and spacing value as a CSS variable, and no other CSS file or component SHALL set a raw colour, font family or spacing value of its own.
2. THE Theme SHALL give the default look an early-Mac style: black and white base, 2px borders, a pixel-style font for titles only (the Card title bar and the screen heading), and a readable system font for all body text, Fields, Buttons, list rows and messages.
3. THE Theme SHALL define a Midnight mode that swaps the colour variables for a dark set.
4. THE App_Shell SHALL show a toggle button that switches between the light look and Midnight mode.
5. WHEN the owner uses the toggle, THE App_Shell SHALL change the look immediately and keep the choice the next time the app opens. *(Assumption A2.)*
6. WHEN the app opens and no choice has been saved, THE App_Shell SHALL use Midnight mode only if the device asks for a dark look.
7. THE toggle SHALL show its state in words (for example "Midnight mode: on"), so that meaning does not depend on colour alone.
8. THE Theme SHALL use colour pairs where text against its background has a contrast ratio of at least 4.5 to 1, in both the light look and Midnight mode.
9. THE pixel-style font SHALL be bundled in the project as a local file together with its SIL Open Font License (OFL) text, and THE app SHALL load no font from the network.
10. THE `index.html` file SHALL contain a small inline script that runs before React loads and sets the `data-theme` attribute on the page from the saved choice, or from the device's dark-look setting when no choice is saved.
11. THE inline theme script and THE App_Shell SHALL wrap every `localStorage` and `matchMedia` access in `try/catch`, so that blocked storage falls back to the device setting or the light look. *(The choice stays in `localStorage`, per Assumption A2.)*

### Requirement 7: Shared components

**User Story:** As a developer, I want shared Card, Button and Field components, so that every screen looks the same and is easy to build.

#### Acceptance Criteria

1. THE Shared_Components SHALL live in `src/components/` and SHALL take all colours, fonts and spacing from the Theme variables.
2. THE Card component SHALL render a window with a title bar that shows a title and a body area for content.
3. THE Button component SHALL render a labelled button, and SHALL support a main style and a danger style that differ by more than colour (for example by a text label or an icon).
4. THE Field component SHALL render a visible text label, an input, and an optional hint and error message, and SHALL link the label and the error message to the input so that screen readers read them.
5. THE Button component and the Field input SHALL each have a tap area at least 44px high and 44px wide.
6. THE Shared_Components SHALL show a visible focus outline on keyboard focus.
7. THE layout SHALL work on a screen 360px wide without sideways scrolling.

### Requirement 8: Stock card screen

**User Story:** As a shop owner, I want to see my items in one list, so that I know what I have and what is running low.

#### Acceptance Criteria

1. THE Stock_Card_View SHALL show the Stock card inside a Card component, using the card's title.
2. WHEN the Stock card has Items, THE Stock_Card_View SHALL list each Item with its name, quantity, sell price in Naira text and, where it applies, a low-stock or out-of-stock warning.
3. WHILE an Item is low on stock, THE Stock_Card_View SHALL show the warning text "Low stock" on that Item, together with an icon, so that the warning does not depend on colour alone.
4. WHILE an Item is out of stock, THE Stock_Card_View SHALL show the warning text "Out of stock" on that Item instead of "Low stock".
5. WHEN the Stock card has no Items, THE Stock_Card_View SHALL show a friendly empty state with a short message and one clear "Add an item" button.
6. THE Stock_Card_View SHALL offer one main action, "Add an item", that is always visible when the Stock card has Items.
7. THE Stock_Card_View SHALL show only Play mode and SHALL NOT show any builder controls.
8. THE Stock_Card_View SHALL keep the order of Items as stored in the Stack.
9. THE Stock_Card_View SHALL use simple English in all labels and messages, for example "items in stock" and not "inventory records".

### Requirement 9: Add an item in the UI

**User Story:** As a shop owner, I want a simple form to add an item, so that I can fill in my stock in a minute.

#### Acceptance Criteria

1. WHEN the owner taps "Add an item", THE Stock_Card_View SHALL show a form with Fields for name, quantity in stock, cost price, sell price and low-stock level.
2. THE form Fields for cost price and sell price SHALL take Naira text, and THE Stock_Card_View SHALL turn the form text into item values with `parseItemForm`, which uses the Money_Parser for prices, before calling `addItem`.
3. WHEN the owner saves the form with valid details, THE Stock_Card_View SHALL call `addItem` with a new item id, close the form, and show the new Item in the list.
4. WHEN the owner cancels the form, THE Stock_Card_View SHALL close the form and SHALL NOT change the Stack.
5. IF a Field value cannot be read or the domain returns an error, THEN THE Stock_Card_View SHALL keep the form open, keep what the owner typed, and show the error message next to the Field that has the problem, or at the top of the form when no single Field applies.
6. THE Stock_Card_View SHALL make the new item id in the UI layer, not in the domain.
7. THE `parseWholeNumber` function SHALL accept only text that is digits only after trimming spaces and is a safe integer, SHALL return a `BAD_QUANTITY` error for any other text, and SHALL NOT use `parseInt` or `parseFloat`.
8. THE `parseItemForm` function SHALL be a pure UI-layer function that returns either the parsed item values (trimmed name, quantity, cost price, sell price and low-stock level) or one error for each bad Field, checking every Field so that all problems are returned together.
9. WHEN the owner saves the form, THE Stock_Card_View SHALL call `parseItemForm` first, and SHALL call the domain only when `parseItemForm` returns parsed values.

### Requirement 10: Edit an item in the UI

**User Story:** As a shop owner, I want to change an item, so that I can fix a price or update the amount after new stock arrives.

#### Acceptance Criteria

1. WHEN the owner taps "Edit" on an Item, THE Stock_Card_View SHALL show the same form as Requirement 9, filled with that Item's current values, with prices shown as Naira text.
2. WHEN the owner saves the form with valid details, THE Stock_Card_View SHALL call `updateItem`, close the form, and show the changed Item in the list.
3. WHEN the owner cancels the form, THE Stock_Card_View SHALL close the form and SHALL NOT change the Stack.
4. IF a Field value cannot be read or the domain returns an error, THEN THE Stock_Card_View SHALL show the error as described in Requirement 9.5.

### Requirement 11: Delete an item in the UI

**User Story:** As a shop owner, I want to remove an item, with a check first, so that I do not delete something by accident.

#### Acceptance Criteria

1. WHEN the owner taps "Delete" on an Item, THE Stock_Card_View SHALL ask for confirmation with the Item's name, and offer a "Delete item" button and a "Keep item" button.
2. WHEN the owner confirms, THE Stock_Card_View SHALL call `deleteItem`, close the confirmation, and remove the Item from the list.
3. WHEN the owner chooses "Keep item", THE Stock_Card_View SHALL close the confirmation and SHALL NOT change the Stack.
4. IF the domain returns an error, THEN THE Stock_Card_View SHALL show the error message and keep the Item in the list.
5. THE "Delete item" button SHALL use the Button danger style.

### Requirement 12: Load and save

**User Story:** As a shop owner, I want my stock saved automatically, so that it is still there when I open the app again, even without internet.

#### Acceptance Criteria

1. WHEN the app starts, THE App_Shell SHALL load the saved Stack through the storage layer, and WHILE loading SHALL show a short "Opening your shop…" message.
2. WHEN the app starts and no saved Stack exists, THE App_Shell SHALL create the Starter_Stack, save it, and show it.
3. WHEN the app starts and several saved Stacks exist, THE App_Shell SHALL open the first Stack returned by `listStacks`. *(Assumption A3.)*
4. WHEN any domain function in this spec returns a new Stack, THE App_Shell SHALL replace the Stack on screen and call `saveStack` with it.
5. THE App_Shell SHALL call only `saveStack`, `loadStack` and `listStacks` for storage and SHALL make no network requests.
6. IF the saved data cannot be read, THEN THE App_Shell SHALL show the storage error message and SHALL NOT overwrite the saved data with a new Starter_Stack.
7. IF `saveStack` fails, THEN THE App_Shell SHALL keep the change on screen, show the storage error message, and show a "Try again" button.
8. THE App_Shell SHALL NOT change the storage layer or the Stack data shape.
9. WHEN the Stack changes, THE App_Shell SHALL keep the latest Stack in a ref, so that it can be read without waiting for a re-render.
10. THE App_Shell SHALL run saves one at a time through the Save_Queue, and each queued save SHALL write the latest Stack as read when that save starts, so that the newest write wins and an older Stack is never written after a newer one.
11. WHEN the owner taps "Try again", THE App_Shell SHALL queue a save of the latest Stack, never an older Stack captured earlier.
12. WHEN a save succeeds, THE App_Shell SHALL clear the storage error message.
13. THE App_Shell SHALL run the body of its load effect once, including under React StrictMode, so that only one Starter_Stack is ever created and saved.

### Requirement 13: Starter stack

**User Story:** As a new shop owner, I want to start with a ready-made stack, so that I can use the app straight away.

#### Acceptance Criteria

1. THE project SHALL provide a function in `src/stacks/` that builds the Starter_Stack named "Provisions shop" with the default currency (Naira) and the current schema version.
2. THE Starter_Stack SHALL contain exactly four cards, one of each kind: Stock, Sales log, Debts and Daily summary, each with a plain-language title.
3. THE Starter_Stack SHALL hold no Items, Sales or Debts, so that the Stock card first shows its empty state.
4. THE starter stack function SHALL take the ids it needs as inputs, so that the same input always gives the same Stack.
5. THE Starter_Stack SHALL pass the storage layer's Stack shape check.
6. THE App_Shell SHALL show the Stock card only, and SHALL NOT show the other three cards on screen.

### Requirement 14: Tests and money rules

**User Story:** As a developer, I want automated proof that item operations keep the numbers correct, so that the stock list can be trusted.

#### Acceptance Criteria

1. THE project SHALL have Vitest unit tests for `addItem`, `updateItem`, `deleteItem`, `isLowStock`, `isOutOfStock`, the Money_Formatter, the Money_Parser (including the `₦` sign and spaces), `parseWholeNumber`, `parseItemForm`, the exact `BAD_PRICE` message, and the starter stack function.
2. THE project SHALL have a fast-check property test for invariant 7: for any sequence of `addItem`, `updateItem`, `deleteItem` and `recordSale` calls, successful or rejected, no value in the Stack is NaN, no Item quantity is negative or fractional, and every money value is a safe whole number of kobo.
3. THE project SHALL have a fast-check property test that every new domain function (`addItem`, `updateItem`, `deleteItem`, `isLowStock` and `isOutOfStock`) leaves a deep-frozen input unchanged, whether the call succeeds or returns an error.
4. THE project SHALL have a fast-check property test that a rejected item operation returns a Stack equal to the one passed in, and that a successful `addItem` grows the list by exactly one and a successful `deleteItem` shrinks it by exactly one.
5. THE project SHALL have a fast-check round-trip property test that `parseKobo(formatKobo(k))` returns `ok(k)` for every safe `k`, also with spaces added around the formatted text, as in Requirement 5.5 (design Property 10).
6. THE project SHALL have a fast-check property test that a successful `updateItem` leaves every Sale and every other Item unchanged.
7. EACH property test SHALL be written in the same task as the function it covers.
8. THE property tests SHALL run at least 100 cases each.
9. THE existing foundation tests SHALL keep passing without edits to their expected results.
10. WHERE component tests are wanted, THE project SHALL ask for approval before adding `@testing-library/react` and a DOM test environment, and SHALL NOT add them without approval. *(Assumption A4.)*
11. THE project SHALL have a fast-check property test that `parseWholeNumber` returns `ok(n)` exactly when the trimmed text is digits only and a safe integer, with `n` equal to that number, and that `parseWholeNumber(String(n))` returns `ok(n)` for every non-negative safe integer `n` (design Property 14).
12. THE project SHALL have a fast-check property test that `parseItemForm` returns the trimmed name and original numbers for valid form text, and returns an error for exactly the set of bad Fields otherwise (design Property 15).
13. THE project SHALL have a fast-check property test that `parseKobo` returns an error for every typed price that is empty after trimming, contains a letter, has more than two digits after a decimal point, starts with a minus sign, or is larger than `Number.MAX_SAFE_INTEGER` once turned into kobo, and that the same text with a leading `₦` added is also rejected, including text with only a `₦` sign and text with a second `₦` sign (design Property 11).

## Assumptions to confirm

- **A1. Deleting an item that has sales is allowed.** Each Sale copies the unit price and unit cost when it is made, so past totals and profit stay correct after the Item is gone. The cost is that a Sale's item id no longer matches any Item. A later Sales log screen must show such a sale with a fallback name such as "Deleted item". The delete confirmation does not warn about sales in this spec, because the Stock card does not read the Sales log. Alternatives: block the delete (the owner can never clean up old items), or only allow it at quantity 0.
- **A2. The midnight choice is saved in `localStorage`.** `tech.md` names IndexedDB for storage, but this is one small display setting, not business data, and it must be readable before the Stack loads to avoid a light flash. It is not part of the Stack. Alternative: keep it in the Stack, which changes the data shape and is out of scope.
- **A3. One shop for now.** The app opens the first saved Stack. A stack picker belongs to a later spec.
- **A4. No component test tooling yet.** UI behaviour is covered by pure-function tests (money, starter stack, low-stock check) and manual checks until the owner approves testing-library and jsdom.
- **A5. Zero prices are allowed.** Cost price and sell price may be 0 (for example a free sample), matching the existing storage shape check, which accepts 0. Quantity and low-stock level may also be 0.
- **A6. Low stock means quantity at or below the low-stock level.** A level of 0 therefore warns only when the Item is out of stock.
- **A7. New error codes.** `BAD_ITEM_NAME` and `BAD_PRICE` are new. Bad quantity and low-stock level reuse the existing `BAD_QUANTITY` code, whose message ("must be a whole number, like 1 or 5") also fits a quantity of 0.
- **A8. Duplicate item ids are checked across every Stock card in the Stack**, in line with how `recordSale` checks sale ids across every Sales log card.
