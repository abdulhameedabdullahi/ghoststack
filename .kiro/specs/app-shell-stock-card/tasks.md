# Implementation Plan: App shell and Stock card

## Overview

Build from the bottom up: domain item functions, UI-layer money and form parsing, theme and font, shared components, starter stack with load and save, the Stock card screen, then exports and a final check. Each group ends with its tests, and each later group uses the code from the earlier ones.

## Tasks

- [x] 1. Domain error codes
  - [x] 1.1 Add `BAD_ITEM_NAME` and `BAD_PRICE` to the error table in `src/domain/result.ts`
    - Use the exact messages from design.md. `BAD_PRICE` is "Please type a price using numbers only, like 1250 or 1250.50."
    - Keep every existing code and message unchanged. No message mentions kobo.
    - _Requirements: 4.1, 4.2, 4.5, 4.6_
  - [x] 1.2 Add unit tests for the new table entries
    - Check both new keys exist, the exact `BAD_PRICE` text, that no message contains the word "kobo", and that every pre-existing key and message is untouched.
    - Extend the existing error table test; do not change its expected results.
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 14.1, 14.9_

- [x] 2. Item functions in the domain
  - [x] 2.1 Implement `addItem` in `src/domain/items.ts`
    - Check order: name, quantity and low-stock level (`BAD_QUANTITY`), prices (`BAD_PRICE`), card lookup, duplicate id across every Stock card. Append the new Item with a trimmed name.
    - Pure, no mutation, id passed in, no clock.
    - _Requirements: 1.1 to 1.9, 4.1_
  - [x] 2.2 Implement `updateItem` in `src/domain/items.ts`
    - Same checks 1 to 4 as `addItem`, then card lookup, then `ITEM_NOT_FOUND`. Keep the Item's id and list position. Leave other Items, other cards and all Sales unchanged by reference.
    - _Requirements: 2.1 to 2.8_
  - [x] 2.3 Implement `deleteItem` in `src/domain/items.ts`
    - Card lookup, then item lookup, then remove the Item and keep the order of the rest. Leave every Sale untouched.
    - _Requirements: 3.1 to 3.6_
  - [x] 2.4 Implement `isLowStock` and `isOutOfStock` in `src/domain/items.ts`
    - `quantity <= lowStockLevel` and `quantity === 0`. Total and pure.
    - _Requirements: 4.3, 4.4_
  - [x] 2.5 Write unit tests in `src/domain/items.test.ts`
    - One example per error code for each function (duplicate id, blank name, bad quantity, bad low-stock level, bad cost price, bad sell price, card not found, wrong card kind, item not found), a trimming example (`"  Rice  "`), boundary examples for `isLowStock` and `isOutOfStock`, and a check that Sales are unchanged after `updateItem` and `deleteItem`.
    - _Requirements: 1.1 to 1.9, 2.1 to 2.8, 3.1 to 3.6, 4.3, 4.4, 14.1_
  - [x] 2.6 Write fast-check property test for add/update/delete success cases
    - File: `src/domain/items.property.test.ts`. At least 100 runs. Add the shared generators (`arbKobo`, `arbItem`, `arbStack`) here.
    - **Property 1: Adding an item grows the list by one with the item appended**
    - **Property 2: Updating an item changes only that item's fields**
    - **Property 3: Deleting an item shrinks the list by one and preserves order and sales**
    - **Validates: Requirements 1.1, 1.2, 1.9, 2.1, 2.2, 2.7, 2.8, 3.1, 3.5, 3.6, 14.4, 14.6, 14.7, 14.8**
  - [x] 2.7 Write fast-check property test for rejected calls
    - **Property 4: Rejected `addItem` calls never change the Stack**
    - **Property 5: Rejected `updateItem` calls never change the Stack**
    - **Property 6: Rejected `deleteItem` calls never change the Stack**
    - **Validates: Requirements 1.4 to 1.9, 2.4 to 2.6, 2.8, 3.3, 3.4, 3.6, 14.4, 14.7, 14.8**
  - [x] 2.8 Write fast-check property test for frozen input
    - **Property 7: Item functions never mutate a frozen input**
    - Deep-freeze the Stack or Item, call each of the five functions with valid and invalid input, and compare with a snapshot.
    - **Validates: Requirements 1.9, 2.8, 3.6, 14.3, 14.7, 14.8**
  - [x] 2.9 Write fast-check property test for add/update agreement
    - **Property 8: `addItem` and `updateItem` agree on validation errors**
    - **Validates: Requirements 2.4, 14.7, 14.8**
  - [x] 2.10 Write fast-check property test for the stock checks
    - **Property 9: `isLowStock` and `isOutOfStock` match their definitions**
    - **Validates: Requirements 4.3, 4.4, 14.7, 14.8**
  - [x] 2.11 Write fast-check property test for invariant 7 across item and sale operations
    - **Property 13: No sequence of item and sale operations produces an invalid number (invariant 7)**
    - Random sequences of `addItem`, `updateItem`, `deleteItem` and `recordSale` calls, valid or invalid. Add `arbItemOperation` here.
    - **Validates: Requirements 14.2, 14.7, 14.8**

