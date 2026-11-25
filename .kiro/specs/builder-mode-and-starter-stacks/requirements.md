# Requirements Document

## Introduction

**Feature:** Builder mode and starter stacks.

This spec lets the owner shape their own stack without code. In Builder mode the owner can rename the shop, rename each card, move cards up and down, and hide or show cards. Play mode stays as it is today. It also adds a second starter stack for a farm produce stall, a "Choose a starter" screen, and a simple stack picker so the owner can switch between saved stacks.

It adds four pure domain functions (`renameStack`, `renameCard`, `moveCard`, `setCardHidden`), one optional `hidden` flag on cards, and one pure starter function (`buildFarmStallStack`) next to `buildStarterStack`. Stacks saved before this spec have no `hidden` flag and must still load. The schema version stays at 1.

It builds on `ghoststack-foundation`, `app-shell-stock-card`, `sales-and-daily-summary` and `debts-card-ui`, and follows `product.md`, `tech.md`, `design-retro.md`, `plain-language.md` and `money-rules.md`. Existing behaviour does not change, except for two deliberate changes in the App_Shell: the Tab_Bar reads card order, titles and hidden flags from the Stack, and a first run with an empty database shows the Starter_Chooser instead of silently creating the Provisions shop. All existing tests keep passing without edits. Two existing facts shape the design phase: the App_Shell today picks tabs by card type with fixed labels, and `ERROR_CODES` lists every error code, so new codes must be additive.

**Out of scope:** adding cards, deleting cards, deleting stacks, drag and drop, PWA setup, export and import, button scripting, changing money, stock, sales or debt behaviour.

## Glossary

- **Stack:** one shop's set of cards and their data. Has an `id`, a `name`, a `currency` and an ordered list of cards.
- **Card:** one entry in a Stack's card list: a Stock, Sales log, Debts or Daily summary card. Has an `id`, a `type` and a `title`.
- **Card order:** the order of the cards in the Stack's `cards` list.
- **Hidden card:** a Card whose `hidden` flag is `true`. **Visible card:** any other Card, including a Card with no `hidden` flag.
- **Records:** every Item, Sale and Debt held by the cards of a Stack.
- **Name:** a shop name or a card title. A valid Name has between 1 and 40 characters after trimming spaces at both ends. Length is the JavaScript string length of the trimmed text.
- **Domain function:** a pure function in `src/domain/`. No React, no storage, no clock, no id making.
- **Result:** the return value of a domain function that can fail. It holds either the new data or an error with a plain-language message.
- **Builder_Function:** any of `renameStack`, `renameCard`, `moveCard` and `setCardHidden`.
- **Unchanged_Stack:** a Stack that is deep-equal to the Stack that was passed in.
- **Stack_Checker:** the existing `isStack` function in `src/storage/isStack.ts`.
- **Starter_Function:** `buildStarterStack` or `buildFarmStallStack`.
- **Starter_Ids:** the object of caller-made ids passed to a Starter_Function (the existing `StarterStackIds`).
- **Tab_Bar:** the existing React component that shows one tab per visible card.
- **`visibleCards`:** the pure Domain function that takes a Stack and returns its visible cards in Card order.
- **Sample items:** a small fixed list of example Items the owner can add to a new Stack, clearly marked as sample data.
- **App_Shell:** the React component in `src/App.tsx` that loads the Stack, saves changes, shows the Tab_Bar and shows the selected card's view.
- **Play mode:** the everyday view of the App_Shell, as it works today.
- **Builder mode:** the view where the owner changes the shape of the Stack.
- **Mode_Switch:** the control that moves between Play mode and Builder mode.
- **Builder_Panel:** the React screen shown in Builder mode. It lists every card, hidden or not, with its controls.
- **Starter_Chooser:** the "Choose a starter" screen where the owner picks "Provisions shop" or "Farm produce stall".
- **Stack_Picker:** the control that lists saved stacks by name and lets the owner switch between them.
- **Dialog:** any pop-up box opened by a control, such as a rename box or a confirmation.
- **Opener:** the control that opened a Dialog.
- **Domain:** the set of pure Domain functions in `src/domain/`.
- **Stacks module:** the code in `src/stacks/` that holds the Starter_Functions.
- **Storage layer:** the code in `src/storage/` that saves and loads Stacks with IndexedDB, including `saveStack`, `loadStack` and `listStacks`.
- **Theme variables:** the CSS variables in `src/components/theme.css` that hold all colours, fonts and spacing.

