# GhostStack screenshots list

This is a list of screens to capture by hand for the demo and the README. It needs no script and no new package.

Save every file in `docs/screenshots/`. Use this file name form:

`NN-screen-name-WIDTH-THEME.png`

- `NN` is the screen number below, with two digits.
- `WIDTH` is `360` or `768`.
- `THEME` is `light` or `midnight`.

Each key screen needs four files: 360 light, 360 midnight, 768 light and 768 midnight.

## Setup

1. Run the app with `npm run dev`. Open the address it shows in Chrome or Edge.
2. Open the browser developer tools (press F12).
3. Turn on the device toolbar (press Ctrl+Shift+M). Choose "Responsive".
4. Type `360` in the width box for the small screen. Type `768` for the medium screen. Pick any height.
5. To capture a screen, open the developer tools menu (Ctrl+Shift+P) and run "Capture screenshot". Or use the camera icon in the device toolbar.
6. Turn on Midnight mode. Press the button "Midnight mode: off". It then reads "Midnight mode: on". Press it again to go back to light. The app remembers the choice.
7. To start with sample data, open the starter chooser and keep the box "Add sample items" ticked. Then press "Use Provisions shop".
8. To see the starter chooser again, clear the site data. In the developer tools, open Application, then Storage, then press "Clear site data". Then reload.
9. Keep "reduced motion" off. The "Sale recorded" animation does not play when it is on.
   - Windows: Settings, Accessibility, Visual effects, turn "Animation effects" on.
   - macOS: System Settings, Accessibility, Display, turn "Reduce motion" off.
   - In Chrome developer tools: Ctrl+Shift+P, run "Show Rendering", and set "Emulate CSS media feature prefers-reduced-motion" to "No emulation".
10. After you change the width or the theme, reload the page before you capture.

## Screens

### 01. Starter chooser

- Files: `01-starter-chooser-360-light.png`, `01-starter-chooser-360-midnight.png`, `01-starter-chooser-768-light.png`, `01-starter-chooser-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Play (no shop exists yet)

Steps:
1. Clear the site data and reload (setup step 8).
2. Set the width and the theme.
3. Check that you see the ghost, the heading "Choose a starter", the box "Add sample items", and the two cards "Provisions shop" and "Farm produce stall".
4. Capture the page.

### 02. Stock card with items

- Files: `02-stock-with-items-360-light.png`, `02-stock-with-items-360-midnight.png`, `02-stock-with-items-768-light.png`, `02-stock-with-items-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Play

Steps:
1. Start from the starter chooser. Keep "Add sample items" ticked and press "Use Provisions shop".
2. Press the "▸ Play" button if it is not current.
3. Open the first tab, "Stock".
4. Check that the list shows items, each with "Record a sale", "Edit" and the button "Add an item" above the list.
5. Capture the page.

### 03. Stock card empty state

- Files: `03-stock-empty-360-light.png`, `03-stock-empty-360-midnight.png`, `03-stock-empty-768-light.png`, `03-stock-empty-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Play

Steps:
1. Clear the site data and reload.
2. Untick "Add sample items".
3. Press "Use Provisions shop".
4. Open the "Stock" tab in Play mode.
5. Check that you see the ghost, "You have no items yet.", "Raise your first one!" and the button "Add an item".
6. Capture the page.

### 04. "Sale recorded" notice

- Files: `04-sale-recorded-360-light.png`, `04-sale-recorded-360-midnight.png`, `04-sale-recorded-768-light.png`, `04-sale-recorded-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Play

Steps:
1. Load the shop with sample items (screen 02). Make sure "reduced motion" is off.
2. On the "Stock" tab, press "Record a sale" on one item.
3. Leave the quantity at 1 and press "Save".
4. Capture the page within 3 seconds. The words "Sale recorded" show above the list, then go away.
5. Repeat for each size and theme. For each file, record a new sale first.

### 05. Sales log

