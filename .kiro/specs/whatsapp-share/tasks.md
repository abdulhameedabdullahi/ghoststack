# Implementation Plan: WhatsApp sharing

## Overview

Three batches. Each batch starts with a checkpoint (stop and commit) and ends with the same three checks: `npx tsc --noEmit`, `npm test` and `npm run build`. Each property test is written in the same task as the function it covers. Every property test runs at least 100 cases and logs its seed on failure.

Do not touch `src/domain`, `src/storage`, `src/domain/result.ts`, `package.json` or storage fields. Do not import from `src/components/ghost`.

## Tasks

### Batch 1: types, sanitise, both builders, P1 to P5 and P7

- [x] **CHECKPOINT: Stop here and commit all work so far (including this spec) before starting Batch 1.**

- [x] 1. Types, templates and test helpers
  - [x] 1.1 Create `src/domain-ui/share/types.ts`
    - Export `Language = "en"`, `ShareErrorCode = "INVALID_AMOUNT" | "ALREADY_PAID"`, `SHARE_ERROR_MESSAGES` (plain-language text for both codes), `ShareResult<T>`, `MessageText`, `DebtReminderInput` and `DailySummaryInput`.
    - Do not edit `src/domain/result.ts`.
    - _Requirements: 1.2, 1.3, 2.2, 2.3_
  - [x] 1.2 Create `src/domain-ui/share/templates.ts`
    - Export the `Templates` interface and `TEMPLATES: Record<Language, Templates>`. Put every English word in it: the fallbacks "there" and "my shop", "nothing", the items separator ", ", `itemsMore(n)` giving " and {n} more", `debtReminder(...)` and `dailySummary(...)` (five lines joined with "\n").
    - The English text must match 1.4 and 2.4 exactly. No emoji.
    - _Requirements: 1.2, 1.4, 1.5, 2.4, 8.2, 8.3_
  - [x] 1.3 Create `src/test/shareArbitraries.ts`
    - Export `fullUnicodeString` (built from `fc.string({ unit: "binary" })`, because `fc.fullUnicodeString` is gone in fast-check 4), a lone-surrogate string arbitrary, the empty string, very long strings, RTL strings with bidi override characters, emoji strings (including a joined family sequence), control-character and whitespace-heavy strings, `nameArb` (`fc.oneof` of all of them), `validKoboArb` (1 to `Number.MAX_SAFE_INTEGER`, edges included), `zeroOrMoreKoboArb` and `lowStockNamesArb` (0 to 50 names).
    - Export `checkProperty(property, runs = 100)`: runs `fc.check` with `numRuns >= 100` and, on failure, throws an `Error` whose message holds the seed, the counterexample and the shrunk error.
    - _Requirements: 3.3, Property tests section of the request_
  - [x] 1.4 Write unit tests in `src/domain-ui/share/templates.test.ts`
    - Exact English text for fixed inputs. No banned word in any template (for example "overdue", "final", "legal", "police", "court", "shame", "urgent", "immediately", "or else"). No emoji.
    - _Requirements: 1.4, 1.5, 2.4, 8.2_

- [x] 2. `sanitiseText`
  - [x] 2.1 Create `src/domain-ui/share/sanitise.ts`
    - Export `NAME_MAX = 30`, `ITEM_MAX = 20` and `sanitiseText(value, max)`.
    - Steps in order: replace lone surrogates with U+FFFD; remove U+0000-U+001F, U+007F, U+202A-U+202E and U+2066-U+2069; collapse `\s+` to one space; trim; cut to `max` code points with `Array.from` (never `.length`); trim the end again.
    - Pure. Use no `replaceAll` or `toWellFormed` (the project targets ES2020).
    - _Requirements: 3.1, 3.2_
  - [x] 2.2 Write unit tests in `src/domain-ui/share/sanitise.test.ts`
    - Each forbidden character is removed (so `"a\nb"` becomes `"ab"`). Whitespace collapses. Trim works. The cut counts emoji as one code point. A cut that ends on a space is trimmed. A lone surrogate becomes U+FFFD. Empty input gives `""`.
    - _Requirements: 3.1_
  - [x] 2.3 Write fast-check property test P4 in `src/domain-ui/share/sanitise.property.test.ts`
    - **Property P4: sanitising is idempotent, its output has no forbidden character, and it has at most `max` code points (counted with `Array.from`).** Use `nameArb` and caps 30 and 20.
    - **Validates: Requirements 3.1**