## Requirements

### Requirement 1: Rename the shop and rename a card

**User Story:** As a shop owner, I want to give my shop and my cards my own names, so that the tool uses words I know.

#### Acceptance Criteria

1. THE domain SHALL provide a pure `renameStack` function that takes a Stack and a new name and returns a Result holding a new Stack.
2. THE domain SHALL provide a pure `renameCard` function that takes a Stack, a card id and a new title and returns a Result holding a new Stack.
3. WHEN the new name is valid, THE `renameStack` function SHALL return a Stack whose `name` is the trimmed new name and whose other fields are equal to the input Stack.
4. WHEN the card id matches a Card and the new title is valid, THE `renameCard` function SHALL return a Stack in which only that Card's `title` is changed, to the trimmed new title.
5. IF the new name or title is blank after trimming, THEN THE Builder_Function SHALL return an error Result with a plain-language message that tells the owner to type a name.
6. IF the new name or title is longer than 40 characters after trimming, THEN THE Builder_Function SHALL return an error Result with a plain-language message that tells the owner the name is too long and that 40 characters is the most allowed.
7. IF the new name or title is not a string, THEN THE Builder_Function SHALL return the same error Result as for a blank name.
8. IF the card id matches no Card, THEN THE `renameCard` function SHALL return the existing `CARD_NOT_FOUND` error Result.
9. WHEN a valid name is applied twice in a row, THE Builder_Function SHALL return a Stack deep-equal to the one returned after the first application.

### Requirement 2: Move a card up or down

**User Story:** As a shop owner, I want to move a card up or down, so that my tabs appear in the order I use them.

#### Acceptance Criteria

1. THE domain SHALL provide a pure `moveCard` function that takes a Stack, a card id and a direction, "up" or "down", and returns a Result holding a new Stack.
2. WHEN the card id matches a Card that has a neighbour in the chosen direction, THE `moveCard` function SHALL return a Stack in which that Card and its neighbour have swapped places in the Card order and every other Card keeps its place.
3. THE `moveCard` function SHALL count position over all cards in the Stack, hidden cards included.
4. IF the Card is already first and the direction is "up", or already last and the direction is "down", THEN THE `moveCard` function SHALL return an error Result with a plain-language message that says the card cannot move further that way.
5. IF the card id matches no Card, THEN THE `moveCard` function SHALL return the existing `CARD_NOT_FOUND` error Result.
6. IF the direction is neither "up" nor "down", THEN THE `moveCard` function SHALL return an error Result with a plain-language message that tells the owner to use the up or down button.
7. WHEN a Card is moved up and the same Card is then moved down, THE `moveCard` function SHALL produce a Stack deep-equal to the original Stack.
8. WHEN a Card is moved down and the same Card is then moved up, THE `moveCard` function SHALL produce a Stack deep-equal to the original Stack.

### Requirement 3: Hide or show a card

**User Story:** As a shop owner, I want to hide a card I do not use, so that my tabs stay simple.

#### Acceptance Criteria

