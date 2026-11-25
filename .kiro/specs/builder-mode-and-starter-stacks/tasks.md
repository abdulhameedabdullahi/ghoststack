# Implementation Plan: Builder mode and starter stacks

## Overview

Build from the bottom up: new error codes and the `hidden` flag, the pure builder functions in `src/domain/cards.ts` with their unit and property tests, the `isStack` change, the farm stall starter and sample items, the last-opened-id helpers, then the shared Dialog, Mode_Switch, Builder_Panel, Starter_Chooser and Stack_Picker. After that, the App_Shell is wired in steps: tab wiring first (followed by a full test run that only reports), then mode and Builder_Panel, then the Starter_Chooser, then the Stack_Picker. Component tests come last. Each property from `design.md` is its own sub-task and runs at least 100 cases. Existing tests stay unedited; new test cases go in new files. The one exception is the length offset in `src/domain/validate.test.ts` (task 1.2).

## Tasks

- [x] 1. Error codes and the hidden flag
  - [x] 1.1 Add six error codes to `src/domain/result.ts`
    - Append `NAME_REQUIRED`, `NAME_TOO_LONG`, `CANNOT_MOVE_FURTHER`, `BAD_DIRECTION`, `MUST_STAY_VISIBLE` and `BAD_HIDDEN_VALUE` to `ERROR_MESSAGES` with the exact messages in `design.md`. Do not change or reword any existing entry.
    - _Requirements: 1.5, 1.6, 2.4, 2.6, 3.4, 3.6, 12.5_
  - [x] 1.2 Update the length offset in `src/domain/validate.test.ts`
    - Change only the trailing constant in `expect(ERROR_CODES.length).toBe(Object.keys(existing).length + 2)` from `+ 2` to `+ 8`. Do not touch the `existing` literal or any other line.
    - _Requirements: 1.5, 1.6, 2.4, 2.6, 3.4, 3.6_
  - [x] 1.3 Add `hidden?: boolean` to `CardBase` in `src/domain/types.ts`
    - Optional, with a short comment: absent or false means visible. Leave `schemaVersion` at 1.
    - _Requirements: 5.1, 5.5_

- [x] 2. `renameStack` and `renameCard`
  - [x] 2.1 Create `src/domain/cards.ts` with `NAME_MAX_LENGTH`, `validateName`, `findCardIndex`, `isVisible`, `renameStack` and `renameCard`
    - Follow `design.md`. Name check runs before the card lookup. Pure: no clock, no ids, no storage, no mutation.
    - _Requirements: 1.1 to 1.9, 4.1, 4.2, 4.5, 4.8_
  - [x] 2.2 Write unit tests in `src/domain/cards.test.ts`
    - Names of exactly 40 and 41 characters, padded names, a non-string name, an unknown card id, applying the same name twice.
    - _Requirements: 1.3 to 1.9_
  - [x] 2.3 Write property test for name validation
    - File: `src/domain/cards.property.test.ts`. Add the shared generators here (valid Stack with Items, Sales and Debts, some hidden cards, at least one visible; card id picker; absent-id generator; deepFreeze helper). At least 100 runs.
    - **Property 1: Name validation is consistent for `renameStack` and `renameCard`**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 13.9**
  - [x] 2.4 Write property test for `renameCard` targeting and idempotence
    - Include applying the same name twice.
    - **Property 2: `renameCard` changes only the targeted Card's title**
    - **Validates: Requirements 1.4, 1.9, 13.12**

- [x] 3. `moveCard`
  - [x] 3.1 Add `moveCard` to `src/domain/cards.ts`
    - Direction check, then card lookup, then neighbour check, over all cards including hidden ones.
    - _Requirements: 2.1 to 2.8_
  - [x] 3.2 Add `moveCard` unit tests to `src/domain/cards.test.ts`
    - A one-card Stack (both directions give `CANNOT_MOVE_FURTHER`), first card up, last card down, a hidden neighbour, an unknown id, a bad direction.
    - _Requirements: 2.2 to 2.6_
  - [x] 3.3 Write property test for swapping with the neighbour
    - Generator includes hidden cards at the target and the neighbour.
    - **Property 3: `moveCard` swaps a Card with its neighbour, counting hidden cards**
    - **Validates: Requirements 2.2, 2.3, 4.4, 13.3**
  - [x] 3.4 Write property test for the move round trip
    - **Property 4: Moving a Card up then down (or down then up) returns the original Stack**
    - **Validates: Requirements 2.7, 2.8, 13.3**
  - [x] 3.5 Write property test for bad directions
    - **Property 5: Invalid `moveCard` direction is rejected**
    - **Validates: Requirements 2.6**