- [x] 3. `buildDebtReminder`
  - [x] 3.1 Create `src/domain-ui/share/buildDebtReminder.ts`
    - Check the amount first: `0` gives `ALREADY_PAID`; not a safe integer or less than 1 gives `INVALID_AMOUNT`.
    - Sanitise names with `NAME_MAX`, apply the fallbacks from the templates, format the amount with the existing `formatDisplay` from `src/components/formatMoney.ts` (do not write another formatter), and fill `TEMPLATES[language].debtReminder`.
    - Pure. No clock, no randomness, no network, no DOM.
    - _Requirements: 1.1 to 1.6, 3.1, 3.2, 4.2, 4.3_
  - [x] 3.2 Write unit tests in `src/domain-ui/share/buildDebtReminder.test.ts`
    - Exact text for a known input, for example `Hello Ada, a gentle reminder from Mama Ife's Shop: you still owe ₦1,250.50. Thank you!`. A whole-naira amount has no ".00". Empty names become "there" and "my shop". `0` gives `ALREADY_PAID`. `-1`, `1.5`, `NaN`, `Infinity` and `2 ** 53` give `INVALID_AMOUNT`. The error codes carry messages.
    - _Requirements: 1.3, 1.4, 3.2, 4.3_
  - [x] 3.3 Write fast-check property tests P1, P3, P5 and P7 in `src/domain-ui/share/buildDebtReminder.property.test.ts`
    - **Property P1: any valid input gives ok, and the text satisfies 4.1, 4.2 and 3.3.** For 4.1, cut every sanitised user-supplied string out of the text before checking (design decision 7). 4.2: the text contains `formatDisplay(outstandingKobo)`. 3.3: `encodeURIComponent(text).length <= 1800`. Include a worst-case input of 4-byte code points.
    - **Property P3: `decodeURIComponent(encodeURIComponent(text))` equals `text`.** This includes lone-surrogate input.
    - **Property P5: any `outstandingKobo` that is not a safe integer >= 1 gives `INVALID_AMOUNT`, and `0` gives `ALREADY_PAID`.** Treat `-0` as `0`.
    - **Property P7: the same input twice gives the same text.**
    - **Validates: Requirements 1.1, 1.3, 3.3, 4.1, 4.2, 4.3**

- [x] 4. `buildDailySummary`
  - [x] 4.1 Create `src/domain-ui/share/buildDailySummary.ts`
    - Any of the three kobo values not a safe integer or less than 0 gives `INVALID_AMOUNT`.
    - Sanitise `shopName` and `dateLabel` with `NAME_MAX`, each item with `ITEM_MAX`, drop empty items, then build the items line: first 3 joined with the separator, then `itemsMore(rest)`, or `itemsNone` when empty. Format all amounts with `formatDisplay`.
    - Pure, same rules as the debt builder.
    - _Requirements: 2.1 to 2.4, 3.1, 3.2, 4.2, 4.3_
  - [x] 4.2 Write unit tests in `src/domain-ui/share/buildDailySummary.test.ts`
    - Exact five-line text for a known input. Items line for 0, 1, 3, 4 and 5 names (`a, b, c and 2 more`). Empty item names are dropped before counting. Zero values are allowed (`₦0`). A negative, fractional or `NaN` value in any of the three fields gives `INVALID_AMOUNT`.
    - _Requirements: 2.3, 2.4, 3.2, 4.3_
  - [x] 4.3 Write fast-check property tests P2, P3 and P7 in `src/domain-ui/share/buildDailySummary.property.test.ts`
    - **Property P2: any valid input (0 to 50 low-stock names) gives ok, and the text satisfies 4.1, 4.2 and 3.3.** 4.2: the text contains the formatted sales, profit and owed amounts. Include a worst-case input of 4-byte code points, three maximum amounts and 50 names.
    - **Property P3: the text round-trips through `encodeURIComponent` and `decodeURIComponent`.**
    - **Property P7: the same input twice gives the same text.**
    - **Validates: Requirements 2.1, 2.3, 3.3, 4.1, 4.2, 4.3**