- Files: `05-sales-log-360-light.png`, `05-sales-log-360-midnight.png`, `05-sales-log-768-light.png`, `05-sales-log-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Play

Steps:
1. Load the shop with sample items.
2. Record two or three sales on the "Stock" tab (screen 04).
3. Open the "Sales log" tab.
4. Check that the sales show in the list.
5. Capture the page.

For the empty version, use a shop with no sales. You can add `05b-sales-log-empty-360-light.png` if you want it. It shows "No sales yet." and "Your first sale will show up here."

### 06. Debts card

- Files: `06-debts-360-light.png`, `06-debts-360-midnight.png`, `06-debts-768-light.png`, `06-debts-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Play

Steps:
1. Load the shop with sample items.
2. Open the "Money owed to you" tab.
3. Press "Record a debt". Type a customer name and an amount. Press "Save". Add two debts.
4. Press "Mark as paid" on one debt, then "Yes, mark as paid".
5. Check that you see "Who owes you" and "All debts".
6. Capture the page.

For the empty version, use a shop with no debts. It shows "You have no debts recorded yet." and "Nobody owes you anything right now." You can add `06b-debts-empty-360-light.png`.

### 07. Daily summary

- Files: `07-daily-summary-360-light.png`, `07-daily-summary-360-midnight.png`, `07-daily-summary-768-light.png`, `07-daily-summary-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Play

Steps:
1. Load the shop with sample items. Record a few sales and a debt.
2. Open the "Daily summary" tab.
3. Check that today's totals show.
4. Capture the page.

### 08. Builder mode

- Files: `08-builder-360-light.png`, `08-builder-360-midnight.png`, `08-builder-768-light.png`, `08-builder-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Builder

Steps:
1. Load the shop with sample items.
2. Press "🛠 Builder" in the mode switch. It shows "(current)".
3. Check that you see the shop name, the button "Rename shop", the list of cards and the button "Choose a starter".
4. Capture the page.

### 09. Backup controls

- Files: `09-backup-controls-360-light.png`, `09-backup-controls-360-midnight.png`, `09-backup-controls-768-light.png`, `09-backup-controls-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Builder

Steps:
1. Switch to Builder mode (screen 08).
2. Scroll down to the bottom of the page.
3. Check that you see the section with "Save a backup", "Load a backup" and the short tip.
4. Capture the page. Make sure the whole section is in the picture.
5. Optional: press "Save a backup" and capture the message that shows.

### 10. Update notice

- Files: `10-update-notice-360-light.png`, `10-update-notice-360-midnight.png`, `10-update-notice-768-light.png`, `10-update-notice-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Play

The notice only shows in a built app, not in `npm run dev`.

Steps:
1. Run `npm run build`, then `npm run preview`. Open the address it shows.
2. Load the app once and wait for it to be ready. Then stop the preview.
3. Change one small thing in the app, for example a word in a comment or a number. Run `npm run build` again and `npm run preview`.
4. In the first browser tab, reload the page. Wait a few seconds.
5. Check that you see "A new version is ready. Reload to update." with the button "Reload".
6. Capture the page. Do not press "Reload" before you capture.

### 11. Offline notice

- Files: `11-offline-notice-360-light.png`, `11-offline-notice-360-midnight.png`, `11-offline-notice-768-light.png`, `11-offline-notice-768-midnight.png`
- Width: 360 and 768
- Theme: light and midnight
- Mode: Play

The notice only shows in a built app, and only the first time it is ready for offline use.

Steps:
1. Run `npm run build`, then `npm run preview`.
2. Clear the site data (setup step 8) so the app counts as a first visit.
3. Reload and wait a few seconds.
4. Check that you see "Ready for offline use" with the button "Close".
5. Capture the page before you press "Close".
6. To see it again for the next file, clear the site data and reload.

## Final check

1. Count the files in `docs/screenshots/`. Each screen above needs four files.
2. Open each picture. Check that nothing is cut off and that there is no sideways scrolling.
3. Check that the file names follow `NN-screen-name-WIDTH-THEME.png`.