- [x] 4. `setCardHidden` and `visibleCards`
  - [x] 4.1 Add `setCardHidden` to `src/domain/cards.ts`
    - Hiding sets `hidden: true`. Showing removes the key. Reject hiding the last visible card with `MUST_STAY_VISIBLE`.
    - _Requirements: 3.1 to 3.8_
  - [x] 4.2 Add `visibleCards` to `src/domain/cards.ts` and export the new functions and `NAME_MAX_LENGTH` from `src/domain/index.ts`
    - Add only new exports.
    - _Requirements: 17.1, 17.2, 17.3_
  - [x] 4.3 Add `setCardHidden` and `visibleCards` unit tests to `src/domain/cards.test.ts`
    - Hiding the last visible card among hidden ones, showing a card with no flag, `visibleCards` on an all-hidden Stack and on a Stack with no cards.
    - _Requirements: 3.2 to 3.8, 17.2, 17.3_
  - [x] 4.4 Write property test for hiding rules
    - Generator includes Stacks with exactly one visible card.
    - **Property 7: `setCardHidden` can only hide a Card when another Card stays visible, and only changes the targeted Card's `hidden` flag**
    - **Validates: Requirements 3.2, 3.3, 3.4**
  - [x] 4.5 Write property test for bad `hidden` values
    - **Property 8: Invalid `hidden` value is rejected**
    - **Validates: Requirements 3.6**
  - [x] 4.6 Write property test for unknown card ids
    - Cover `renameCard`, `moveCard` and `setCardHidden`.
    - **Property 6: An unknown card id is rejected the same way by every card-targeting Builder_Function**
    - **Validates: Requirements 1.8, 2.5, 3.5**
  - [x] 4.7 Write property test for `visibleCards`
    - **Property 14: `visibleCards` returns exactly the visible Cards, in order, without changing the Stack**
    - **Validates: Requirements 17.2, 17.3, 17.5**

- [x] 5. Cross-function properties for the builder functions
  - [x] 5.1 Write property test for data safety
    - All four functions, success and failure. Check Items, Sales and Debts unchanged, Stack id and currency, Card ids and types unchanged, and a Card-id permutation for `moveCard`. Also check an error leaves the input deep-equal to a snapshot.
    - **Property 9: Builder_Functions never change any Item, Sale or Debt, and preserve Stack and Card identity on success**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 13.1, 13.2, 13.4, 14.1, 14.4**
  - [x] 5.2 Write property test for frozen input
    - Deep-freeze the Stack, call all four functions with valid and invalid arguments.
    - **Property 10: Builder_Functions never throw on or mutate a frozen Stack**
    - **Validates: Requirements 4.5, 4.7, 13.6**
  - [x] 5.3 Write property test for call sequences
    - Fold a short sequence of tagged calls. After each step at least one card is visible.
    - **Property 16: At least one Card stays visible through any sequence of Builder_Function calls**
    - **Validates: Requirements 4.6, 13.5**

- [x] 6. Checkpoint - Ensure all tests pass
  - Run `npx vitest run` and `npx tsc --noEmit`. Ask the user if questions arise.