- [x] 3. Money and form parsing in `src/domain-ui/`
  - [x] 3.1 Implement `formatKobo` and `parseKobo` in `src/domain-ui/money.ts`
    - String building and digit-string parsing only. No floating-point multiplication, no `parseInt`. Accept one optional leading `₦` with spaces around the sign and the number. Reuse the `BAD_PRICE` code and message for errors.
    - Do not import this file from anything under `src/domain/`.
    - _Requirements: 5.1 to 5.4, 5.6_
  - [x] 3.2 Write unit tests in `src/domain-ui/money.test.ts`
    - `formatKobo`: `0` gives `₦0.00`, `125050` gives `₦1,250.50`, and a value with two comma groups.
    - `parseKobo`: accepts `1250`, `1250.5`, `1250.50`, `1,250.50`, `₦1,250.50` and ` ₦ 1,250.50 `. Rejects empty, `₦` alone, `₦₦5`, letters, three decimal places, negative and over the safe limit.
    - _Requirements: 5.1 to 5.4, 14.1_
  - [x] 3.3 Write fast-check property test for the money round trip
    - File: `src/domain-ui/money.property.test.ts`. At least 100 runs.
    - **Property 10: Money formatting and parsing round-trip**
    - **Validates: Requirements 5.5, 14.5, 14.7, 14.8**
  - [x] 3.4 Write fast-check property test for invalid typed prices
    - **Property 11: Invalid typed prices are rejected with an error**
    - Cover empty text, letters, more than two decimal places, a minus sign, values above the safe limit, and the same text with a leading `₦`, including `₦` alone and `₦₦5`.
    - **Validates: Requirements 5.4, 14.13, 14.7, 14.8**
  - [x] 3.5 Implement `parseWholeNumber` in `src/domain-ui/wholeNumber.ts` with unit tests in `wholeNumber.test.ts`
    - Trim, require `/^\d+$/`, require a safe integer. Return `BAD_QUANTITY` otherwise. No `parseInt` or `parseFloat`.
    - Examples: accept `"0"`, `"5"`, `" 12 "`, `"007"`. Reject empty, `"12abc"`, `"1.5"`, `"-1"`, `"1e3"`, `"0x10"`, `"9007199254740993"`.
    - _Requirements: 9.7, 14.1_
  - [x] 3.6 Write fast-check property test for `parseWholeNumber`
    - File: `src/domain-ui/wholeNumber.property.test.ts`. At least 100 runs.
    - **Property 14: `parseWholeNumber` accepts exactly digit strings that are safe integers**
    - **Validates: Requirements 9.7, 14.11, 14.7, 14.8**
  - [x] 3.7 Implement `parseItemForm` in `src/domain-ui/itemForm.ts` with unit tests in `itemForm.test.ts`
    - Uses `parseWholeNumber` and `parseKobo`. Trims the name (empty gives the `BAD_ITEM_NAME` message). Checks every Field and returns one error per bad Field. Never calls the domain.
    - Unit tests: one all-valid example, one example per single bad Field, one example with all five Fields bad, and a name-trimming example.
    - Define `ItemFormValues`, `ParsedItemValues`, `ItemFormErrors` and `ParseItemFormResult` here.
    - _Requirements: 9.2, 9.8, 9.9, 14.1_
  - [x] 3.8 Write fast-check property test for `parseItemForm`
    - File: `src/domain-ui/itemForm.property.test.ts`. At least 100 runs. Add `arbItemFormValues` here.
    - **Property 15: `parseItemForm` returns parsed values for valid text and per-field errors for invalid text**
    - **Validates: Requirements 9.8, 9.9, 14.12, 14.7, 14.8**

