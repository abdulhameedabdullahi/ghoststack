# Manual check: builder mode and starter stacks

Task 23.3. This file was written without a real browser. Nothing here was checked by eye.

Status key:
- **Covered by automated test**: a test in the named file exercises it in jsdom (no real layout, no real focus rendering).
- **NEEDS MANUAL CHECK by the user**: no test covers it, or it needs real layout, themes or touch.
- **Code finding**: what a read of the CSS/TSX showed. This is not a visual check.

## Checklist

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | First run shows the Starter_Chooser and creates nothing until a pick | Covered by automated test `src/App.starter.test.tsx` ("shows the chooser and creates nothing on first run") | Also covers unreadable data showing the chooser and saving nothing. |
| 2 | Both starters open in Play mode | **NEEDS MANUAL CHECK by the user** | `App.starter.test.tsx` saves the farm stall Stack, but no test asserts that both starters land in Play mode with the first card selected. Try Provisions and Farm stall. |
| 3 | Sample items match the starter | Covered by automated test `src/App.starter.test.tsx` (farm stall saves only farm samples) and `src/domain-ui/sampleItems.test.ts` (lists, names, `addItem` acceptance) | The Provisions pick in the UI is not asserted in `App.starter.test.tsx`. Check it by hand. |
| 4 | Builder: rename shop | Covered by automated test `src/components/builder/BuilderPanel.test.tsx` (blank-name error in shop dialog) and `src/domain/cards.test.ts`, `cards.property.test.ts` | A successful rename through the full app is not tested. |
| 5 | Builder: rename a card | Covered by automated test `src/App.tabs.test.tsx` ("shows a renamed card's new tab label") and `BuilderPanel.test.tsx` | |
| 6 | Builder: move cards up and down | Covered by automated test `BuilderPanel.test.tsx` (first Move up and last Move down disabled) and `src/domain/cards.property.test.ts` (Properties 3 to 5) | |
| 7 | Builder: hide and show | Covered by automated test `BuilderPanel.test.tsx`, `src/App.tabs.test.tsx`, `src/App.hiddenSales.test.tsx` | |
| 8 | Focus stays put after move, hide, show | Covered by automated test `BuilderPanel.test.tsx` (same control after a move, opposite control at the end, Hide/Show) | jsdom focus only. Confirm on a real screen, ideally with a screen reader or keyboard. |
| 9 | Last visible card cannot be hidden | Covered by automated test `BuilderPanel.test.tsx` (Hide disabled with note) and `cards.property.test.ts` (Properties 7, 16) | |
| 10 | Play mode tabs follow the changes | Covered by automated test `src/App.tabs.test.tsx` | |
| 11 | Stack_Picker only with two or more stacks | Covered by automated test `src/components/StackPicker.test.tsx` and `src/App.picker.test.tsx` | The test with one stack checks the component, not the full app header. |
| 12 | Old saved stacks still open | Partly covered: `src/storage/isStack.hidden.test.ts` (no `hidden` key accepted) and `src/App.tabs.test.tsx` (default tabs with no flags) | **NEEDS MANUAL CHECK by the user** with data saved by the build before this spec (load the old build, save a stack, open the new build). No test uses a real old database. |
| 13 | No sideways scroll at 360px | **NEEDS MANUAL CHECK by the user** | See code findings below. |
| 14 | 44px tap areas at 360px | **NEEDS MANUAL CHECK by the user** (measure) | See code findings below. |
| 15 | Light theme | **NEEDS MANUAL CHECK by the user** | No test renders CSS. |
| 16 | Midnight theme (contrast, nothing unreadable) | **NEEDS MANUAL CHECK by the user** | `theme.css` defines `[data-theme="midnight"]`. Contrast was not measured. |
| 17 | Escape closes dialogs and returns focus | Covered by automated test `src/components/Dialog.test.tsx` (Escape closes, focus returns to opener, Tab loop, focus moves in) | jsdom only. Try it once in the real browser. |

## Code findings (read, not seen)

- `--tap-min: 44px` is defined in `src/components/theme.css`.
- `min-height`/`min-width: var(--tap-min)` is applied in: `Button.css`, `ModeSwitch.css`, `TabBar.css`, `Field.css` (inputs), `StackPicker.css` (select and name), `Dialog.css` (`.dialog .button`), `StarterChooser.css` (samples checkbox label row), `DebtsCardView.css`.
- All builder controls (Rename, Move up, Move down, Hide/Show, Rename shop, Choose a starter, Try again, Cancel) use the shared `Button`, so they inherit 44px. `BuilderCardRow.css` and `BuilderPanel.css` set no size of their own.
- The sample-items checkbox itself is a native input. The 44px applies to its label row, so the tap area is large but the box is small. Check by hand.
- Overflow guards exist: `min-width: 0` on cards, Field and select; `overflow-wrap: anywhere` on sales and debts rows; Tab_Bar wraps and truncates with an ellipsis. Whether the builder rows (four buttons per card) wrap cleanly at 360px was not confirmed. `BuilderCardRow.css` was not read in detail.
- No `overflow-x` rule was found anywhere, so no sideways scroll is being hidden. It also means a wide child would scroll the page.
- I did not check `index.html` for the viewport meta tag, and I did not check colour contrast in either theme.

## How to check by hand

1. Run `npm run dev`. Open browser dev tools, set the device width to 360px.
2. Clear site data. Confirm the Starter_Chooser shows and nothing is saved (Application tab, IndexedDB) until you pick.
3. Pick each starter (with and without sample items). Confirm Play mode opens on the first card.
4. In Builder mode, run through rename, move, hide, show with the keyboard. Watch where focus lands.
5. Create a second stack from "Choose a starter". Confirm the picker appears.
6. In each theme (toggle "Midnight mode"), scroll the page sideways and inspect button heights (at least 44px).
7. Open a rename dialog. Press Escape. Confirm focus returns to the button that opened it.
8. Old data: serve the previous commit's build, save a stack, then open the new build on the same origin.

## Result

Not done. Rows marked NEEDS MANUAL CHECK are open. Task 23.3 should stay unchecked until the user has done them and recorded the result here.