- [x] 7. Backward-compatible storage for `hidden`
  - [x] 7.1 Change `isCard` in `src/storage/isStack.ts`
    - Add one check after the `id`/`title` check: reject when `c.hidden !== undefined && typeof c.hidden !== "boolean"`. No new imports.
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.8_
  - [x] 7.2 Write unit tests in a new file `src/storage/isStack.hidden.test.ts`
    - `hidden` absent (accepted), `true`, `false`, `"yes"` (rejected), `null` (rejected), `schemaVersion` 2 (rejected).
    - _Requirements: 5.2 to 5.5_
  - [x] 7.3 Write property test for `hidden` values
    - In the same new file. Overwrite one Card's `hidden` with absent, `true`, `false` or an invalid value. Include a Stack with the flag removed from every card.
    - **Property 12: `isStack` accepts every valid `hidden` value and rejects every invalid one**
    - **Validates: Requirements 5.2, 5.3, 5.4, 13.8**
  - [x] 7.4 Write property test that builder results pass `isStack`
    - In `src/domain/cards.property.test.ts`.
    - **Property 11: A successful Builder_Function call keeps at least one Card visible and is accepted by the Stack_Checker**
    - **Validates: Requirements 4.6, 4.9, 13.11**
  - [x] 7.5 Write property test for the save and load round trip
    - New file `src/storage/stackStore.hidden.property.test.ts`, using `fake-indexeddb/auto` and the same setup as `stackStore.test.ts`. Use Stacks with a mix of absent, `true` and `false` flags.
    - **Property 15: Saving then loading a Stack preserves `hidden` flags**
    - **Validates: Requirements 5.7**

- [x] 8. Farm produce stall starter and sample items
  - [x] 8.1 Add `buildFarmStallStack` to `src/stacks/starterStack.ts`
    - Same shape as `buildStarterStack`, reusing `DEFAULT_CURRENCY` and `SCHEMA_VERSION`. Do not edit `buildStarterStack`.
    - _Requirements: 9.1 to 9.5, 9.7, 9.8_
  - [x] 8.2 Write tests in a new file `src/stacks/starterStack.farm.test.ts`
    - Unit test with one fixed Ids fixture (name, titles, order, empty records). Add the property below.
    - **Property 13: Each Starter_Function returns its fixed shape for any ids, and the result is always accepted by the Stack_Checker**
    - **Validates: Requirements 9.2 to 9.8, 13.7**
  - [x] 8.3 Create `src/domain-ui/sampleItems.ts`
    - `SampleItemSpec` and `SAMPLE_ITEMS_BY_STARTER` with the two lists from `design.md`. No ids, no React.
    - _Requirements: 9.9, 9.10, 9.11_
  - [x] 8.4 Write unit tests in `src/domain-ui/sampleItems.test.ts`
    - Each list has at least one entry, the lists share no name, every name contains "Sample", and every entry is accepted by `addItem` on a fixed Stack fixture.
    - _Requirements: 9.9, 9.10_

- [x] 9. Last-opened id helpers
  - [x] 9.1 Create `src/storage/lastOpened.ts`
    - Export `rememberLastOpenedId(id)` and `readLastOpenedId()` using the key `ghoststack:lastOpenedStackId`. Every `localStorage` access is inside try/catch; read returns `null` on failure.
    - _Requirements: 11.7, 11.8_
  - [x] 9.2 Write unit tests in `src/storage/lastOpened.test.ts`
    - Use `// @vitest-environment jsdom`. Write then read returns the id; reading with nothing stored returns `null`; a `localStorage` that throws on read and on write causes no error.
    - _Requirements: 11.8_

- [x] 10. Checkpoint - Ensure all tests pass
  - Run `npx vitest run` and `npx tsc --noEmit`. Ask the user if questions arise.

- [x] 11. Shared Dialog
  - [x] 11.1 Create `src/components/Dialog.tsx` and `Dialog.css`
    - Props `titleId`, `children`, `onClose`, `initialFocusRef?`. `role="dialog"`, `aria-modal="true"`, `aria-labelledby`. Focus moves in on mount. Tab and Shift+Tab loop inside. Escape calls `onClose` and stops propagation. Theme variables only; buttons at least `var(--tap-min)`.
    - _Requirements: 12.1, 12.2, 12.6, 12.7, 19.1, 19.2_

- [x] 12. Mode_Switch
  - [x] 12.1 Create `src/components/ModeSwitch.tsx` and `ModeSwitch.css`
    - Two toggle buttons, "▸ Play" and "🛠 Builder", with `aria-pressed` and a visible "(current)" text on the active one. At least 44px.
    - _Requirements: 7.1, 7.2, 7.7, 12.1, 12.3, 12.4_