- [x] 4. Theme, bundled font and inline theme script
  - [x] 4.1 Create `src/components/theme.css`
    - Define every colour, font and spacing value as a CSS variable, including `--tap-min: 44px`. Add the `[data-theme="midnight"]` set, one shared `:focus-visible` outline, `body { font-family: var(--font-body); }`, and make the Card header rule the only rule that reads `--font-pixel`.
    - Pick colour pairs with at least 4.5 to 1 contrast in both sets and check them once with a contrast calculator.
    - _Requirements: 6.1 to 6.3, 6.8, 7.6_
  - [x] 4.2 Bundle the Press Start 2P font and add the `@font-face` rule
    - Save `PressStart2P-Regular.woff2` and `OFL.txt` in `src/components/fonts/`. Load them with a relative `url(...)` and `font-display: swap` in `theme.css`.
    - If the font file cannot be fetched, stop and ask the user. No `<link>`, `@import` or script may load a font from the network.
    - _Requirements: 6.2, 6.9_
  - [x] 4.3 Add the inline theme script to `index.html`
    - In `<head>`, before the React bundle. Read `ghoststack:theme` in `try/catch`, fall back to `matchMedia("(prefers-color-scheme: dark)")` in the same `try/catch`, default to light, and set `document.documentElement.dataset.theme`. Do not write to `localStorage`.
    - _Requirements: 6.5, 6.6, 6.10, 6.11_
  - [x] 4.4 Import `theme.css` in `src/main.tsx`
    - _Requirements: 6.1_

- [x] 5. Shared components
  - [x] 5.1 Create `Card.tsx` and `Card.css` in `src/components/`
    - Title bar (`<header>`) and body area. Optional footer. Theme variables only.
    - _Requirements: 7.1, 7.2, 7.7_
  - [x] 5.2 Create `Button.tsx` and `Button.css` in `src/components/`
    - `main` and `danger` variants. The danger variant also shows a warning icon before the label. `min-height` and `min-width` of `var(--tap-min)`.
    - _Requirements: 7.1, 7.3, 7.5_
  - [x] 5.3 Create `Field.tsx` and `Field.css` in `src/components/`
    - Visible `<label>`, input, optional hint, and error with `role="alert"`. Link them with `htmlFor`, `id` and `aria-describedby`. Input `min-height` of `var(--tap-min)`. Layout works at 360px without sideways scrolling.
    - _Requirements: 7.1, 7.4, 7.5, 7.7_

- [x] 6. Starter stack and App_Shell load and save
  - [x] 6.1 Implement `buildStarterStack` in `src/stacks/starterStack.ts` with unit tests in `starterStack.test.ts`
    - "Provisions shop", current schema version, default currency, four cards in order (Stock, Sales log, Money owed to you, Daily summary), all empty. Takes `StarterStackIds`.
    - Unit test: card types, titles, empty lists, and that the result passes `isStack`.
    - _Requirements: 13.1 to 13.5, 14.1_
  - [x] 6.2 Write fast-check property test for the starter stack
    - Add to `src/stacks/starterStack.test.ts`. At least 100 runs.
    - **Property 12: The starter stack always has the same fixed shape**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 14.7, 14.8**
  - [x] 6.3 Implement load in `src/App.tsx`
    - Show "Opening your shop…" while loading. Call `listStacks`, open the first Stack with `loadStack`, or build, save and show the Starter_Stack when none exists. Guard the load effect with a `loadStartedRef` flag so it runs its body once under StrictMode, and do not cancel on cleanup.
    - If `loadStack` fails, show the storage error message and do not create a Starter_Stack.
    - Show only the Stock card. Until group 7, render it as a plain `Card` with its title.
    - Use only `saveStack`, `loadStack` and `listStacks`. No network calls.
    - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.6, 12.8, 12.13, 13.6_
  - [x] 6.4 Implement save queue, retry and theme toggle in `src/App.tsx`
    - `onStackChange(newStack)` sets state, stores `latestStackRef.current`, and enqueues a save on a promise chain (`saveQueueRef`). Each job reads `latestStackRef.current` when it starts and calls `saveStack`.
    - On failure keep the change on screen, show the storage error message and a "Try again" `Button` that enqueues a save of the latest Stack. A later successful save clears the message.
    - Add the Midnight toggle with a word label ("Midnight mode: on" / "Midnight mode: off"). It reads `document.documentElement.dataset.theme` as its initial state, sets the attribute immediately, and writes `ghoststack:theme` in `try/catch`.
    - _Requirements: 6.4, 6.5, 6.7, 6.11, 12.4, 12.7, 12.9 to 12.12_

