# Requirements Document

## Introduction

**Feature:** WhatsApp sharing. The owner can send a polite debt reminder to a customer, and share today's totals, through WhatsApp or any other app on the phone.

The app builds the message text, then hands it to the phone's share sheet. If that is not available it opens a WhatsApp link, and if that is not possible it copies the text. If copying fails it shows the text so the owner can copy it by hand. The app never sends anything by itself. The owner always taps "send" in WhatsApp.

It follows `product.md`, `tech.md`, `design-retro.md`, `plain-language.md` and `money-rules.md`.

**In scope:** pure message builders, a delivery function with an injected environment, two buttons, one status notice, one manual-copy fallback.

**Out of scope (non-goals, do not build):**
- Storing phone numbers or contacts.
- Any backend.
- Analytics.
- Automatic sending.
- The Contacts API.
- New fields in storage. `schemaVersion` stays 1.
- New npm packages.
- Changes to `src/domain` or `src/storage`.
- Any import from `src/components/ghost`.

**Layers:**
- Builders live in `src/domain-ui/share/`.
- Delivery lives in `src/domain-ui/share/deliver.ts`.
- UI lives in `src/components/share/`.

## Glossary

- **Kobo:** the smallest money unit. All money is a whole number of kobo.
- **Builder:** a pure function that turns numbers and names into message text (`buildDebtReminder`, `buildDailySummary`).
- **Sanitise:** the clean-up in Requirement 3.1 that is applied to names before they go into a message.
- **Language:** the type `"en"` for now.
- **Templates record:** the one typed record, keyed by Language, that holds all message wording.
- **ShareEnvironment:** the injected interface that gives `deliverMessage` its browser powers.
- **ShareOutcome:** what `deliverMessage` resolves to: `shared`, `opened`, `copied`, `cancelled` or `manual`.
- **Status notice:** the one persistent `role="status"` element that tells the owner what happened.
- **Manual fallback:** the read-only textarea and "Done" button shown for the `manual` outcome.

## Requirements

### Requirement 1: Debt reminder text

**User Story:** As a shop owner, I want a friendly reminder message for a customer who owes me money, so that I can ask for payment politely.

#### Acceptance Criteria

1. buildDebtReminder(input) is pure: no clock, no randomness, no network, no DOM.
2. input = { personName: string, shopName: string, outstandingKobo: number, language: Language }. Language is the type "en" for now, and templates live in one typed record keyed by Language so a later spec can add languages without changing builders.
3. It returns a Result: ok with { text } or an error with code "INVALID_AMOUNT" (outstandingKobo is not a safe integer >= 1) or "ALREADY_PAID" (outstandingKobo is 0). Define these two codes in the share module itself. Do not edit src/domain/result.ts.
4. The English text is exactly: "Hello {personName}, a gentle reminder from {shopName}: you still owe {amount}. Thank you!" where {amount} comes from the EXISTING function the cards use to display kobo as naira (find it and reuse it; do not write another).
5. The text never contains threats, deadlines or shaming words.
6. Use the outstanding balance after partial payments (find the existing domain function that computes it and reuse it in the UI layer; the builder only receives the number).

### Requirement 2: Daily summary text

**User Story:** As a shop owner, I want to share today's totals in one message, so that I can send them to a partner or keep them in a chat.

#### Acceptance Criteria

1. buildDailySummary(input) is pure with the same rules as 1.1.
2. input = { shopName, dateLabel: string, salesKobo, profitKobo, owedKobo, lowStockNames: string[], language }. dateLabel is formatted by the caller. The builder never reads the clock.
3. It returns a Result: ok with { text } or error "INVALID_AMOUNT" when any kobo value is not a safe integer >= 0.
4. The English text is exactly these lines joined with "\n": "{shopName}, {dateLabel}" / "Sales: {sales}" / "Profit: {profit}" / "Owed to me: {owed}" / "Low on stock: {items}" where {items} is the names joined with ", " (max 3 names, then " and {n} more"), or "nothing" when the list is empty.

### Requirement 3: Sanitising and limits

**User Story:** As a shop owner, I want names to be cleaned and kept short, so that a strange name can never break or overflow the message.

#### Acceptance Criteria