- [x] 13. Builder_Panel
  - [x] 13.1 Add an optional `ariaLabel?: string` prop to `src/components/Button.tsx`
    - Additive only; existing call sites are unaffected.
    - _Requirements: 8.4_
  - [x] 13.2 Create `src/components/builder/RenameDialog.tsx`
    - One `Field` inside a `Dialog`. Props `label`, `initialValue`, `error`, `onSubmit`, `onClose`. Used for both the shop and a card.
    - _Requirements: 1.5, 1.6, 8.9, 12.6, 12.7, 19.1_
  - [x] 13.3 Create `src/components/builder/BuilderCardRow.tsx`
    - Title, "Showing" or "Hidden" with an icon, "Rename", "Move up", "Move down", "Hide" or "Show". Accessible labels name the card. Each control has `data-builder-card` and `data-builder-control`. Disabled rules and the "one card must stay showing" note. Error shown next to the control with `role="alert"`.
    - _Requirements: 8.2 to 8.5, 8.7, 8.8, 12.1, 12.3_
  - [x] 13.4 Create `src/components/builder/BuilderPanel.tsx` and `BuilderPanel.css`
    - Shop name with "Rename shop", the full card list, and "Choose a starter". Call the Builder_Functions and pass the new Stack to `onStackChange` only on success. Add `pendingFocus` with `rootRef`, and an effect that finds the control by data attributes and falls back to the opposite control when disabled. No add, delete or drag controls; never read Items, Sales or Debts.
    - _Requirements: 8.1 to 8.11, 10.3, 14.1, 15.1 to 15.3_

- [x] 14. Starter_Chooser
  - [x] 14.1 Create `src/components/builder/StarterChooser.tsx` and `StarterChooser.css`
    - Two choices with short descriptions, one main action each. Optional "Cancel" only when `onCancel` is given. A pending state while saving. On failure show the message and a "Try again" button. Works at 360px.
    - _Requirements: 10.4, 10.7, 10.8, 10.9, 12.1, 12.9_

- [x] 15. Stack_Picker
  - [x] 15.1 Create `src/components/StackPicker.tsx` and `StackPicker.css`
    - Plain name when fewer than two stacks; a `<select>` otherwise; `disabled` prop; no delete control.
    - _Requirements: 11.1, 11.2, 11.3, 11.6, 11.9, 12.1_

- [x] 16. Tab_Bar overflow
  - [x] 16.1 Add truncation to `src/components/TabBar.css`
    - Tabs truncate with an ellipsis, the bar wraps or scrolls inside itself, and the full title stays in the tab's text for screen readers. No change to keyboard behaviour in `TabBar.tsx`.
    - _Requirements: 6.8, 16.1, 16.2, 16.3_

- [x] 17. Checkpoint - Ensure all tests pass
  - Run `npx vitest run` and `npx tsc --noEmit`. Ask the user if questions arise.

- [x] 18. App_Shell tab wiring
  - [x] 18.1 Change the Tab_Bar wiring in `src/App.tsx`
    - Replace `selectedTab: CardType` with `selectedCardId`. Derive `selectedCard` during render as the visible card with that id, else the first visible card. Feed the Tab_Bar from `visibleCards(stack)` with `card.title` as the label. Use `selectedCard.id` for the panel ids and `selectedCard.type` to pick the view. Keep the four typed lookups. Keep resetting `dayRange` when a daily-summary card is chosen. Change nothing else.
    - _Requirements: 6.1 to 6.7, 14.2, 5.6_

- [x] 19. Full test run after tab wiring
  - [x] 19.1 Run `npx vitest run` and report the result
    - List every failing test that relied on the old "Debts" tab label (the Provisions debts tab is now "Money owed to you"). Report them to the user. Do not edit any test.
    - _Requirements: 6.6_

- [x] 20. App_Shell wiring
  - [x] 20.1 Add Mode_Switch and Builder_Panel wiring to `src/App.tsx`
    - `mode` state starts as `"play"`. Render `ModeSwitch` above both branches. Play mode shows the Tab_Bar and the card view with no builder control. Builder mode shows `BuilderPanel` in place of them. `onStackChange` is the existing save path.
    - _Requirements: 7.3 to 7.6, 8.6, 8.9_
  - [x] 20.2 Add the Starter_Chooser to `src/App.tsx`
    - Add the `choosing` load state: an empty `listStacks` result shows the Starter_Chooser with no `onCancel` and builds nothing. Add `starterChooserOpen` for the Builder_Panel's "Choose a starter" with `onCancel`. Write one `onPick`: await the save queue, make fresh ids with `crypto.randomUUID`, call the starter function, add sample Items in memory with `addItem` (fresh id each), call `saveStack` once, then open the Stack in Play mode with the first visible card selected and remember its id. On any failure return the message and stay on the chooser, saving nothing.
    - _Requirements: 9.9, 9.11, 9.12, 10.1 to 10.8_
  - [x] 20.3 Add the Stack_Picker, save sequencing and last-opened id to `src/App.tsx`
    - `savedStacks` refreshed after saves and loads. `savesInFlight` counter in `enqueueSave` (decrement in `finally`). `openStack` awaits the save queue first, then loads; on error show the message and keep the current Stack. On start use `readLastOpenedId`, falling back to the first saved Stack if it is missing or fails to load. Call `rememberLastOpenedId` when a Stack is opened or created.
    - _Requirements: 11.1 to 11.8_

