# Requirements Document

## Introduction

**Feature:** Ghost companion. The pixel ghost becomes a small living mascot. It reacts to what the shop owner does (a sale, a debt, an error, an empty screen, Midnight mode) and shows one short speech bubble that says what to tap next.

This is a presentation-layer spec. It adds a small state machine, a React context, a few pixel frames, some CSS and a tip list. It changes no money logic and no stored data.

Rules for the whole spec:

- No file in `src/domain/`, `src/domain-ui/` or `src/storage/` changes. Nothing in those folders imports anything from `src/components/ghost/`.
- No new npm package. No image file. No animation library.
- New files live in `src/components/ghost/`. Edits to existing files are limited to wiring (a `react()` call, one hook call, one element) and to the Theme file and the palette pair list.
- Existing tests are not edited and must still pass. Screens must work with no provider present (every existing test renders without one).
- Wording follows `plain-language.md`. Styling follows `design-retro.md`. Colours come from Theme variables only.

It builds on `design-polish` (the ghost grid, `useReducedMotion`, the palette pair test). It follows `product.md`, `tech.md`, `design-retro.md`, `plain-language.md` and `money-rules.md`.

**Out of scope:** sound, new card types, new button actions, saving the ghost's state, a settings screen to switch the ghost off, changes to the existing `Ghost` component and `GhostGuide` wording, any change to domain logic or storage.

## Glossary

- **Ghost_Machine:** the pure function `next(state, event)` in `src/components/ghost/ghostMachine.ts`.
- **Ghost_State:** the value the Ghost_Machine takes and returns: `{ mood, nightcap, sleepy }`.
- **Mood:** one of `idle`, `wave`, `cheer`, `think`, `spin`, `sorry`, `point`, `sleep`, `giggle`.
- **Resting_Mood:** `idle` or `sleep`. Every other Mood is a Busy_Mood.
- **Busy_Mood:** a Mood that plays for a short time and then ends.
- **Ghost_Event:** one of `appOpened`, `saleRecorded`, `debtAdded`, `debtPaid`, `errorShown`, `emptyScreen`, `midnightToggled`, `idleTimeout`, `poked`, `animationDone`.
- **Ghost_Provider:** the React context provider in `GhostProvider.tsx`. It owns the timers and calls the Ghost_Machine.
- **react:** the function `react(event)` that screens get from `useGhost()`.
- **Mascot:** the component that draws the ghost from frames.
- **Frame:** one 16-column grid of cells for one pose, built from the base ghost grid plus a face variant and arm variants.
- **Companion_Strip:** the in-page block that holds the Mascot, the Poke_Button and the Speech_Bubble.
- **Poke_Button:** the real `<button>` with the accessible name "Poke the ghost" that wraps the Mascot.
- **Speech_Bubble:** the one-line tip next to the Mascot.
- **Tip_List:** the lines in `ghostTips.ts`.
- **Reduced_Motion:** the browser setting `prefers-reduced-motion: reduce`, read through `useReducedMotion`.
- **Midnight_Mode:** the dark theme, set with `data-theme="midnight"` on the root element.
- **Theme_File:** `src/components/theme.css`.
- **PAIR_LIST:** the colour pair list in `src/theme/palettePairs.ts` that the palette contrast test checks in both themes.

## Requirements

### Requirement 1: Mood type and nightcap flag

**User Story:** As a developer, I want one clear list of ghost moods, so that every part of the app means the same thing by "cheer" or "sorry".

#### Acceptance Criteria

1. THE module `src/components/ghost/ghostTypes.ts` SHALL export a `GhostMood` type with exactly these values: `idle`, `wave`, `cheer`, `think`, `spin`, `sorry`, `point`, `sleep`, `giggle`.
2. THE module SHALL export a constant list `GHOST_MOODS` that holds those same nine values, and a function `isGhostMood(value)` that returns true only for them.
3. THE module SHALL export a `GhostEvent` type for the ten events listed in the Glossary. WHEN the event is `midnightToggled`, THE event SHALL carry `on: boolean`.
4. THE `GhostState` type SHALL hold `mood`, `nightcap` and `sleepy`. THE `nightcap` flag SHALL be `true` only while Midnight_Mode is on.
5. THE module SHALL export `isRestingMood(mood)`, true for `idle` and `sleep` only.

### Requirement 2: Pure state machine

**User Story:** As a developer, I want the ghost's behaviour to be a plain function, so that I can test every path without a screen.

#### Acceptance Criteria