1. Before use, personName, shopName and each item name are: stripped of control characters (U+0000-U+001F, U+007F) and bidirectional override characters (U+202A-U+202E, U+2066-U+2069), whitespace collapsed to single spaces, trimmed, then cut to a maximum of 30 code points for names and 20 code points for items (count with Array.from, never .length).
2. If personName is empty after sanitising it becomes "there". If shopName is empty it becomes "my shop". Empty item names are dropped.
3. For ANY unicode input, encodeURIComponent(text).length <= 1800. The caps in 3.1 must be chosen so this always holds.

### Requirement 4: Message text quality

**User Story:** As a shop owner, I want every message to look clean, so that customers never see broken numbers or code words.

#### Acceptance Criteria

1. The text never contains "NaN", "undefined", "null", "[object" or a number with a decimal point followed by 3 or more digits.
2. The text contains the exact formatted amount string from 1.4 or 2.4.
3. Whole-naira amounts display without ".00", matching the cards.

### Requirement 5: Delivery

**User Story:** As a shop owner, I want sharing to work on any phone, online or offline, so that I can always get my message out.

#### Acceptance Criteria

1. deliverMessage(text, env) returns Promise<ShareOutcome> and NEVER throws or rejects. ShareOutcome is one of: { kind: "shared" }, { kind: "opened" }, { kind: "copied" }, { kind: "cancelled" }, { kind: "manual", text }.
2. env is an injected interface ShareEnvironment { canShare(text): boolean; share(text): Promise<void>; isOnline(): boolean; openUrl(url): boolean; writeClipboard(text): Promise<void> } with a default implementation built on window/navigator. Tests use fakes.
3. Order of strategies: (a) if canShare, call share; (b) otherwise, if isOnline, openUrl("https://wa.me/?text=" + encodeURIComponent(text)) with noopener and noreferrer; (c) otherwise or if (a)/(b) fail, writeClipboard; (d) if the clipboard fails, return manual.
4. A share() rejection with name "AbortError" returns cancelled and tries nothing else. Any other share() failure falls to the next strategy.
5. openUrl returning false (popup blocked) falls to the next strategy.
6. Outcomes: strategy (a) ok -> shared, (b) ok -> opened, (c) ok -> copied, (d) -> manual with the exact text.

### Requirement 6: Buttons

**User Story:** As a shop owner, I want a clear button for each kind of message, so that I can share with one tap.

#### Acceptance Criteria

1. Each OPEN debt row gets a button labelled "Send a reminder" with aria-label "Send a reminder to {personName}". Paid debts (outstanding 0) show no button.
2. The Today card gets a button labelled "Share today's totals".
3. Both buttons are at least 44px high, use existing theme tokens only, and introduce no new colours. If any new colour pair is unavoidable, add it to PAIR_LIST and it must pass in both themes.
4. While a delivery is in flight the pressed button is aria-disabled and ignores further presses (navigator.share throws if called twice).
5. Buttons work with the app offline and make no network request except opening the wa.me link in 5.3(b).

### Requirement 7: Status notice and manual fallback

**User Story:** As a shop owner, I want to be told what happened after I tap, and to still get my message if sharing fails.

#### Acceptance Criteria

1. One persistent element with role="status" (always in the DOM, text changes) shows exactly these strings by outcome: shared: "Shared. Thank you!" / opened: "The ghost has packed your message. Tap send in WhatsApp." / copied: "Copied. Paste it in WhatsApp." / cancelled: no text (clear the notice) / manual: "Could not share. Select the message below and copy it."
2. For manual, show a read-only textarea with the exact text that selects all on focus, plus a "Done" button. Focus moves to the textarea (use the existing pendingFocus + effect pattern). Done returns focus to the button that started the action.
3. The notice clears after the next press or when navigating to another tab.

### Requirement 8: Accessibility and language

**User Story:** As a shop owner who uses a keyboard or screen reader, I want the new controls to be easy to see and understand.

#### Acceptance Criteria

1. Visible text follows .kiro/steering/plain-language.md.
2. No emoji in any message text. Visible focus ring on every new control.
3. A change of the app's language later requires editing only the templates record.

### Requirement 9: Documentation

**User Story:** As a maintainer, I want the feature written down, so that the next spec can build on it.

#### Acceptance Criteria

1. Add a "WhatsApp sharing" section to docs/ARCHITECTURE.md.
2. Final task: add to KIRO_NOTES.md what this spec found, including any bug a property test caught, and the credits this spec used.