- [x] 5. Barrel and checks
  - [x] 5.1 Create `src/domain-ui/share/index.ts` that re-exports the types, templates, `sanitiseText` and both builders.
  - [x] 5.2 Confirm no file in `src/domain-ui/share/` imports from `src/components/ghost`, and `src/domain` and `src/storage` have no changes (`git status`).
  - [x] 5.3 Run `npx tsc --noEmit`, then `npm test`, then `npm run build`. All three must pass.

### Batch 2: ShareEnvironment, deliverMessage, P6

- [x] **CHECKPOINT: Stop here and commit Batch 1 before starting Batch 2.**

- [x] 6. `deliverMessage`
  - [x] 6.1 Create `src/domain-ui/share/deliver.ts`
    - Export `ShareOutcome`, `ShareEnvironment` (`canShare`, `share`, `isOnline`, `openUrl`, `writeClipboard`) and `deliverMessage(text, env): Promise<ShareOutcome>`.
    - Chain: (a) if `canShare`, `await share`; (b) otherwise, or after a non-abort failure of (a), if `isOnline`, `openUrl("https://wa.me/?text=" + encodeURIComponent(text))`; (c) otherwise, or after (a) or (b) failed, `await writeClipboard`; (d) if the clipboard fails, `{ kind: "manual", text }`.
    - A rejection from `share` with `name === "AbortError"` returns `{ kind: "cancelled" }` at once and calls nothing else. `openUrl` returning `false` goes to the next strategy.
    - Wrap every `env` call in `try`, treat a throw (including a synchronous one) as failure, and wrap the whole body so the promise never rejects.
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6_
  - [x] 6.2 Create `src/domain-ui/share/browserEnvironment.ts`
    - Export `browserShareEnvironment: ShareEnvironment`. `canShare`: `navigator.share` is a function and (`navigator.canShare` is missing or returns true for `{ text }`). `share`: `navigator.share({ text })`. `isOnline`: `navigator.onLine !== false`. `openUrl`: click a temporary `<a href target="_blank" rel="noopener noreferrer">` and remove it; return `false` only without a document or on a throw. `writeClipboard`: `navigator.clipboard.writeText`, rejecting when the API is missing. Guard for a missing `window` or `navigator`.
    - _Requirements: 5.2, 5.3, 6.5_
  - [x] 6.3 Write unit tests in `src/domain-ui/share/deliver.test.ts`
    - Use a fake environment that records calls. One test per case: (a) ok gives `shared`; canShare false and online with `openUrl` true gives `opened`, and the URL equals `"https://wa.me/?text=" + encodeURIComponent(text)`; offline gives `copied`; clipboard failure gives `manual` with the exact text; `AbortError` gives `cancelled` and no other call; a non-abort `share` failure falls to `openUrl`; `openUrl` false falls to the clipboard; a `share` failure while offline falls to the clipboard; a fake that throws synchronously still resolves.
    - _Requirements: 5.1, 5.3 to 5.6_
  - [x] 6.4 Write unit tests in `src/domain-ui/share/browserEnvironment.test.ts`
    - First line `// @vitest-environment jsdom`. Cover `canShare` with and without `navigator.share`, `isOnline`, `openUrl` (creates a link with `rel="noopener noreferrer"` and `target="_blank"`, clicks it, removes it), and `writeClipboard` rejecting when `navigator.clipboard` is missing.
    - _Requirements: 5.2, 5.3_
  - [x] 6.5 Write fast-check property test P6 in `src/domain-ui/share/deliver.property.test.ts`
    - Generate every combination: `canShare` true or false; `share` resolving, rejecting with an `AbortError` (both a `DOMException`-like and a plain object), rejecting with another error, or throwing synchronously; `isOnline` true or false; `openUrl` true, false or throwing; `writeClipboard` resolving, rejecting or throwing. Text from `nameArb`.
    - **Property P6: `deliverMessage` resolves, never throws, and returns one of the five kinds. `manual` always carries the exact text. `AbortError` always returns `cancelled` with no other call made. The outcome follows the strategy order in 5.3 and 5.6.**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5, 5.6**

