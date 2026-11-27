# Implementation Plan: Ghost companion

## Overview

Three batches, so each can be run on its own. Each batch ends with a checkpoint where the whole test suite and `tsc` must pass before the next batch starts.

- **Batch 1 (tasks 1 to 3):** types, the pure machine, and its property tests. No React.
- **Batch 2 (tasks 4 to 7):** frames, the Mascot and its CSS, the colour variable, reduced motion, and the provider.
- **Batch 3 (tasks 8 to 13):** tips, the speech bubble and companion strip, then wiring `react()` into sales, debts, errors, empty states and Midnight.
- **Final (task 14):** update `KIRO_NOTES.md`.

Global rules:

- Presentation layer only. Make no change in `src/domain`, `src/domain-ui` or `src/storage`.
- Add no package. Add no image.
- Do not edit existing tests. New cases go in new files.
- Follow `plain-language.md` for every word the owner can see, and `design-retro.md` for look and tap targets (44px).
- Property tests use fast-check with `numRuns` of at least 100, and a tag comment: `// Feature: ghost-companion, Property N: ...`.
- Existing files are edited with small targeted replaces. Do not rewrite `theme.css` whole: it holds non-ASCII characters that must stay as they are.

## Tasks

### Batch 1: types, machine, property tests

- [x] 1. Types
  - [x] 1.1 Create `src/components/ghost/ghostTypes.ts`
    - Export `GHOST_MOODS` (the nine moods), `GhostMood`, `isGhostMood`, `isRestingMood` (`idle`, `sleep`), `GhostEvent` (the ten events; `midnightToggled` carries `on: boolean`) and `GhostState` (`mood`, `nightcap`, `sleepy`). No React import.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 1.2 Write unit tests in `src/components/ghost/ghostTypes.test.ts`
    - `GHOST_MOODS` has the nine values and no repeats. `isGhostMood` is true for each and false for `"dance"`, `""` and a number. `isRestingMood` is true only for `idle` and `sleep`.
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Machine
  - [x] 2.1 Create `src/components/ghost/ghostMachine.ts`
    - Export `initialState(midnight: boolean)` (mood `idle`, `nightcap` set to `midnight`, `sleepy` false) and `next(state, event)` using the transition table in `design.md`. Return a new object. Import only from `ghostTypes.ts`. No clock, no `Math.random`, no tips, no timer lengths.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 3.1, 3.2, 3.3, 3.4, 3.5, 3.7_
  - [x] 2.2 Write unit tests in `src/components/ghost/ghostMachine.test.ts`
    - One fixed example per row of the transition table. `idleTimeout` during `cheer` keeps `cheer` and sets `sleepy`; the next `animationDone` gives `sleep`; the one after gives `idle`. `poked` from `sleep` gives `giggle`.
    - Read the machine source from disk (same `["node","fs"].join(":")` trick the theme tests use). It must not contain `Math.random`, `Date`, `setTimeout`, `performance` or `from "react"`.
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.2, 3.4, 3.5_

- [x] 3. Property tests
  - [x] 3.1 Write `src/components/ghost/ghostMachine.property.test.ts`
    - Build arbitraries: an event arbitrary (all ten, `on` as a random boolean) and a valid-state arbitrary (any mood, any `nightcap`, `sleepy` only when the mood is a Busy_Mood).
    - **Property 1: Any event sequence stays valid.** Fold `next` over 0 to 50 random events from `initialState(b)`. After every step, `isGhostMood(mood)` is true, `nightcap` and `sleepy` are booleans, `sleepy` implies a Busy_Mood, and nothing throws.
    - **Property 2: The ghost never gets stuck.** From any valid state, applying `animationDone` once or twice gives `idle` or `sleep`.
    - **Property 3: Poke ends in giggle then idle.** From any valid state, `poked` gives `giggle` and the next `animationDone` gives `idle`.
    - **Property 4: The nightcap only follows Midnight.** For any event other than `midnightToggled`, `nightcap` is unchanged. For `midnightToggled(on)` it equals `on`.
    - **Property 5: Each event gives its mood.** For `appOpened`, `saleRecorded`, `debtAdded`, `debtPaid`, `errorShown`, `emptyScreen`, `midnightToggled` and `poked`, from any valid state, the mood matches the table and `sleepy` is false.
    - **Property 6: A late idleTimeout never cuts a pose.** From a Busy_Mood, `idleTimeout` keeps the mood; then `animationDone` gives `sleep`. From a Resting_Mood, `idleTimeout` gives `sleep`.
    - **Property 7: `next` does not change its input.** Pass a frozen state; the call does not throw and the state is unchanged.
    - **Validates: Requirements 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 13.1, 13.2, 13.3, 13.4, 13.7**