1. THE Ghost_Machine SHALL be a function `next(state, event)` that returns a new Ghost_State and does not change its input.
2. THE Ghost_Machine SHALL NOT read the clock, SHALL NOT use `Math.random`, and SHALL NOT import React, storage or the domain.
3. WHEN the event is `appOpened`, THE Ghost_Machine SHALL return mood `wave`.
4. WHEN the event is `saleRecorded` or `debtPaid`, THE Ghost_Machine SHALL return mood `cheer`.
5. WHEN the event is `debtAdded`, THE Ghost_Machine SHALL return mood `think`.
6. WHEN the event is `errorShown`, THE Ghost_Machine SHALL return mood `sorry`.
7. WHEN the event is `emptyScreen`, THE Ghost_Machine SHALL return mood `point`.
8. WHEN the event is `midnightToggled`, THE Ghost_Machine SHALL return mood `spin` and set `nightcap` to the value of `on`.
9. WHEN the event is `poked`, THE Ghost_Machine SHALL return mood `giggle`, whatever the current mood is.
10. WHEN the event is any of those eight (not `idleTimeout` or `animationDone`), THE Ghost_Machine SHALL also set `sleepy` to `false`.
11. THE Ghost_Machine SHALL keep `nightcap` unchanged for every event except `midnightToggled`.
12. THE Ghost_Machine SHALL NOT hold tips, texts or timer lengths. Those are passed in by the Ghost_Provider.

### Requirement 3: The ghost never gets stuck

**User Story:** As a shop owner, I do not want the ghost to freeze in a pose.

#### Acceptance Criteria

1. WHEN the event is `animationDone` and the mood is a Busy_Mood, THE Ghost_Machine SHALL return `sleep` if `sleepy` is `true`, and `idle` if it is not. It SHALL set `sleepy` to `false`.
2. WHEN the event is `animationDone` and the mood is `sleep`, THE Ghost_Machine SHALL return `idle`. This is how the ghost wakes up.
3. WHEN the event is `animationDone` and the mood is `idle`, THE Ghost_Machine SHALL return `idle`.
4. WHEN the event is `idleTimeout` and the mood is `idle` or `sleep`, THE Ghost_Machine SHALL return `sleep`.
5. WHEN the event is `idleTimeout` and the mood is a Busy_Mood, THE Ghost_Machine SHALL keep the mood and set `sleepy` to `true`, so the ghost sleeps when the pose ends.
6. FOR ANY Ghost_State, applying `animationDone` at most twice SHALL give a Resting_Mood.
7. THE `sleepy` flag SHALL be `true` only while the mood is a Busy_Mood.

### Requirement 4: Provider and `react`

**User Story:** As a developer, I want any screen to make the ghost react with one call, so that screens do not need to know about animations.

#### Acceptance Criteria

1. THE module `GhostProvider.tsx` SHALL export `GhostProvider` and a hook `useGhost()` that returns `{ state, bubble, react, dismissBubble }`.
2. THE function `react` SHALL accept a Ghost_Event type name (for example `react("saleRecorded")`) or an event object (for example `react({ type: "midnightToggled", on: true })`).
3. WHEN `useGhost()` is used with no Ghost_Provider above it, THE hook SHALL return a harmless version: `react` and `dismissBubble` do nothing, and nothing throws.
4. WHEN the Ghost_Provider mounts, THE Ghost_Provider SHALL send `appOpened` once.
5. WHEN the mood becomes a Busy_Mood, THE Ghost_Provider SHALL start one timer for that Mood's length and send `animationDone` when it ends. THE Ghost_Provider SHALL NOT rely on a CSS `animationend` event, because no such event fires under Reduced_Motion.
6. WHEN the mood changes before the timer ends, THE Ghost_Provider SHALL clear the old timer.
7. WHEN the Ghost_Provider unmounts, THE Ghost_Provider SHALL clear every timer and every document listener it added.
8. THE Ghost_Provider SHALL take its timer lengths (idle time, bubble time, mood lengths) as props with defaults, so tests can pass short ones.
9. NO file in `src/domain/`, `src/domain-ui/` or `src/storage/` SHALL import from `src/components/ghost/`. A test SHALL check this by reading those files.

### Requirement 5: Pixel animation with `steps()`

**User Story:** As a shop owner, I want the ghost to move like a retro game sprite.

#### Acceptance Criteria

1. THE Mascot SHALL draw the ghost as inline SVG `<rect>` cells from the existing `GHOST_GRID` in `ghostGrid.ts`. THE Mascot SHALL use no image, no canvas and no library.
2. THE file `ghostFrames.ts` SHALL build each Frame from the base grid plus a face variant (eyes and mouth) and arm variants. A Frame SHALL change no cell of the body outside the face rows.
3. WHEN a Mood has two Frames, THE Mascot SHALL draw both as separate `<g>` groups and CSS SHALL switch between them with `steps(1, end)` keyframes.
4. WHEN a Mood moves the ghost (hop, shake, spin), THE CSS SHALL use `transform` keyframes with `steps()` timing so the ghost jumps in whole-cell steps, never in smooth slides.
5. EVERY CSS `animation` declaration for the Mascot SHALL sit inside `@media (prefers-reduced-motion: no-preference)`.
6. THE Mascot SHALL read all colour from Theme variables and `currentColor`. It SHALL hard-code none.
7. EVERY Frame SHALL be 16 columns wide. A test SHALL check this for every Mood and both Frames.