- [x] 7. Barrel and checks
  - [x] 7.1 Add `deliverMessage`, `ShareEnvironment`, `ShareOutcome` and `browserShareEnvironment` to `src/domain-ui/share/index.ts`.
  - [x] 7.2 Run `npx tsc --noEmit`, then `npm test`, then `npm run build`. All three must pass.

### Batch 3: buttons, notice, manual fallback, component tests, docs and KIRO_NOTES.md

- [x] **CHECKPOINT: Stop here and commit Batch 2 before starting Batch 3.**

- [x] 8. Shared UI pieces
  - [x] 8.1 Add `ariaDisabled?: boolean` to `src/components/Button.tsx` and a `.button[aria-disabled="true"]` rule (with hover and active) to `Button.css`
    - The prop writes `aria-disabled`. The rule uses `--color-disabled-bg` and `--color-disabled-fg` and `cursor: not-allowed`. Existing callers do not change. No new colour.
    - _Requirements: 6.3, 6.4_
  - [x] 8.2 Create `src/components/share/shareMessages.ts` and `dateLabel.ts`
    - `shareMessages.ts`: the four outcome strings of 7.1 (exact text), the label "Your message" and the label "Done".
    - `dateLabel.ts`: `formatDateLabel(iso)` returns a short local date such as "Wed, 25 Nov", or "Today" when the date cannot be read. It takes the date as an argument and never reads the clock.
    - _Requirements: 7.1, 8.1_
  - [x] 8.3 Create `src/components/share/ShareProvider.tsx`
    - Context with `env` (default `browserShareEnvironment`), `resetKey`, the `busyRef` guard plus `busy` state, `originRef`, the `view` state, and the `pendingFocus` state with its effect (same pattern as `DebtsCardView`). Export `ShareProvider` and `useShare()` (returns `undefined` without a provider).
    - `share(makeText, origin)` follows the steps in the design: ignore when busy, clear the notice on press, show the builder error message when the build fails, call `deliverMessage`, map the outcome to the exact 7.1 string, release the guard in `finally`. Drop an outcome that arrives after `resetKey` changed. A `resetKey` change clears the view.
    - Do not import from `src/components/ghost`.
    - _Requirements: 5.1, 6.4, 7.1, 7.2, 7.3_
  - [x] 8.4 Create `src/components/share/ShareButton.tsx`
    - Props `label`, `ariaLabel?`, `makeText`. Built on `Button` with `buttonRef`, `ariaDisabled={busy}` and an `onClick` that calls `share(makeText, buttonRef.current)`. Renders nothing without a provider.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.2_
  - [x] 8.5 Create `src/components/share/ShareStatus.tsx` and `ShareStatus.css`
    - A `<p role="status">` that is always rendered, with text from the context. When the view is manual, below it: a labelled read-only `<textarea>` holding the exact text, `onFocus` selects all, plus a "Done" `Button`. Focus moves to the textarea through `pendingFocus`. Done sets `pendingFocus` to `"origin"` and clears the view.
    - CSS uses only existing theme variables. No new colour. No `outline: none` or `outline: 0`.
    - _Requirements: 6.3, 7.1, 7.2, 8.1, 8.2_

- [x] 9. Wire the buttons and the notice
  - [x] 9.1 Edit `src/components/cards/DebtsCardView.tsx`
    - In each row, when `totalOwed([debt]) >= 1`, add `ShareButton` with `label="Send a reminder"` and `ariaLabel={`Send a reminder to ${debt.customer}`}`. Its `makeText` calls `buildDebtReminder` with `personName: debt.customer`, `shopName: stack.name`, `outstandingKobo: totalOwed([debt])` and `language: "en"`. Paid debts get no button. Existing behaviour and tests do not change.
    - _Requirements: 1.6, 6.1_
  - [x] 9.2 Edit `src/components/cards/DailySummaryCardView.tsx`
    - Export `displayName`. Add `ShareButton` with `label="Share today's totals"`. Its `makeText` calls `buildDailySummary` with `shopName: stack.name`, `dateLabel: formatDateLabel(dayRange.start)`, the sales, profit and owed values (a `Result` that is not ok becomes `NaN`), `lowStockNames: lowStockItems(stack).map((i) => displayName(i.name))` and `language: "en"`. Never read the clock.
    - _Requirements: 2.2, 6.2_
  - [x] 9.3 Edit `src/App.tsx`
    - Wrap the returned page in `<ShareProvider resetKey={`${mode}:${selectedCard?.id ?? ""}`}>`. Render `<ShareStatus />` once, below `NoticeArea`, so it is always in the DOM. Change nothing else.
    - _Requirements: 7.1, 7.3_