- [x] Checkpoint (end of batch 1)
  - Run the whole suite and `npx tsc --noEmit`. Confirm `git status` shows changes only under `src/components/ghost/`.

### Batch 2: frames, CSS, reduced motion, provider

- [x] 4. Frames
  - [x] 4.1 Create `src/components/ghost/ghostFrames.ts`
    - Import `GHOST_GRID` and `GHOST_SIZE_CELLS` from `../ghostGrid`. Add the eye, mouth and arm variants from `design.md`, `buildFrame(parts)`, `frameCells(rows)`, the nightcap cells (rows -3 to -1), the sleep "z" cells, and the `MOODS` table (frame A, optional frame B, `ms` length per mood). Rest moods have `ms: 0`.
    - _Requirements: 5.1, 5.2, 5.7_
  - [x] 4.2 Write unit tests in `src/components/ghost/ghostFrames.test.ts`
    - Every row of every frame is 16 characters. Eyes change only rows 4 to 6, mouths only rows 9 to 10, arms only columns 0, 1, 14, 15. Every mood has a frame A. `idle` frame A equals `GHOST_GRID`. Cap rows are 16 characters. Every cell is inside `x` 0 to 15 and `y` -3 to 15.
    - _Requirements: 5.2, 5.7_

- [x] 5. Colour variable
  - [x] 5.1 Add `--color-ghost-cap` to `src/components/theme.css`
    - Add it to `:root` and to `[data-theme="midnight"]` with the proposed values from `design.md` (`#5b2fa0` and `#c8a2ff`). Use a targeted replace next to the `--color-ghost` lines. Midnight gold is not used.
    - _Requirements: 10.1, 10.2_
  - [x] 5.2 Add two `ui` pairs to `src/theme/palettePairs.ts`
    - "nightcap on page" (`--color-ghost-cap` on `--color-bg`) and "nightcap on card" (`--color-ghost-cap` on `--color-surface`). Run the palette contrast test. If a pair fails, change the value in `theme.css` until it passes in both themes.
    - _Requirements: 10.3, 10.4, 10.5_

- [x] 6. Mascot and CSS
  - [x] 6.1 Create `src/components/ghost/GhostMascot.tsx` and `GhostMascot.css`
    - Props: `mood`, `nightcap`, optional `cell` (default 3). Render the SVG as in `design.md`: `viewBox="0 -3 16 19"`, `aria-hidden="true"`, `focusable="false"`, no title, no role, `shapeRendering="crispEdges"`, `fill="currentColor"`. Use `useReducedMotion()`. Animated means not reduced and not `idle`. Static: class `ghost-mascot` only, frame A only. Animated: add `ghost-mascot--anim ghost-mascot--anim-<mood>` and draw frame B when the mood has one.
    - In the CSS, put the keyframes and every `animation:` line inside `@media (prefers-reduced-motion: no-preference)`, each with `steps(1, end)`. Colours only from `var(--color-ghost)` and `var(--color-ghost-cap)`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.5, 8.1, 9.5, 12.6_
  - [x] 6.2 Write tests in `src/components/ghost/GhostMascot.test.tsx` (jsdom, use `installMatchMedia`)
    - Decorative: `aria-hidden="true"`, `focusable="false"`, no `<title>`, no `role`. No hex or `rgb(` in the markup.
    - Reduced motion on: no class starting `ghost-mascot--anim`, one frame group, for every mood.
    - Reduced motion off: a non-idle mood has `ghost-mascot--anim-<mood>`; moods with a frame B draw two frame groups; `idle` has no animation class.
    - Nightcap group appears only when `nightcap` is true. The "z" cells appear for `sleep`.
    - Switching the media query while mounted updates the class without a remount.
    - **Property 8: Reduced motion never animates.** With fast-check (100+ runs), for any mood and any `nightcap`, a reduced-motion render has no `ghost-mascot--anim` class.
    - **Validates: Requirements 5.3, 6.1, 6.2, 6.5, 8.1, 9.5, 12.6, 13.1, 13.5**
  - [x] 6.3 Write `src/components/ghost/GhostMascot.css.test.ts`
    - Read `GhostMascot.css`. Every line with `animation:` sits inside the `prefers-reduced-motion: no-preference` block (match braces like `css.reducedMotion.test.ts`). Every `animation:` uses `steps(`. No hex, `rgb(` or colour name.
    - _Requirements: 5.4, 5.5, 5.6, 10.5_