1. THE domain SHALL provide a pure `setCardHidden` function that takes a Stack, a card id and a boolean `hidden` and returns a Result holding a new Stack.
2. WHEN `hidden` is `true` and at least one other Card is visible, THE `setCardHidden` function SHALL return a Stack in which that Card has `hidden` set to `true` and every other Card is equal to its input.
3. WHEN `hidden` is `false`, THE `setCardHidden` function SHALL return a Stack in which that Card has no `hidden` flag, and every other Card is equal to its input.
4. IF hiding the Card would leave the Stack with no visible card, THEN THE `setCardHidden` function SHALL return an error Result with a plain-language message that says at least one card must stay showing.
5. IF the card id matches no Card, THEN THE `setCardHidden` function SHALL return the existing `CARD_NOT_FOUND` error Result.
6. IF `hidden` is not a boolean, THEN THE `setCardHidden` function SHALL return an error Result with a plain-language message that tells the owner to use the hide or show button.
7. WHEN a Card is hidden and then shown again, THE `setCardHidden` function SHALL produce a Stack deep-equal to the original Stack, provided the Card had no `hidden` flag at the start.
8. WHEN `hidden` equals the Card's current state and the request is allowed, THE `setCardHidden` function SHALL return a Stack deep-equal to the input.

### Requirement 4: Builder functions keep data safe

**User Story:** As a shop owner, I want changing names, order and visibility to never touch my money records, so that my numbers stay correct.

#### Acceptance Criteria

1. THE Builder_Function SHALL leave every Item, Sale and Debt in the returned Stack deep-equal to the same record in the input Stack.
2. THE Builder_Function SHALL keep the Stack `id`, the Stack `currency`, every Card `id` and every Card `type` unchanged.
3. THE Builder_Function SHALL keep the number of cards in the Stack unchanged.
4. THE `moveCard` function SHALL return a Stack whose Card ids are a permutation of the input Stack's Card ids.
5. IF a Builder_Function returns an error Result, THEN THE Builder_Function SHALL leave the input Stack as an Unchanged_Stack.
6. THE Builder_Function SHALL return a Stack with at least one visible card, WHEN the input Stack has at least one visible card.
7. WHEN the input Stack and its cards are deeply frozen, THE Builder_Function SHALL return a Result without throwing and without changing the input.
8. THE Builder_Function SHALL NOT read the clock, make ids or call storage.
9. THE Builder_Function SHALL NOT return `NaN` or any non-finite number in any field it writes.

### Requirement 5: Hidden flag and backward-compatible storage

**User Story:** As a shop owner, I want the shop I saved last week to open normally after this update, so that I do not lose any data.

#### Acceptance Criteria

1. THE `Card` type SHALL allow an optional `hidden` flag of type boolean on every card type.
2. WHEN a stored Stack has no `hidden` flag on any card, THE Stack_Checker SHALL accept it, with the same result as before this spec.
3. WHEN a stored Stack has `hidden` set to `true` or `false` on a card, THE Stack_Checker SHALL accept it.
4. IF a stored card has a `hidden` value that is neither absent nor a boolean, THEN THE Stack_Checker SHALL reject the Stack.
5. THE Stack SHALL keep `schemaVersion` at 1, and THE Stack_Checker SHALL continue to reject any other `schemaVersion`.
6. WHEN a Stack saved before this spec is loaded, THE App_Shell SHALL treat every card as visible and show the cards in the saved order with the saved titles.
7. WHEN a Stack passes through `saveStack` and `loadStack`, THE storage layer SHALL return a Stack deep-equal to the saved Stack, including any `hidden` flags.
8. THE Stack_Checker SHALL stay free of domain imports, as it is today.

### Requirement 6: Tab bar follows the stack

**User Story:** As a shop owner, I want my tabs to match the order and names I chose, so that the app feels like mine.

#### Acceptance Criteria