- [x] 21. Component tests
  - [x] 21.1 Write `src/components/ModeSwitch.test.tsx`
    - `// @vitest-environment jsdom` and `import "../test/setup";`. Both buttons render, `aria-pressed` is right, clicking the inactive one calls `onChange`.
    - _Requirements: 18.1, 7.1, 7.2_
  - [x] 21.2 Write `src/components/Dialog.test.tsx`
    - Role and aria attributes, focus moves in, Tab and Shift+Tab loop, Escape closes and returns focus to the Opener (using `RenameDialog` with a test opener).
    - _Requirements: 12.6, 12.7, 19.1, 19.2_
  - [x] 21.3 Write `src/components/builder/BuilderPanel.test.tsx`
    - A rename error shows next to the right control; first row "Move up" and last row "Move down" are disabled; the lone visible card's "Hide" is disabled with the note; focus after a move stays on the same control, and moves to the opposite control when it is now disabled; focus after Hide and Show.
    - _Requirements: 18.2, 8.5, 8.7, 8.8, 15.1 to 15.3_
  - [x] 21.4 Write `src/components/builder/StarterChooser.test.tsx`
    - A failed pick shows the message, stays on the chooser and shows "Try again"; "Try again" repeats the same pick; "Cancel" appears only with `onCancel` and calls it without picking.
    - _Requirements: 18.3, 10.7, 10.8_
  - [x] 21.5 Write `src/components/StackPicker.test.tsx`
    - No picker control for one stack; a working picker for two or more calling `onPick` with the id; disabled when `disabled` is true.
    - _Requirements: 18.4, 11.1, 11.2_
  - [x] 21.6 Write `src/App.starter.test.tsx`
    - Use `fake-indexeddb/auto`. With a failing `saveStack` mock, picking a starter shows the save error, stays on the chooser and `listStacks` stays empty. Picking the farm stall with samples saves one Stack holding the farm sample Items and none of the Provisions ones. First run shows the Starter_Chooser and creates nothing. Unreadable data also shows the chooser and saves nothing.
    - _Requirements: 9.9, 9.12, 10.1, 10.2, 10.5, 10.7_
  - [x] 21.7 Write `src/App.picker.test.tsx`
    - With two saved Stacks: edit the open one, switch at once, switch back, and the edit is still there; the picker is disabled while a save is in flight; a failing `loadStack` shows the error and keeps the current Stack open; the last-opened Stack opens on start.
    - _Requirements: 11.3 to 11.5, 11.7_
  - [x] 21.8 Write `src/App.tabs.test.tsx`
    - Tabs show card titles in Stack order; a Stack with no `hidden` flags shows the default tabs; hiding the selected card in Builder mode and returning to Play mode shows the first visible card, and tab, panel id and view agree; a renamed card shows its new tab label.
    - _Requirements: 6.1 to 6.7, 7.6, 18.5_
  - [x] 21.9 Write `src/App.hiddenSales.test.tsx`
    - With the Sales log card hidden, "Record a sale" from the Stock view still succeeds and the Sale is saved on the hidden Sales log card. Daily summary figures are the same before and after hiding a card.
    - _Requirements: 14.3, 14.4, 18.5_

- [x] 22. Checkpoint - Ensure all tests pass
  - Run `npx vitest run` and `npx tsc --noEmit`. Ask the user if questions arise.

