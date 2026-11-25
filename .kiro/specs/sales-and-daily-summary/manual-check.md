# Manual check (task 11.3)

**Status: NOT done in a browser.** I could not drive a real browser. Every item below was checked by reading the code (and, where noted, the existing automated tests). "Code review OK" means the code looks right. It does not mean I saw it work on screen. A human must still tick every item in a browser (`npm run dev`, 360px wide viewport, Chrome DevTools device mode is fine).

Files read: `src/App.tsx`, `src/components/TabBar.tsx` and `.css`, `src/components/theme.css`, `src/components/cards/StockCardView.tsx`, `SaleForm.tsx`, `ItemRow.tsx`, `SalesLogCardView.tsx`, `DailySummaryCardView.tsx`.

Legend: **CR** = code review OK, **HUMAN** = still needs a person in a browser.

## Tabs
| Item | Result |
|---|---|
| Stock shows on first load | CR (`selectedTab` starts at `"stock"`). HUMAN to confirm. |
| Each tab shows only its card | CR (one `tabpanel`; other views not mounted). HUMAN. |
| Debts placeholder | CR ("Coming soon: a Debts card view."). HUMAN. |
| Selected marker, not colour only | CR (`▸` span plus `aria-selected`; colour change is extra). HUMAN to see it. |
| Left/Right wrap | CR (`index === 0 ? last`, `index === last ? 0`). HUMAN. |
| Home / End | CR (first / last). HUMAN. |
| Focus moves with selection | CR (`preventDefault`, `onSelect`, then `tabRefs.current[next]?.focus()`). HUMAN. |
| Visible focus outline | CR (shared `:focus-visible` 3px outline in `theme.css`; TabBar adds no override). HUMAN. |
| 44px targets at 360px, no sideways scroll | CR for `min-height`/`min-width: var(--tap-min)` (44px) and `flex-wrap: wrap`. Actual width/overflow at 360px is **HUMAN only**. |
| Tab and panel ids linked | CR (`tab-{id}` / `panel-{id}`, `aria-controls`, `aria-labelledby`). Caveat: `aria-controls` on non-selected tabs points to a panel id that is not in the DOM, since only the selected panel renders. Harmless but worth knowing. HUMAN with a screen reader if wanted. |

## Record a sale
| Item | Result |
|---|---|
| Form opens with 1 | CR (`openSaleForm` sets `quantityText: "1"`). HUMAN. |
| Valid quantity closes form and lowers quantity | CR (`recordSale` → `closeForm()` → `onStackChange`). `recordSale` itself is covered by unit/property tests. HUMAN for the on-screen list. |
| "Sale recorded" announced, clears | CR (always-present `<p aria-live="polite">`, 3s timeout). Actual screen-reader announcement and 3s clear are **HUMAN**. |
| No unmounted-component warning on tab switch | CR (timeout id in a ref, cleared in an unmount-only `useEffect` cleanup and before each new timeout). Note React 18+ no longer prints that warning anyway. HUMAN to check console. |
| Letters / decimal keep form, typed text, error | CR (`parseWholeNumber` failure sets `error` with the typed text; `SaleForm` state persists because the form stays mounted with the same key). HUMAN. |
| Quantity above stock → "Not enough in stock." | CR (`NOT_ENOUGH_STOCK` branch). HUMAN. |
| Cancel changes nothing | CR (`onCancel={closeForm}`, no domain call). HUMAN. |

## Missing Sales log card
CR: with `salesCardId === undefined`, `onRecordSale` is `undefined` (no button) and the message "Sales can't be recorded because this shop has no Sales log card." renders above the list. Caveat: the message only renders when the Stock card has at least one item (it is inside the non-empty branch). With an empty Stock card the user sees "You have no items yet." and no message. This is a small gap against the task wording only if the checker tests an empty card. HUMAN: needs a hand-made Stack without a Sales log card (for example edit the stored data in DevTools → IndexedDB).

## Sales log
| Item | Result |
|---|---|
| Newest first | CR (`salesNewestFirst`, unit and property tested). HUMAN. |
| Empty state | CR ("No sales yet."). HUMAN. |
| Name, quantity, total, time | CR (name, "Quantity:", "Total:", `toLocaleString()` time). HUMAN. |
| "Deleted item" after deleting an Item | CR (name map built from current Stock items; missing id → "Deleted item"). HUMAN. |

## Daily summary
| Item | Result |
|---|---|
| Total and profit match today's sales | CR (`dailyTotal` / `estimatedProfit` over `dayRange`; tested). HUMAN. |
| "Profit: ₦X" / "Loss: ₦X", no minus | CR (`formatSignedKobo`, unit and property tested). HUMAN. |
| Yesterday excluded | CR (range is `[start, end)`; tested). HUMAN. |
| Low-stock names or friendly message | CR. HUMAN. |
| Money owed | CR (`totalOwed(debts)`). HUMAN. |
| No builder controls | CR (view is read-only, no buttons). HUMAN. |
| Day range refresh on tab select | CR (`selectTab` calls `setDayRange(todayRange())` for `daily-summary`, including when already selected). HUMAN with a changed device date. |
| Day range refresh on visibility change | CR (`visibilitychange` listener, removed on cleanup). HUMAN: hide/show the page after the date changes. |

## Reload keeps sales
CR only: every change goes through `onStackChange` → `enqueueSave` → `saveStack`. Storage is covered by `stackStore` tests. HUMAN: record a sale, reload, open the Sales log.

## Findings
- No code defects found that block the checklist.
- Minor: the "no Sales log card" message is hidden when the Stock card has no items (see above).
- Minor: `aria-controls` references panels that are not mounted for unselected tabs.