- [x] 7. Provider
  - [x] 7.1 Create `src/components/ghost/GhostProvider.tsx`
    - Export `GhostProvider`, `useGhost` and the props from `design.md`. Use `useReducer(next, initialState(initialMidnight))`. Add `react` (stable identity, accepts a type name or an event object), the mood timer, the idle timer (in a ref, restarted by `react`, `pointerdown` and `keydown`), the wake rule (any interaction while `sleep` sends `animationDone`), the bubble timer and clearing on sleep, `appOpened` once on mount, and full cleanup on unmount.
    - Outside a provider, `useGhost()` returns a constant do-nothing value. Add an `active` flag only the provider sets.
    - The tip is chosen with `pickTip`, so a stub `ghostTips.ts` with the `TipKind` type and `pickTip` is created here and filled in by task 8. (Task 8.1 replaces the stub with the real list.)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 6.3, 6.4, 7.4, 9.1, 9.2, 9.3, 9.4, 9.6, 12.5_
  - [x] 7.2 Write tests in `src/components/ghost/GhostProvider.test.tsx` (jsdom, fake timers)
    - Mount gives `wave`; after the mood length it is `idle`. Same with reduced motion on (the ghost still returns to `idle`).
    - After `idleMs` with no interaction, the mood is `sleep`. A `pointerdown` wakes it to `idle` and restarts the idle timer. `keydown` does the same. `react("saleRecorded")` from `sleep` gives `cheer`.
    - `idleTimeout` during `cheer` ends in `sleep` after the pose.
    - `react` has the same identity across renders. Calling `react` twice with the same type restarts the mood timer.
    - Unmount leaves no pending timers (`vi.getTimerCount()` is 0) and removes the document listeners.
    - Outside a provider, `useGhost().react("saleRecorded")` does nothing and does not throw.
    - **Property 9: The provider never leaves the ghost stuck.** With fast-check (100+ runs) and fake timers, apply a random list of `react` calls, then advance the clock by 10 seconds. The mood is `idle` or `sleep`.
    - **Validates: Requirements 3.6, 4.3, 4.4, 4.5, 4.6, 4.7, 6.4, 9.1, 9.2, 9.3, 9.4, 9.6, 13.1, 13.3**
  - [x] 7.3 Write `src/components/ghost/ghostBoundary.test.ts`
    - Walk `src/domain`, `src/domain-ui` and `src/storage`. No file contains the text `components/ghost`. Also walk the non-test files in `src/components/ghost`: none of them imports from `domain`, `domain-ui` or `storage`.
    - _Requirements: 4.9_

- [x] Checkpoint (end of batch 2)
  - Run the whole suite and `npx tsc --noEmit`. The palette contrast test must pass with the new pairs. Confirm `git status` shows no change in `src/domain`, `src/domain-ui` or `src/storage`.

### Batch 3: tips, bubble, wiring