1. THE App_Shell SHALL give the Tab_Bar one tab for each visible card, in Card order.
2. THE App_Shell SHALL use each Card's own `title` as the label of its tab.
3. THE App_Shell SHALL NOT show a tab for a hidden card.
4. THE App_Shell SHALL track the selected tab by card id.
5. IF the selected card becomes hidden, THEN THE App_Shell SHALL select the first visible card in Card order.
6. WHEN a Stack with no `hidden` flags and the default Card order is shown, THE Tab_Bar SHALL show the same tabs in the same order as it does today, using the card titles stored in the Stack.
7. WHEN the owner changes a card title or Card order in Builder mode, THE Tab_Bar SHALL show the change when the owner returns to Play mode.
8. THE Tab_Bar SHALL keep its existing keyboard behaviour: Arrow keys, Home and End move between tabs.

### Requirement 7: Builder and Play mode switch

**User Story:** As a shop owner, I want one clear switch between building and everyday use, so that I never change my shop by accident.

#### Acceptance Criteria

1. THE App_Shell SHALL show a Mode_Switch with two choices, labelled "Play" and "Builder", each with an icon and a text label.
2. THE Mode_Switch SHALL show which mode is active with text or an icon, and SHALL NOT rely on colour alone.
3. WHEN the App_Shell first shows a loaded Stack, THE App_Shell SHALL be in Play mode.
4. WHILE the App_Shell is in Play mode, THE App_Shell SHALL show the Tab_Bar and the selected card's view exactly as it does today, and SHALL NOT show any builder control.
5. WHILE the App_Shell is in Builder mode, THE App_Shell SHALL show the Builder_Panel in place of the card views.
6. WHEN the owner switches from Builder mode to Play mode, THE App_Shell SHALL show the card the owner had selected, or the first visible card if that card is now hidden.
7. THE App_Shell SHALL use the words "Builder" and "Play" in the Mode_Switch, and SHALL keep any spooky wording light and optional.

### Requirement 8: Builder panel controls

**User Story:** As a shop owner, I want simple buttons to rename, reorder and hide cards, so that I can set up my shop without drag and drop.

#### Acceptance Criteria

1. WHILE the App_Shell is in Builder mode, THE Builder_Panel SHALL show the shop name with a "Rename shop" control.
2. WHILE the App_Shell is in Builder mode, THE Builder_Panel SHALL list every card, hidden cards included, in Card order, each with its title and a plain-text label "Showing" or "Hidden" together with an icon.
3. THE Builder_Panel SHALL give each card a "Rename" control, "Move up" and "Move down" buttons, and a "Hide" or "Show" button.
4. THE Builder_Panel SHALL name the card in the accessible label of each card control, for example "Move Stock up".
5. WHEN the Card is first in the list, THE Builder_Panel SHALL mark its "Move up" button as disabled, and WHEN the Card is last, THE Builder_Panel SHALL mark its "Move down" button as disabled.
6. WHEN the owner activates a rename, move or hide control, THE Builder_Panel SHALL call the matching Builder_Function and, on success, pass the new Stack to the App_Shell's existing save path.
7. IF a Builder_Function returns an error Result, THEN THE Builder_Panel SHALL show the error's message next to the control and SHALL leave the Stack unchanged.
8. WHEN the visible card count is 1, THE Builder_Panel SHALL mark the "Hide" button of the only visible card as disabled and SHALL show a short note that one card must stay showing.
9. WHEN the owner confirms a rename, THE Builder_Panel SHALL show the new name immediately and SHALL save it to storage.
10. THE Builder_Panel SHALL NOT offer to add or delete a card, and SHALL NOT offer drag and drop.
11. THE Builder_Panel SHALL keep each card's records unchanged, and SHALL NOT show or edit any Item, Sale or Debt.

### Requirement 9: Farm produce stall starter

**User Story:** As a farm produce seller, I want a starter stack that uses my words, so that I can start without renaming everything.

#### Acceptance Criteria