### Requirement 6: Reduced motion

**User Story:** As a shop owner who gets dizzy from moving screens, I want the ghost to hold still.

#### Acceptance Criteria

1. WHILE Reduced_Motion is on, THE Mascot SHALL render no animation class and SHALL render only the first Frame of the current Mood.
2. WHILE Reduced_Motion is on, THE Mascot SHALL still show the face and arms of the current Mood, so the mood stays readable as a static picture.
3. WHILE Reduced_Motion is on, THE Speech_Bubble SHALL still appear, be dismissible, and go away on the same timers.
4. WHILE Reduced_Motion is on, THE Ghost_Provider SHALL still send `animationDone` after the Mood's length, so the ghost returns to `idle`.
5. WHEN the setting changes while the app is open, THE Mascot SHALL follow it without a reload.

### Requirement 7: Speech bubble

**User Story:** As a shop owner, I want the ghost to tell me, in a few friendly words, what to tap next.

#### Acceptance Criteria

1. THE Speech_Bubble SHALL show one tip at a time. WHEN a new tip arrives, THE Speech_Bubble SHALL replace the old one.
2. THE tip SHALL be one line of plain English, at most 60 characters. IT SHALL be playful and SHALL name the next step, for example "Made a sale? Tap Record a sale."
3. THE Speech_Bubble SHALL have a dismiss button with a visible label and a target of at least 44px by 44px. WHEN the owner activates it, THE Speech_Bubble SHALL close and focus SHALL move to the Poke_Button.
4. THE Speech_Bubble SHALL close by itself after the bubble time (default 12 seconds), and when the ghost falls asleep.
5. THE Speech_Bubble SHALL NOT use `role="alert"`, `role="status"`, `aria-live` or `aria-atomic`. Screen readers SHALL NOT announce it on their own.
6. WHEN an error is shown, THE normal accessible error message (`role="alert"` in the form or notice) SHALL stay exactly as it is. THE Speech_Bubble tip SHALL only add a calm next step, and SHALL NOT repeat or replace that message.
7. THE Speech_Bubble SHALL follow the retro look: 2px border, surface colour, pixel-style tail. It SHALL never cover a form field or a button the owner needs. It is part of the page flow, not a floating layer.

### Requirement 8: Decorative ghost and Poke_Button

**User Story:** As a screen reader user, I do not want to hear about a drawing. As any user, I want to poke the ghost.

#### Acceptance Criteria

1. THE Mascot `<svg>` SHALL have `aria-hidden="true"` and `focusable="false"`, and SHALL have no `<title>` and no `role`.
2. THE Poke_Button SHALL be a real `<button type="button">` with `aria-label="Poke the ghost"`.
3. THE Poke_Button SHALL be at least 44px by 44px.
4. WHEN the owner activates the Poke_Button (tap, click, Enter or Space), THE Ghost_Provider SHALL send `poked`.
5. THE Poke_Button SHALL show the shared focus outline from the Theme_File.
6. THE Mood SHALL NOT be the only way to learn anything. WHEN the Mood carries meaning (for example `sorry`), THE Speech_Bubble or an existing message SHALL say it in words.

### Requirement 9: Sleep after 60 seconds

**User Story:** As a shop owner, I want the ghost to nap when I am away and wake when I come back.

#### Acceptance Criteria

1. WHEN 60 seconds pass with no interaction, THE Ghost_Provider SHALL send `idleTimeout`. THE length SHALL be a prop with 60000 ms as its default.
2. THE Ghost_Provider SHALL restart the idle timer on every `react()` call and on every `pointerdown` and `keydown` on the document.
3. WHEN the mood is `sleep` and any interaction happens, THE Ghost_Provider SHALL send `animationDone` (which wakes the ghost to `idle`) and restart the idle timer.
4. WHEN the mood is `sleep` and `react()` is called with another event, THE Ghost_Machine SHALL move to that event's Mood.
5. WHILE the mood is `sleep`, THE Mascot SHALL show closed eyes and a small "z".
6. THE idle timer SHALL NOT keep the page busy: THE Ghost_Provider SHALL clear it on unmount.

### Requirement 10: Contrast in both themes

**User Story:** As a shop owner with weak eyesight, I want the ghost and its extras to be easy to see in both themes.