- [x] 8. Tips
  - [x] 8.1 Write the real `src/components/ghost/ghostTips.ts`
    - Export `TipKind`, `TIPS`, `BANNED_WORDS` and `pickTip(kind, counter)`. Start from the draft lines in `design.md`. Two or more tips for each of the eight kinds. Each tip is playful, at most 60 characters, plain English, and names the next step. Check each button name against the source: "Record a sale" is `ItemRow.tsx`, "Record a debt" and "Mark as paid" are in `DebtsCardView.tsx`, "Add an item" is in `StockCardView.tsx`. `pickTip` uses `((counter % n) + n) % n` so any integer works.
    - _Requirements: 7.2, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  - [x] 8.2 Write `src/components/ghost/ghostTips.test.ts`
    - **Property 10: A tip is short and plain.** With fast-check (100+ runs), pick any tip from `TIPS`: its length is at most 60 and it holds no word from `BANNED_WORDS` (whole word, any case).
    - **Property 11: `pickTip` stays inside its group.** For any kind and any integer counter, the result is in `TIPS[kind]`. Counter `c` and `c + n` give the same tip. Counter `c` and `c + 1` give the next tip in order.
    - Every kind has at least 2 tips. No tip is empty. A small check that the banned-word matcher itself works (a made-up tip "Sync your inventory" is caught).
    - **Validates: Requirements 7.2, 11.1, 11.2, 11.4, 11.5, 13.1, 13.6**

- [x] 9. Speech bubble and companion strip
  - [x] 9.1 Create `src/components/ghost/GhostCompanion.tsx` and `GhostCompanion.css`
    - Render the strip from `design.md`: the Poke_Button (`type="button"`, `aria-label="Poke the ghost"`) wrapping `GhostMascot` with `key={stamp}`, and the bubble (a `<p>` and the shared `Button` labelled "Got it"). Return `null` when there is no provider. After dismiss, focus the poke button with a ref.
    - CSS: `min-width` and `min-height` of `var(--tap-min)` on the poke button; bubble with surface colour, `var(--border-width)` border, offset shadow, left-pointing tail, in its own file (do not edit `GhostGuide.css`). The bubble is in normal flow and wraps on a 360px screen. Only Theme variables.
    - No `role`, no `aria-live`, no `aria-atomic` anywhere in the strip.
    - _Requirements: 7.1, 7.3, 7.5, 7.7, 8.2, 8.3, 8.4, 8.5, 12.7_
  - [x] 9.2 Write tests in `src/components/ghost/GhostCompanion.test.tsx` (jsdom)
    - `getByRole("button", { name: "Poke the ghost" })` exists; clicking it makes the mood `giggle` and shows a bubble. The CSS text has `var(--tap-min)` for width and height of `.ghost-companion__poke` and for the Got it button.
    - Only one bubble exists after three `react` calls, and it shows the latest tip.
    - The bubble and the strip have no `role`, `aria-live` or `aria-atomic`. `queryByRole("status")` and `queryByRole("alert")` are null.
    - Got it removes the bubble and focus moves to the poke button. The bubble closes by itself after `bubbleMs`, and when the ghost falls asleep.
    - With reduced motion on, the bubble still shows, closes on Got it and closes on its timer.
    - Without a provider the component renders nothing.
    - **Validates: Requirements 6.3, 7.1, 7.3, 7.4, 7.5, 8.2, 8.3, 8.4, 12.7**

- [x] 10. Error hook
  - [x] 10.1 Create `src/components/ghost/useGhostError.ts`
    - `useGhostError(message: string | null | undefined)`: `useEffect` on `[message, react]` that calls `react("errorShown")` when `message` is a non-empty string.
    - _Requirements: 12.3_
  - [x] 10.2 Write tests in `src/components/ghost/useGhostError.test.tsx`
    - A probe component with a spy provider: `undefined` and `""` do nothing; a new text calls `errorShown` once; the same text on re-render does not call again; a different text calls again. Without a provider nothing throws.
    - _Requirements: 12.3, 4.3_