1. THE stacks module SHALL provide a pure `buildFarmStallStack` function that takes Starter_Ids and returns a Stack, alongside `buildStarterStack`.
2. THE `buildFarmStallStack` function SHALL return a Stack named "Farm produce stall" with the same default currency constant that `buildStarterStack` uses (not a second copy of the value) and `schemaVersion` 1.
3. THE `buildFarmStallStack` function SHALL return exactly four cards, one of each type, in the order stock, sales-log, debts, daily-summary, with the ids taken from the Starter_Ids.
4. THE `buildFarmStallStack` function SHALL title the cards "Produce in stock", "Sales book", "Money owed to you" and "Today's totals".
5. THE `buildFarmStallStack` function SHALL return a Stack with no Items, Sales or Debts and with no `hidden` flag.
6. THE Starter_Function SHALL return a Stack that the Stack_Checker accepts, for any Starter_Ids made of non-empty strings.
7. THE Starter_Function SHALL return the same Stack for the same Starter_Ids, and SHALL NOT read the clock, make ids or call storage.
8. THE existing `buildStarterStack` function SHALL keep returning the same Stack it returns today.
9. WHERE the owner chooses "Add sample items", THE App_Shell SHALL add a small fixed list of sample Items to the new Stack's Stock card, using the existing `addItem` function.
10. THE sample Items SHALL be clearly sample data, for example by a name or note that says "Sample", so the owner can tell them from real items.
11. THE App_Shell (the UI layer) SHALL make the ids for the sample Items, and THE Starter_Function SHALL NOT make them.
12. THE App_Shell SHALL add every sample Item to the new Stack in memory and SHALL save the finished Stack once. IF `addItem` fails for a sample Item or the save fails, THEN THE App_Shell SHALL show a plain-language error, SHALL stay on the Starter_Chooser, and SHALL save and open no stack.

### Requirement 10: Choose a starter

**User Story:** As a new owner, I want to pick the kind of shop I run, so that I get a useful stack in one tap.

#### Acceptance Criteria

1. WHEN `listStacks` returns an empty list, THE App_Shell SHALL show the Starter_Chooser and SHALL NOT create a stack on its own. THE App_Shell SHALL show the Starter_Chooser only in that case.
2. IF saved data cannot be read, THEN `listStacks` SHALL return an empty list, THE App_Shell SHALL show the Starter_Chooser as it does on a first run, and THE App_Shell SHALL NOT create or save any stack until the owner picks a starter.
3. WHILE the App_Shell is in Builder mode, THE Builder_Panel SHALL offer a "Choose a starter" control that opens the Starter_Chooser.
4. THE Starter_Chooser SHALL offer exactly two choices, "Provisions shop" and "Farm produce stall", each with a short plain-language description.
5. WHEN the owner picks a choice, THE App_Shell SHALL make fresh ids with `crypto.randomUUID`, build the matching Stack with the Starter_Function, save it, open it in Play mode and select the first visible card.
6. WHEN the owner picks a choice, THE App_Shell SHALL keep every previously saved Stack in storage unchanged.
7. IF saving the new Stack fails, THEN THE App_Shell SHALL show the existing plain-language save error, SHALL stay on the Starter_Chooser, and SHALL offer a "Try again" button.
8. WHILE the Starter_Chooser was opened from Builder mode, THE Starter_Chooser SHALL offer a "Cancel" button that returns to the Builder_Panel without creating a stack.
9. THE Starter_Chooser SHALL show one main action per choice and SHALL be usable on a screen 360px wide without sideways scrolling.

### Requirement 11: Stack picker

**User Story:** As an owner with more than one shop, I want to switch between my saved stacks, so that I can use the right one.

#### Acceptance Criteria