- [ ] 23. Final check
  - [x] 23.1 Run `npx vitest run` and `npx tsc --noEmit`. Fix any failure.
    - Existing tests must pass with no edits, apart from the offset change in task 1.2.
    - _Requirements: 13.10_
  - [x] 23.2 Run the production build (`npm run build`).
    - _Requirements: 12.9_
  - [-] 23.3 Do a manual check in the browser and write down the result
    - First run shows the Starter_Chooser and creates nothing until a pick. Both starters open in Play mode. Sample items match the starter. Builder mode: rename the shop and a card, move cards up and down, hide and show, focus stays put, the last visible card cannot be hidden. Play mode tabs follow the changes. Stack_Picker appears only with two or more stacks. Old saved stacks still open. No sideways scroll and 44px tap areas at 360px, light and midnight themes. Escape closes dialogs and returns focus.
    - _Requirements: 5.6, 6.1 to 6.7, 7.1 to 7.7, 8.1 to 8.11, 10.1 to 10.9, 11.1 to 11.9, 12.1 to 12.9, 16.1 to 16.3_
  - [~] 23.4 Update `KIRO_NOTES.md`
    - Add this spec to the spec count. Add Properties 1 to 16, any bugs they found, the new unit and component test groups, the manual check items from 23.3, and the full-suite report from task 19.1.
    - _Requirements: 13.1 to 13.14, 18.1 to 18.5_

## Notes

- Each property test is a separate sub-task and runs at least 100 cases. Tasks 2.3 to 5.3 and 7.4 all write `src/domain/cards.property.test.ts`, so each runs in its own wave.
- Existing tests are not edited. New cases go in new files (`isStack.hidden.test.ts`, `starterStack.farm.test.ts`, `stackStore.hidden.property.test.ts`, the `App.*.test.tsx` files). The only edit to an existing test is the `+ 2` to `+ 8` offset in `validate.test.ts`.
- Tasks 18.1, 20.1, 20.2 and 20.3 all edit `src/App.tsx`, so each runs in its own wave. Task 19.1 reports failures and edits nothing.
- Component tests use a per-file `// @vitest-environment jsdom` line and an explicit `import "../test/setup";` (adjust the relative path).
- No new packages are needed.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["2.3", "3.2", "4.1"] },
    { "id": 4, "tasks": ["2.4", "4.2"] },
    { "id": 5, "tasks": ["3.3", "4.3"] },
    { "id": 6, "tasks": ["3.4"] },
    { "id": 7, "tasks": ["3.5"] },
    { "id": 8, "tasks": ["4.4"] },
    { "id": 9, "tasks": ["4.5"] },
    { "id": 10, "tasks": ["4.6"] },
    { "id": 11, "tasks": ["4.7"] },
    { "id": 12, "tasks": ["5.1"] },
    { "id": 13, "tasks": ["5.2"] },
    { "id": 14, "tasks": ["5.3"] },
    { "id": 15, "tasks": ["6"] },
    { "id": 16, "tasks": ["7.1", "8.1", "8.3", "9.1"] },
    { "id": 17, "tasks": ["7.2", "8.2", "8.4", "9.2"] },
    { "id": 18, "tasks": ["7.3"] },
    { "id": 19, "tasks": ["7.4", "7.5"] },
    { "id": 20, "tasks": ["10"] },
    { "id": 21, "tasks": ["11.1", "12.1", "13.1", "14.1", "15.1", "16.1"] },
    { "id": 22, "tasks": ["13.2"] },
    { "id": 23, "tasks": ["13.3"] },
    { "id": 24, "tasks": ["13.4"] },
    { "id": 25, "tasks": ["17"] },
    { "id": 26, "tasks": ["18.1"] },
    { "id": 27, "tasks": ["19.1"] },
    { "id": 28, "tasks": ["20.1"] },
    { "id": 29, "tasks": ["20.2"] },
    { "id": 30, "tasks": ["20.3"] },
    { "id": 31, "tasks": ["21.1", "21.2", "21.3", "21.4", "21.5"] },
    { "id": 32, "tasks": ["21.6", "21.7", "21.8", "21.9"] },
    { "id": 33, "tasks": ["22"] },
    { "id": 34, "tasks": ["23.1"] },
    { "id": 35, "tasks": ["23.2"] },
    { "id": 36, "tasks": ["23.3"] },
    { "id": 37, "tasks": ["23.4"] }
  ]
}
```