- [x] 7. Stock_Card_View
  - Import the item functions from `src/domain/items` directly until group 8 adds the `index.ts` exports. Do not add component tests (Assumption A4).
  - [x] 7.1 Create `StockCardView.tsx`, `StockCardView.css` and `ItemRow.tsx` in `src/components/cards/` with the list, warnings and empty state
    - Card with the card's title. Rows show name, quantity and `formatKobo(sellPrice)`. Check `isOutOfStock` before `isLowStock`: show "Out of stock" or "Low stock" with an icon. Keep stored order. Empty state with one "Add an item" button. Always-visible "Add an item" button when there are Items. Simple English only. Play mode only.
    - _Requirements: 8.1 to 8.9_
  - [x] 7.2 Create `ItemForm.tsx` and add the add-item flow
    - Five Fields (name, quantity in stock, cost price, sell price, low-stock level) kept as raw text. On save call `parseItemForm` first, show `fieldErrors` next to each bad Field and keep what was typed. Only on success call `addItem` with `crypto.randomUUID()`, show a domain error as a form error at the top, and on success close the form and call `onStackChange`. Cancel closes the form with no domain call.
    - _Requirements: 9.1 to 9.9_
  - [x] 7.3 Add the edit-item flow
    - "Edit" opens the same form pre-filled from the Item, with prices from `formatKobo`. Save calls `parseItemForm`, then `updateItem`. Errors shown as in 7.2.
    - _Requirements: 10.1 to 10.4_
  - [x] 7.4 Add the delete-item flow with confirmation
    - Confirmation shows the Item's name with a danger-style "Delete item" button and a "Keep item" button. Confirm calls `deleteItem`, closes the confirmation and updates the list. "Keep item" changes nothing. On a domain error show the message and keep the Item.
    - _Requirements: 11.1 to 11.5_
  - [x] 7.5 Replace the placeholder Card in `src/App.tsx` with `StockCardView`
    - Pass the Stock card and `onStackChange`. The other three cards stay hidden.
    - _Requirements: 12.4, 13.6_

- [x] 8. Domain exports
  - [x] 8.1 Export `addItem`, `updateItem`, `deleteItem`, `isLowStock`, `isOutOfStock` and their input types from `src/domain/index.ts`
    - Switch `StockCardView` and its tests to import from `src/domain`. Do not export anything from `src/domain-ui/` here.
    - _Requirements: 5.6, 14.9_

- [x] 9. Final check
  - [x] 9.1 Run `npx vitest run` and `npx tsc --noEmit`. Fix any failure.
    - Existing foundation tests must still pass with no edits to expected results.
    - _Requirements: 14.1 to 14.9_
  - [x] 9.2 Run the production build.
    - _Requirements: 6.9, 12.5_
  - [x] 9.3 Do a manual check in the browser and write down the result
    - Mobile at 360px: no sideways scrolling, every Button and Field input at least 44px high and wide, visible focus outline on keyboard focus.
    - Midnight mode: toggle switches at once, choice survives reload, first load follows the device dark setting, no light flash, label says "Midnight mode: on/off".
    - Stock card: empty state, add, edit, delete with confirm and "Keep item", low-stock and out-of-stock warnings with icon and text, form errors next to the right Field and typed text kept.
    - Storage: items survive reload, works offline, no font or other network request in the browser network tab, only one Starter_Stack under StrictMode in dev.
    - _Requirements: 6.4 to 6.8, 7.5 to 7.7, 8.2 to 8.6, 9.5, 11.1 to 11.3, 12.2, 12.4, 12.13_
  - [x] 9.4 Update `KIRO_NOTES.md` counts (specs, property tests, any bugs they found) and add a log row.
    - _Requirements: 14.2 to 14.8_

## Notes

- Property tests sit next to the function they cover (Requirement 14.7) and each runs at least 100 cases.
- No component tests are added (Assumption A4). Screen behaviour is checked by the manual list in 9.3.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["2.5", "2.6"] },
    { "id": 6, "tasks": ["2.7"] },
    { "id": 7, "tasks": ["2.8"] },
    { "id": 8, "tasks": ["2.9"] },
    { "id": 9, "tasks": ["2.10"] },
    { "id": 10, "tasks": ["2.11"] },
    { "id": 11, "tasks": ["3.1", "3.5"] },
    { "id": 12, "tasks": ["3.2", "3.3", "3.6", "3.7"] },
    { "id": 13, "tasks": ["3.4", "3.8"] },
    { "id": 14, "tasks": ["4.1", "4.3"] },
    { "id": 15, "tasks": ["4.2", "4.4"] },
    { "id": 16, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 17, "tasks": ["6.1"] },
    { "id": 18, "tasks": ["6.2", "6.3"] },
    { "id": 19, "tasks": ["6.4"] },
    { "id": 20, "tasks": ["7.1"] },
    { "id": 21, "tasks": ["7.2"] },
    { "id": 22, "tasks": ["7.3"] },
    { "id": 23, "tasks": ["7.4"] },
    { "id": 24, "tasks": ["7.5"] },
    { "id": 25, "tasks": ["8.1"] },
    { "id": 26, "tasks": ["9.1"] },
    { "id": 27, "tasks": ["9.2"] },
    { "id": 28, "tasks": ["9.3"] },
    { "id": 29, "tasks": ["9.4"] }
  ]
}
```