1. WHEN two or more stacks are saved, THE App_Shell SHALL show the Stack_Picker listing each saved Stack by name.
2. WHEN only one stack is saved, THE App_Shell SHALL still show the current stack name and SHALL NOT show an empty or single-choice picker.
3. WHEN the owner picks a stack in the Stack_Picker, THE App_Shell SHALL load it with `loadStack`, show it in Play mode and select its first visible card.
4. THE App_Shell SHALL either finish every pending save before it opens another stack, or key every save by Stack id, so that a save never writes to the wrong stack.
5. IF `loadStack` returns an error, THEN THE App_Shell SHALL show that error's message and SHALL keep the current stack open.
6. WHEN the owner renames the current stack, THE Stack_Picker SHALL show the new name.
7. WHEN the App_Shell starts and at least one stack is saved, THE App_Shell SHALL open the stack the owner opened last, or the first saved stack if no earlier choice is known or the earlier stack no longer loads.
8. THE App_Shell SHALL store the id of the last-opened stack in `localStorage`, with every read and write wrapped in try/catch, and SHALL NOT store it in the Stack or in IndexedDB.
9. THE Stack_Picker SHALL NOT offer to delete a stack.

### Requirement 12: Accessibility and plain wording

**User Story:** As an owner on a small phone, I want big buttons, clear focus and simple words, so that I can use the tool easily.

#### Acceptance Criteria

1. THE Mode_Switch, Builder_Panel controls, Starter_Chooser choices, Stack_Picker and every Dialog button SHALL have a tap target at least 44px high and 44px wide.
2. WHEN a control has keyboard focus, THE control SHALL show a visible focus outline.
3. THE new screens SHALL use text or an icon together with colour to show any state, such as "Hidden" or the active mode.
4. THE new screens SHALL use simple English labels and short sentences, and SHALL use the owner's words such as "Show" and "Hide", not "toggle visibility".
5. THE error messages for the Builder_Functions SHALL say what went wrong and what to do next.
6. WHEN a Dialog opens, THE App_Shell SHALL move focus into the Dialog.
7. WHEN a Dialog closes, THE App_Shell SHALL return focus to the Opener.
8. THE new screens SHALL take all colours, fonts and spacing from the Theme variables and SHALL reuse the shared Button, Field and Card components.
9. THE new screens SHALL work on a screen 360px wide without sideways scrolling, in both the light and the midnight theme.

### Requirement 13: Property-based tests

**User Story:** As a maintainer, I want property-based tests for the builder rules, so that the numbers and the stack stay correct whatever the owner does.

#### Acceptance Criteria

1. THE test suite SHALL include a fast-check property that, for any valid Stack and any Builder_Function call, every Item, Sale and Debt in the result is deep-equal to the input's, whether the call succeeds or fails.
2. THE test suite SHALL include a property that, for any valid Stack and any successful Builder_Function call, the Stack id, the Card ids, the Card types and the number of cards do not change.
3. THE test suite SHALL include a property that, for any valid Stack and any card id, `moveCard` returns a permutation of the Card ids, and moving up then down returns a Stack deep-equal to the original.
4. THE test suite SHALL include a property that, for any valid Stack and any call that returns an error, the input is an Unchanged_Stack.
5. THE test suite SHALL include a property that, for any valid Stack with at least one visible card and any sequence of Builder_Function calls, at least one card stays visible after every step.
6. THE test suite SHALL include a property that, for any deeply frozen valid Stack, no Builder_Function throws or changes the input.
7. THE test suite SHALL include a property that, for any Starter_Ids made of non-empty strings, each Starter_Function returns a Stack the Stack_Checker accepts.
8. THE test suite SHALL include a property that, for any valid Stack with the `hidden` flag removed from every card, the Stack_Checker accepts it.
9. THE test suite SHALL include a property that, for any Name made of whitespace only or longer than 40 characters after trimming, `renameStack` and `renameCard` return an error, and for any other string they return a Stack with the trimmed Name.
10. THE test suite SHALL run each property for at least 100 runs.
11. THE test suite SHALL include a property that, for any valid Stack and any successful Builder_Function call, the result is accepted by the Stack_Checker.
12. THE test suite SHALL include a property that, for any valid Stack and any valid Name, applying `renameStack` or `renameCard` twice with the same Name gives the same Stack as applying it once.
13. THE test suite SHALL include a property that, for any valid Stack and any Card that has no `hidden` flag, hiding it and then showing it again gives a Stack deep-equal to the original, whenever the hide is allowed.
14. THE test suite SHALL include a property that, for any valid Stack, `setCardHidden` with a `hidden` value equal to the Card's current state returns a Stack deep-equal to the input.