- [x] 11. Wire the screens
  - [x] 11.1 Wire the provider, the strip and Midnight
    - In `src/main.tsx`, wrap `<App />` in `<GhostProvider initialMidnight={document.documentElement.dataset.theme === "midnight"}>`. In `src/App.tsx`, add `<GhostCompanion />` right after the `.app-bar` div, call `react({ type: "midnightToggled", on: next === "midnight" })` in `toggleTheme`, and call `useGhostError` for `saveError`, `switchError` and the load error message. Leave every `role="alert"` element and every existing text as it is.
    - _Requirements: 12.3, 12.5, 12.7, 12.8, 12.9_
  - [x] 11.2 Wire sales, debts and empty states
    - `StockCardView.tsx`: `react("saleRecorded")` after `onStackChange(result.value)` in the sale success branch; `useGhostError` on the sale form error and form-level error text.
    - `DebtsCardView.tsx`: `react("debtAdded")` after a debt is recorded; `react("debtPaid")` after a debt is marked paid; `useGhostError` on the debt form errors and on `settleError`.
    - `GhostGuide.tsx`: `useEffect(() => react("emptyScreen"), [react])`. `GhostGuide` text and structure stay as they are.
    - `StarterChooser.tsx`: `useGhostError(error)`.
    - Do not change what any screen saves, shows or announces.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.8, 12.9_
  - [x] 11.3 Write wiring tests in `src/components/ghost/ghostWiring.test.tsx`
    - Wrap each screen in a spy provider that records events. Record a sale: one `saleRecorded`. Record a debt: one `debtAdded`. Mark a debt as paid: one `debtPaid`. A sale with too big a number: one `errorShown`, and the `role="alert"` message is still there with its old text. Render an empty Stock card: one `emptyScreen`. Toggle Midnight in `App`: one `midnightToggled` with the right `on`. Start `App` with `data-theme="midnight"`: the provider's `nightcap` is true.
    - A failed save does not call the success event.
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.8**

- [x] 12. Full-page checks
  - [x] 12.1 Write `src/components/ghost/GhostCompanion.app.test.tsx`
    - Render `App` inside a real provider with short timers. After a sale the ghost cheers and the bubble shows a tip that names a button. The bubble is not inside any live region. The existing sale notice and every `role="alert"` element are unchanged. After the idle time the ghost sleeps; a click wakes it.
    - _Requirements: 7.5, 7.6, 9.1, 9.3, 12.1, 12.8_
  - [x] 12.2 Write `.kiro/specs/ghost-companion/manual-check.md`
    - A short list for a person to check on a phone-size window in both themes: ghost waves on open; a sale makes it cheer; an error makes it say sorry while the red message stays; the Midnight switch adds the nightcap; 60 seconds of nothing puts it to sleep and a tap wakes it; with "reduce motion" turned on in the system, nothing moves but faces and bubbles still change; the bubble never covers a field or button; tab through the page and confirm the poke button and Got it show the focus outline.
    - _Requirements: 6.1, 6.2, 6.3, 8.5_

- [x] 13. Checkpoint (end of batch 3)
  - Run the whole suite and `npx tsc --noEmit`. Run the old tests untouched (`git diff --stat` shows no edited `*.test.*` file that existed before this spec). Confirm `git status` shows no change in `src/domain`, `src/domain-ui` or `src/storage`. Confirm `package.json` and `package-lock.json` are unchanged.

### Final

- [x] 14. Update `KIRO_NOTES.md`
  - [x] 14.1 Add one row to the table in `KIRO_NOTES.md`
    - Same columns as the rows above it (Date, What I did, Kiro feature used, What worked, What didn't, Credits used). Say what this spec found, in plain words: what was built (machine, frames, provider, bubble, tips), how many property tests and runs, the design calls that mattered (sleep woken by `animationDone`, `sleepy` flag, timers instead of `animationend`, no-op hook without provider, bubble outside the machine), problems met (for example colour pairs, two ghosts on empty screens, the repeated-error limit), and anything the tests did not cover. Use real numbers from the last test run. Do not edit any earlier row.
    - _Requirements: 14.1_
