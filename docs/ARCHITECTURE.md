# Architecture

GhostStack has four layers. Each layer has one job and must not reach into the others.

## Layers

- **Domain** (`src/domain/`): pure business logic for money, stock, sales, and debts. No React and no storage code. Functions are pure and deterministic.
- **Storage** (`src/storage/`): IndexedDB access only, through the `idb` library. No business rules.
- **Components** (`src/components/`): React UI only. Card components live in `src/components/cards/`. Money is turned into display text here and nowhere else.
- **Stacks** (`src/stacks/`): starter stack definitions, such as a provisions shop and a farm produce stall.

## Main data types

All money is an integer in the smallest currency unit (kobo for Naira).

**Stack**
- id
- name
- ordered list of cards
- currency (default Naira)

**Card**
- id
- type (Stock, Sales log, Debts, Daily summary)
- title
- position in the stack
- buttons (label, action, target card)

**Item**
- id
- name
- quantity (whole number, never below zero)
- cost price (integer kobo)
- sell price (integer kobo)
- low-stock level

**Sale**
- id
- item id
- quantity
- price per unit (integer kobo)
- time

**Debt**
- id
- customer name
- amount (integer kobo)
- date
- status (paid or unpaid)

## Data flow

1. UI action: the owner taps a button in a card.
2. Domain function: checks the input and returns the new data, or a clear error.
3. Storage: saves the new data on the device.
4. UI: shows the updated data, or a friendly error message.

## Debt form

`DebtForm` (`src/components/cards/DebtForm.tsx`) is the form for recording a debt. It is a helper for the Debts card view, not a card type. It keeps the typed customer name and amount as raw text, and shows each error next to its own Field. The Debts card view does the parsing and calls the domain.

## Debts card view

`DebtsCardView` (`src/components/cards/DebtsCardView.tsx`) is the Play-mode view of the Debts card. It shows the total owed (`totalOwed`), a "Who owes you" list (`debtsByCustomer`) and the full debt list (`debtsUnpaidFirst`). It takes `stack`, `card` and `onStackChange`. The record-a-debt and mark-as-paid flows are added in later tasks.

`DebtsPanel` (`src/components/cards/DebtsPanel.tsx`) is a small wrapper used by the app shell. It takes `stack`, an optional `card` and `onStackChange`. It shows `DebtsCardView` when the card exists, and otherwise a message that the shop has no Debts card. It never reads the card before checking it.

## WhatsApp sharing

The owner taps a button. The app builds a short message from numbers and names it already has, then hands the text to the phone. The app never sends anything by itself. The owner always has the last tap.

### Files

- `src/domain-ui/share/`: pure message code and delivery, with no React.
  - `types.ts`: `Language`, `ShareResult`, the two share error codes (`INVALID_AMOUNT`, `ALREADY_PAID`) and their messages, and the builder input types.
  - `templates.ts`: the `TEMPLATES` record, which holds all message wording.
  - `sanitise.ts`: `sanitiseText`, which cleans names and items before they go into a message.
  - `buildDebtReminder.ts` and `buildDailySummary.ts`: pure builders that return a `ShareResult`.
  - `deliver.ts`: `deliverMessage` and the `ShareEnvironment` type.
  - `browserEnvironment.ts`: `browserShareEnvironment`, the default environment built on `window` and `navigator`.
  - `index.ts`: re-exports.
- `src/components/share/`: React UI for sharing.
  - `ShareProvider.tsx`: holds the notice state and the "one delivery at a time" guard. It exposes `useShare()`.
  - `ShareButton.tsx`: one button built on `Button`. It renders nothing when there is no provider.
  - `ShareStatus.tsx` and `ShareStatus.css`: an always-present `role="status"` notice, and the manual-copy box.
  - `shareMessages.ts`: the outcome strings.
  - `dateLabel.ts`: `formatDateLabel`, the date text for the daily summary.
- Edits to existing files:
  - `src/components/Button.tsx` (and `Button.css`): an optional `ariaDisabled` prop.
  - `src/components/cards/DebtsCardView.tsx`: a "Send a reminder" button on each open debt.
  - `src/components/cards/DailySummaryCardView.tsx`: a "Share today's totals" button. `displayName` is exported so the message uses the same item names as the card.
  - `src/App.tsx`: wraps the page in `ShareProvider` and renders `ShareStatus` once.

`src/domain`, `src/storage` and the storage schema are not changed.

### How a message is delivered

`deliverMessage(text, env)` tries these steps in order and stops at the first one that works:

1. **Share sheet.** `env.share(text)`, if `env.canShare(text)` is true. If the owner closes the sheet (`AbortError`), the result is `cancelled` and nothing else is tried.
2. **`wa.me` link.** If the device is online, `env.openUrl("https://wa.me/?text=" + encodeURIComponent(text))`.
3. **Clipboard.** `env.writeClipboard(text)`. The owner then pastes the text into WhatsApp.
4. **Manual.** The text is shown in a read-only box with all of it selected, so the owner can copy it by hand.

The function never throws. A failure at any step moves on to the next one, and the worst case is the manual box. The result is one of `shared`, `opened`, `copied`, `cancelled` or `manual`.

### Injected `ShareEnvironment`

`deliverMessage` does not touch `window` or `navigator`. It receives a `ShareEnvironment` with five functions: `canShare`, `share`, `isOnline`, `openUrl` and `writeClipboard`. `ShareProvider` takes an optional `env` prop and defaults to `browserShareEnvironment`. Tests pass a fake environment, so they need no browser powers.

### Nothing is stored or sent automatically

- Nothing is saved. There is no share history and no new storage.
- The app makes no network request of its own. It only hands text to the share sheet, opens a `wa.me` link, or writes to the clipboard, and only after the owner taps a share button.
- Messages are built only from data on the device. The clock is never read: the date text comes from the day range the card already has.

### Templates and new languages

All wording and fallbacks live in `TEMPLATES` in `src/domain-ui/share/templates.ts`, a `Record<Language, Templates>`. The builders contain no message words. To add a language, add it to the `Language` type and add one entry to the `TEMPLATES` record. No builder or component changes.

### Known limit

When the `wa.me` link is opened in a new tab, the browser can block the popup without telling the page. `window.open` returns `null` even when it works, so a silent block cannot be told apart from success. The default `openUrl` clicks a temporary link with `rel="noopener noreferrer"` and returns `false` only when there is no document or the click throws. A silently blocked popup is therefore reported as `opened`.