### Requirement 14: Hiding a card changes only what is displayed

**User Story:** As a shop owner, I want to hide a card without losing its features or changing my totals, so that hiding is always safe.

#### Acceptance Criteria

1. THE hide action SHALL change only which tabs the Tab_Bar shows, and SHALL NOT change any Item, Sale or Debt.
2. THE Stock, Sales log, Debts and Daily summary logic and totals SHALL keep finding their cards by card type, whether the Card is hidden or not.
3. WHEN the Sales log card is hidden, THE "Record a sale" action SHALL still work, and SHALL save the Sale to the Sales log card.
4. WHEN a card is hidden or shown, THE Daily summary figures SHALL stay the same as before the change.

### Requirement 15: Focus in the Builder panel

**User Story:** As a keyboard and screen reader user, I want focus to stay where I was working after a change, so that I do not lose my place.

#### Acceptance Criteria

1. WHEN the owner activates "Move up" or "Move down" for a Card, THE Builder_Panel SHALL keep focus on the same Card's control that was activated.
2. WHEN the owner activates "Hide" or "Show" for a Card, THE Builder_Panel SHALL keep focus on the same Card's control.
3. IF that control is now disabled or has been replaced, THEN THE Builder_Panel SHALL move focus to the opposite control of the same Card: "Move down" for "Move up", "Move up" for "Move down", "Show" for "Hide" and "Hide" for "Show".

### Requirement 16: Tab labels fit a small screen

**User Story:** As an owner on a 360px phone, I want long card titles to fit, so that the page never scrolls sideways.

#### Acceptance Criteria

1. THE Tab_Bar SHALL NOT cause page-level sideways scroll on a screen 360px wide. The bar SHALL either wrap onto more lines or scroll inside itself.
2. WHEN a tab title is too long to fit, THE Tab_Bar SHALL truncate it visually.
3. THE Tab_Bar SHALL keep the full title available to screen readers, for example in the tab's accessible name.

### Requirement 17: Visible cards function

**User Story:** As a maintainer, I want one tested place that decides which cards are visible, so that the tabs and the rules never disagree.

#### Acceptance Criteria

1. THE domain SHALL provide a pure `visibleCards` function that takes a Stack and returns its visible cards.
2. THE `visibleCards` function SHALL return only visible cards, in Card order, and SHALL NOT change the Stack.
3. WHEN the input Stack has at least one visible card, THE `visibleCards` function SHALL return a non-empty list.
4. THE Tab_Bar input SHALL come from `visibleCards`.
5. THE test suite SHALL include a fast-check property that, for any valid Stack, `visibleCards` returns visible cards only, keeps Card order, and returns a non-empty list when the input has a visible card.

### Requirement 18: Component tests

**User Story:** As a maintainer, I want component tests for the new screens, so that the owner's flows keep working.

#### Acceptance Criteria

1. THE test suite SHALL include testing-library component tests for the Mode_Switch.
2. THE test suite SHALL include component tests for the Builder_Panel that cover error placement, disabled buttons and focus after a move.
3. THE test suite SHALL include component tests for the Starter_Chooser that cover a save failure and the "Cancel" button.
4. THE test suite SHALL include component tests for the Stack_Picker.
5. THE test suite SHALL include component tests for hidden-Sales-log behaviour, including that "Record a sale" still works.

### Requirement 19: Escape closes a dialog

**User Story:** As a keyboard user, I want to press Escape to close any dialog, so that I can back out easily.

#### Acceptance Criteria

1. WHEN a Dialog is open and the owner presses Escape, THE App_Shell SHALL close the Dialog.
2. WHEN a Dialog closes after Escape, THE App_Shell SHALL return focus to the Opener.