#### Acceptance Criteria

1. THE Theme_File SHALL define every new colour variable in both the `:root` block and the `[data-theme="midnight"]` block.
2. THE only new colour variable SHALL be `--color-ghost-cap` (the nightcap). THE Speech_Bubble, the dismiss button and the Poke_Button SHALL reuse existing variables.
3. THE file `palettePairs.ts` SHALL gain a `ui` pair "nightcap on page" (`--color-ghost-cap` on `--color-bg`) and a `ui` pair "nightcap on card" (`--color-ghost-cap` on `--color-surface`), each checked in both themes.
4. THE existing palette contrast test SHALL pass with the new pairs, including its check that every `--color-*` variable is in a pair.
5. THE existing colour scan test SHALL pass: no hex, `rgb()` or colour name in any new CSS file.

### Requirement 11: Tip list in one file

**User Story:** As a teammate, I want to add a tip by editing one file.

#### Acceptance Criteria

1. THE file `ghostTips.ts` SHALL hold every tip as plain strings, grouped by Ghost_Event type, with at least two tips per group that shows a tip.
2. THE file SHALL export `TIPS`, `BANNED_WORDS` and `pickTip(kind, counter)`. THE function `pickTip` SHALL be pure: the same inputs give the same tip, and a counter that grows by one walks through the group in order and wraps round.
3. THE Ghost_Provider SHALL own the counter. THE Ghost_Machine SHALL NOT see tips.
4. EVERY tip SHALL be at most 60 characters.
5. NO tip SHALL contain a word from `BANNED_WORDS` (whole word, any letter case). THE list SHALL cover jargon such as "inventory", "transaction", "database", "sync", "invalid", "exception", "null", "undefined", "cache", "payload", "receivable" and "ledger".
6. WHEN a tip names a button, THE name SHALL match the button's visible label in the app ("Record a sale", "Record a debt", "Add an item", "Mark as paid").

### Requirement 12: Wiring into screens

**User Story:** As a shop owner, I want the ghost to react in the real places: sales, debts, errors, empty screens and Midnight.

#### Acceptance Criteria

1. WHEN a sale is saved, THE stock card view SHALL call `react("saleRecorded")` once.
2. WHEN a debt is recorded, THE debts card view SHALL call `react("debtAdded")` once. WHEN a debt is marked as paid, it SHALL call `react("debtPaid")` once.
3. WHEN an error message is shown (sale form, debt form, pay confirm, save error, switch error, load error, starter chooser), THE screen SHALL call `react("errorShown")` once for that message, through one shared hook `useGhostError(message)` in `src/components/ghost/`.
4. WHEN an empty-state `GhostGuide` mounts, THE `GhostGuide` SHALL call `react("emptyScreen")` once.
5. WHEN the owner toggles Midnight_Mode, THE app SHALL call `react({ type: "midnightToggled", on })` with the new value. WHEN the app starts in Midnight_Mode, THE Ghost_Provider SHALL start with `nightcap` set to `true`.
6. WHILE `nightcap` is `true`, THE Mascot SHALL draw the nightcap cells in `--color-ghost-cap`.
7. THE Companion_Strip SHALL sit under the app bar in `App.tsx` and SHALL render nothing when there is no Ghost_Provider.
8. EVERY existing test SHALL still pass without edits. THE existing header ghost, `GhostGuide` text and every `role="alert"` message SHALL stay as they are.
9. THE `react()` call SHALL come after the state change it reports and SHALL NOT change what the screen saves or shows.

### Requirement 13: Tests

**User Story:** As the team, I want proof that the ghost cannot break.

#### Acceptance Criteria

1. THE property tests SHALL use fast-check with at least 100 runs each.
2. FOR ANY sequence of events from any valid start state, THE Ghost_Machine SHALL return a valid `GhostMood` every time and SHALL NOT throw.
3. FOR ANY Ghost_State, applying `animationDone` enough times (at most twice) SHALL reach `idle` or `sleep`.
4. FOR ANY Ghost_State, `poked` SHALL give `giggle`, and the next `animationDone` SHALL give `idle`.
5. WHEN Reduced_Motion is on, THE rendered Mascot SHALL have no class that starts with `ghost-mascot--anim`.
6. FOR ANY tip in the Tip_List, THE tip SHALL be at most 60 characters and SHALL hold no banned word.
7. THE test for the machine SHALL also check that `nightcap` changes only on `midnightToggled`, and that `sleepy` is true only for Busy_Moods.

### Requirement 14: Notes

**User Story:** As the hackathon team, I want what we learned written down.

#### Acceptance Criteria

1. WHEN all other tasks are done, THE file `KIRO_NOTES.md` SHALL gain one new row (same table format as the rows above it) that says what this spec found.