- [x] 10. Component tests
  - Each file starts with `// @vitest-environment jsdom` and imports `../../test/setup`. Use a fake `ShareEnvironment` and `vi.fn()` spies. Follow `DebtsCardView.test.tsx` for fixtures.
  - [x] 10.1 `src/components/cards/DebtsCardView.share.test.tsx`
    - 6.1: an open debt has a button named "Send a reminder" with aria-label "Send a reminder to Ada". A paid debt shows no button. Pressing it calls `share` with the exact reminder text. 6.4: pressing twice quickly makes one `share` call, and the button is `aria-disabled="true"` while the first call is pending and not after it settles.
    - _Requirements: 6.1, 6.4_
  - [x] 10.2 `src/components/cards/DailySummaryCardView.share.test.tsx`
    - 6.2: the button "Share today's totals" is present and passes the exact summary text to `share`. A day with a loss shows the `INVALID_AMOUNT` message and makes no `share` call.
    - _Requirements: 6.2_
  - [x] 10.3 `src/components/share/ShareStatus.test.tsx`
    - 7.1: the `role="status"` element exists before any press, and the exact string for each of `shared`, `opened`, `copied`, `manual`, with an empty status for `cancelled`. 7.2: for `manual` the textarea is read-only, holds the exact text, has focus, selects all on focus, and Done returns focus to the starting button and removes the box. 7.3: the next press clears the notice, and changing `resetKey` clears it. 6.5: with `isOnline` false and `canShare` false the result is "Copied. Paste it in WhatsApp." and a `fetch` spy was never called.
    - _Requirements: 6.5, 7.1, 7.2, 7.3_
  - [x] 10.4 `src/components/share/shareCss.test.ts`
    - The new CSS and `Button.css` contain no `outline: none` or `outline: 0`. The new CSS defines no `--color-` variable. (The existing `css.colours` test already checks for colour literals.)
    - _Requirements: 6.3, 8.2_

- [x] 11. Documentation
  - [x] 11.1 Add a "WhatsApp sharing" section to `docs/ARCHITECTURE.md`
    - Cover the files, the strategy order (share sheet, `wa.me` link, clipboard, manual), the injected `ShareEnvironment`, the rule that nothing is stored or sent automatically, the templates record for new languages, and the known limit that a silently blocked popup cannot be detected.
    - _Requirements: 9.1_

- [x] 12. Scope check
  - [x] 12.1 `git status` shows no change in `src/domain` or `src/storage`, no change in `package.json`, and no import from `src/components/ghost` in any new file.

- [ ] 13. Final task: update `KIRO_NOTES.md`, then run the final checks
  - [x] 13.1 Add a row to the table in `KIRO_NOTES.md`: what this spec built, the Kiro features used, what worked, what did not, and the credits. Read the credits from the Kiro usage panel and write the number in. If it cannot be read, write that it was not shown, as earlier rows do.
    - Record what the spec found, including: the domain has no partial payments (`totalOwed([debt])` is the outstanding balance); `fc.fullUnicodeString` is gone in fast-check 4; `window.open` with `noopener` cannot report a blocked popup; the loss-day limit of the daily summary; and **any bug a property test caught** (for example, if P4 caught a non-idempotent cut that ends on a space, or P3 caught a lone surrogate that makes `encodeURIComponent` throw). If none were caught, say so.
    - Update the Counts section: specs written, property tests added (P1 to P7), total tests passing, bugs found by property tests.
    - _Requirements: 9.2_
  - [-] 13.2 Run `npx tsc --noEmit`, then `npm test`, then `npm run build`. All three must pass.
  - [~] 13.3 Stop and commit Batch 3.
