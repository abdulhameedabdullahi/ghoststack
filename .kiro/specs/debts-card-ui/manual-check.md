# Debts tab: manual check (task 10.3)

I could not open a browser, so **nothing below was checked in a real browser**.
I also did not re-run the test suite for this task. "Test" means a test that
exists in the repo and passed in task 10.1.

Key:
- [T] covered by an existing automated test (named)
- [C] checked by reading the code or CSS only
- [H] NOT verified. A human must check this in a browser.

Test files: `DebtsCardView.test.tsx` (component tests, jsdom),
`src/domain/debts.test.ts` and `debts.property.test.ts` (domain).

## Display
- [x] [C] Debts tab shows the real view, no "Coming soon". `App.tsx` renders `DebtsPanel` in the Debts branch and the old paragraph is gone. [T] "shows the Debts card view when there is a card" (DebtsPanel). [H] Look at it in the browser.
- [x] [T] Total owed shown. "settles the debt on Yes and lowers the total owed by exactly that amount"; "shows the empty state ... zero total".
- [x] [T] "Who owes you" largest first, "Ada", " ada " and "ADA" counted as one: `debtsByCustomer` unit tests and Properties 4 and 5. [C] The view maps the result in order.
- [x] [T] Unpaid debts first in the full list: `debtsUnpaidFirst` unit tests and Properties 1 and 2. [C] The view renders `debtsUnpaidFirst(card.debts)`.
- [x] [T] Status shows icon and word: "shows a paid debt as Paid..." and "shows an unpaid debt as Not paid...". [C] The icon has `aria-hidden`, so the word carries the meaning.
- [ ] [H] Whether the icon and word look clear on a real screen.

## Record a debt
- [x] [T] Form opens with focus in the customer name: "moves focus to the customer Field when the form opens".
- [x] [T] Empty name shows an error by the name Field: "shows the customer message next to the customer Field and keeps the form open".
- [x] [T] Letters in the amount show the friendly sentence by the amount Field, never "kobo": "shows friendly wording for unreadable amount text without calling onStackChange"; `debtErrors.test.ts`.
- [x] [T] Valid debt closes the form, adds the debt, updates the total: "saves a debt, shows it in the lists and total, and closes the form".
- [x] [T] "Debt recorded" clears after 3 seconds (fake timers): "shows 'Debt recorded' after a save and clears it after 3 seconds".
- [ ] [H] The real 3 seconds felt in a browser (the test uses fake timers).
- [x] [T] Focus returns to "Record a debt" after save and after Cancel: "returns focus to Record a debt after a successful save" and "...after Cancel".

## Mark as paid
- [x] [T] Confirmation shows name and amount: "shows the confirmation with the customer name and amount".
- [x] [T] Focus goes to "Not yet": "focuses Not yet when a confirmation opens".
- [x] [T] "Not yet" changes nothing and returns focus to that debt's button: "leaves the debt unpaid on Not yet..." and "returns focus to that debt's Mark as paid button after Not yet".
- [x] [T] "Yes, mark as paid" shows Paid, lowers the total, removes the button: "settles the debt on Yes and lowers the total owed by exactly that amount". Focus falls back to "Record a debt": "falls back to Record a debt after Yes...".
- [x] [T] "Debt marked as paid" clears after 3 seconds: "shows 'Debt marked as paid' and clears it after 3 seconds".
- [ ] [H] Real-time 3 seconds, and the look of the confirmation box.

## Other behaviour
- [x] [T] Tab switch during a notice causes no console warning: "causes no warning or error when unmounted with a pending notice". [C] The Debts view is conditionally rendered in `App.tsx`, so a tab switch unmounts it, and the view clears its timer on unmount. [H] Open the browser console and switch tabs during a notice to confirm. This also covers React StrictMode in the dev server, which the test does not run under.
- [~] [C] Daily summary matches the Debts tab: both call `totalOwed` on the same stack (`DailySummaryCardView.tsx` line 57, `DebtsCardView.tsx`). No test renders both views together. [H] Check the numbers match after each change.
- [x] [T] A Stack with no Debts card shows "Debts can't be shown because this shop has no Debts card.": "shows the missing-card message when there is no Debts card". [H] Reaching this state in the real app needs a Stack without a Debts card in IndexedDB. The starter stack always has one.
- [ ] [H] Reload keeps the debts. [C] `App.tsx` `onStackChange` sets the stack and queues `saveStack`, and the load effect reads the first saved stack. No test in this spec covers save and reload through IndexedDB. Needs a real browser (or a fake-indexeddb test, which would be a new dependency).

## Layout and look at 360px
- [~] [C] No sideways scroll: `DebtsCardView.css` uses column flex, `min-width: 0` and `overflow-wrap: anywhere` on rows and the total. [H] Check at 360px width. I did not check the Card, TabBar or Field CSS for overflow.
- [~] [C] 44px tap areas: `Button.css` and `Field.css` set `min-height: var(--tap-min)`, and `--tap-min` is 44px in `theme.css`. All Debts buttons use the shared `Button`. [H] Measure in dev tools.
- [~] [C] Visible focus outline: `theme.css` has one `:focus-visible` rule (3px solid `--color-focus`, offset 2px), and `DebtsCardView.css` adds no override. [H] Tab through the view in both light and midnight mode and check the outline is visible.

## Summary
Behaviour is well covered by automated tests. Layout, tap size, focus
outline, Daily summary agreement, console cleanliness and reload persistence
still need a human in a browser (items marked [H] or [~]).
