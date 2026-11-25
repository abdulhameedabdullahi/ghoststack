# Requirements Document

## Introduction

**Feature:** PWA offline support and stack backup.

This spec makes GhostStack installable and fully usable with no internet, and lets the owner keep a safe copy of a shop on a file.

Part one is the PWA. A web app manifest and a service worker precache the built app, including the bundled pixel font, so the app loads offline. The owner sees a small "Ready for offline use" notice the first time caching finishes. When a new version is ready, the owner sees "A new version is ready. Reload to update." and the app never reloads by itself, so unsaved work is never lost.

Part two is backup. In Builder mode, "Save a backup" downloads the current Stack as a `.json` file. "Load a backup" reads a chosen file, checks it, and saves it as a NEW stack with a fresh id and " (restored)" added to the name. It never overwrites an existing stack. On success the restored stack opens in Play mode.

It adds two pure functions in `src/domain-ui/`: `serializeStack` and `parseBackup`. `parseBackup` reuses the existing `isStack` check from `src/storage/isStack.ts` without changing it. Backup files add a small wrapper with a backup version so future changes can be detected. The Stack `schemaVersion` stays at 1.

It builds on `ghoststack-foundation`, `app-shell-stock-card`, `sales-and-daily-summary`, `debts-card-ui` and `builder-mode-and-starter-stacks`, and follows `product.md`, `tech.md`, `design-retro.md`, `plain-language.md` and `money-rules.md` (invariant 6: exporting then importing returns identical data, apart from the id and the name suffix that this spec adds on purpose). Existing behaviour and existing tests do not change. Adding `vite-plugin-pwa` (or Workbox) as a dev dependency is approved.

**Out of scope:** cloud sync, accounts, sharing links, background sync, merging a backup into an existing stack, deleting stacks, automatic backups, push notifications, backup encryption.

## Glossary

- **Stack:** one shop's set of cards and their data, as defined by `ghoststack-foundation`. Has an `id`, a `name`, a `currency`, a `schemaVersion` and an ordered list of cards.
- **Stack_Checker:** the existing `isStack` function in `src/storage/isStack.ts`.
- **Name:** a shop name. A valid Name has between 1 and 40 characters after trimming spaces at both ends. Length is the JavaScript string length of the trimmed text.
- **Name_Limit:** the 40-character maximum length of a Name.
- **Restored_Suffix:** the text " (restored)", with one leading space.
- **Result:** the project's return shape for functions that can fail. It holds either a value or an error with a code and a plain-language message.
- **Backup_File:** a UTF-8 text file in JSON format that holds one Stack inside a wrapper with a format tag and a Backup_Version.
- **Backup_Version:** the whole number in a Backup_File that says which backup layout the file uses. The first version is 1.
- **Size_Limit:** 5 MB, which is 5 × 1024 × 1024 bytes of UTF-8 text.
- **serializeStack:** the pure function in `src/domain-ui/` that takes a Stack and returns a Backup_File text.
- **parseBackup:** the pure function in `src/domain-ui/` that takes Backup_File text and a fresh id and returns a Result holding a validated Stack or an error.
- **Backup_Error:** an error Result from `parseBackup`. Codes are `TOO_LARGE`, `NOT_JSON`, `NOT_A_BACKUP`, `WRONG_BACKUP_VERSION`, `WRONG_STACK_VERSION` and `INVALID_STACK`. Each has a plain-language message that says what went wrong and what to do next.
- **Restored_Stack:** the Stack returned by `parseBackup`. It has the fresh id, a Name made from the file's Name plus the Restored_Suffix, and every other field deep-equal to the file's Stack.
- **Backup_File_Name:** the name of a downloaded Backup_File, made from the shop name and the date, for example `provisions-shop-2026-10-31.json`.
- **App_Shell:** the React component in `src/App.tsx` that loads the Stack, saves changes and shows the screens.
- **Builder_Panel:** the React screen shown in Builder mode.
- **Backup_Controls:** the "Save a backup" button and the "Load a backup" file chooser, shown in the Builder_Panel.
- **Backup_Message:** the text shown near the Backup_Controls after a save or a load. A success message uses `role="status"`. An error message uses `role="alert"`.
- **Play mode / Builder mode:** the everyday view and the view where the owner changes the shape of the Stack, as defined by `builder-mode-and-starter-stacks`.
- **Storage layer:** the code in `src/storage/` that saves and loads Stacks with IndexedDB, including `saveStack`, `loadStack` and `listStacks`.
- **Save_Queue:** the App_Shell's existing mechanism that finishes pending saves in order.
- **Manifest:** the web app manifest file that tells the phone how to install GhostStack.
- **Service_Worker:** the script that stores the built app files on the device and serves them when there is no internet.
- **Precache:** the list of built files (page, scripts, styles, icons, manifest and the bundled font) that the Service_Worker stores at install time.
- **Offline_Notice:** the small message "Ready for offline use".
- **Update_Notice:** the small message "A new version is ready. Reload to update." with a "Reload" button.
- **Notice_Area:** the one place in the App_Shell where the Offline_Notice and the Update_Notice appear.
- **Maskable_Icon:** an icon whose important part sits inside the central safe area, so phones can crop it into a circle or a rounded square.
- **Offline_Test_List:** the manual test list in `docs/OFFLINE_TESTING.md`.
- **Opener:** the control that opened a Dialog or started an action, which should get focus back afterwards.
- **Theme variables:** the CSS variables in `src/components/theme.css` that hold all colours, fonts and spacing.

## Requirements

### Requirement 1: Web app manifest and icons

**User Story:** As a shop owner, I want to install GhostStack on my phone like an app, so that I can open it from my home screen.

#### Acceptance Criteria

1. THE Manifest SHALL set the app `name` to "GhostStack" and a `short_name` that fits under a home-screen icon.
2. THE Manifest SHALL set `display` to `standalone`, `start_url` and `scope` to the app root, and a `theme_color` and `background_color` that match values in the Theme variables.
3. THE Manifest SHALL list a 192×192 PNG icon, a 512×512 PNG icon and a Maskable_Icon with `purpose` set to `maskable`.
4. THE icons SHALL show a simple original ghost drawn in the retro black and white style, with no third-party artwork.
5. THE Maskable_Icon SHALL keep the ghost inside the central 80% of the image.
6. THE `index.html` page SHALL link the Manifest, SHALL set a `theme-color` meta tag and SHALL link an icon for iPhone home screens.
7. THE icon files and the Manifest SHALL be served from `public/` or generated at build time, and SHALL be part of the Precache.
8. THE Manifest SHALL use simple English text and SHALL contain no cloud, account or payment wording.

### Requirement 2: Offline loading

**User Story:** As a market trader with patchy internet, I want GhostStack to open with no signal, so that I can keep working all day.

#### Acceptance Criteria

1. THE Service_Worker SHALL precache the built page, scripts, styles, Manifest, icons and the bundled pixel font.
2. WHEN the app has loaded once with internet and the device then goes offline, THE Service_Worker SHALL serve every Precache file so that the app opens with no network request failing.
3. WHEN the device is offline and the owner reloads the page, THE App_Shell SHALL show the saved stacks from IndexedDB, with the pixel font in use.
4. WHEN the owner opens a page address inside the app scope while offline, THE Service_Worker SHALL serve the app page.
5. THE Service_Worker SHALL send no request to any server other than the one that hosts the app.
6. THE Service_Worker SHALL register only in a production build, and SHALL leave the dev server and the test suite without a Service_Worker.
7. IF the browser does not support service workers, THEN THE App_Shell SHALL keep working as it does today and SHALL show no error.
8. IF the Service_Worker fails to register, THEN THE App_Shell SHALL keep working as it does today and SHALL show no error to the owner.

### Requirement 3: Ready for offline use notice

**User Story:** As a shop owner, I want to know when the app is safe to use with no internet, so that I can trust it.

#### Acceptance Criteria

1. WHEN the Service_Worker finishes caching the Precache for the first time on a device, THE App_Shell SHALL show the Offline_Notice in the Notice_Area.
2. THE Offline_Notice SHALL read "Ready for offline use" and SHALL have a "Close" button that is at least 44px high and 44px wide.
3. WHEN the owner activates "Close", THE App_Shell SHALL remove the Offline_Notice.
4. WHEN the Offline_Notice has been shown once on a device, THE App_Shell SHALL record that fact in `localStorage`, with every read and write wrapped in try/catch, and SHALL NOT show the Offline_Notice again on that device.
5. WHEN the Service_Worker installs a later version of the app, THE App_Shell SHALL NOT show the Offline_Notice again.
6. THE Offline_Notice SHALL use `role="status"` and SHALL NOT take keyboard focus away from the control the owner is using.
7. THE Offline_Notice SHALL show an icon together with its text and SHALL NOT rely on colour alone.

### Requirement 4: Update without losing work

**User Story:** As a shop owner, I want to choose when the app updates, so that I never lose a sale I am entering.

#### Acceptance Criteria

1. WHEN a new version of the app has been downloaded and is waiting, THE App_Shell SHALL show the Update_Notice in the Notice_Area.
2. THE Update_Notice SHALL read "A new version is ready. Reload to update." and SHALL have a "Reload" button that is at least 44px high and 44px wide.
3. WHILE the Update_Notice is shown, THE App_Shell SHALL keep every open form, every typed value and the current screen as they are.
4. THE App_Shell SHALL NOT reload the page or activate the waiting Service_Worker until the owner activates "Reload".
5. WHEN the owner activates "Reload", THE App_Shell SHALL wait for the Save_Queue to finish, then activate the waiting Service_Worker and reload the page.
6. IF the Save_Queue reports a save error when the owner activates "Reload", THEN THE App_Shell SHALL keep the page open and SHALL show the save error message.
7. THE Update_Notice SHALL use `role="status"` and SHALL NOT take keyboard focus away from the control the owner is using.
8. WHEN the owner ignores the Update_Notice, THE App_Shell SHALL keep working on the current version with no limit on time.
9. IF the Offline_Notice and the Update_Notice are both due, THEN THE App_Shell SHALL show only the Update_Notice.

### Requirement 5: Core work stays correct offline

**User Story:** As a shop owner, I want to record sales and debts with no internet, so that my notebook replacement never fails when the signal does.

#### Acceptance Criteria

1. WHILE the device is offline, THE App_Shell SHALL let the owner add items, record sales, record debts, mark debts paid and see today's totals with the same results as when the device is online.
2. WHILE the device is offline, THE Storage layer SHALL save and load Stacks in IndexedDB with the same behaviour as when the device is online.
3. WHILE the device is offline, THE Backup_Controls SHALL work, because neither "Save a backup" nor "Load a backup" uses the network.
4. THE App_Shell SHALL NOT call `fetch` or open any network connection to run a feature of this spec.
5. THE Service_Worker SHALL NOT cache, read or write any IndexedDB data.

### Requirement 6: Serialize a stack to a backup

**User Story:** As a shop owner, I want my stack turned into a file I can keep, so that I can restore it if my phone is lost.

#### Acceptance Criteria

1. THE `serializeStack` function SHALL take a Stack and return a string of JSON text.
2. THE `serializeStack` function SHALL write a wrapper with a `format` field set to "ghoststack-backup", a `backupVersion` field set to 1 and a `stack` field that holds the Stack.
3. THE `serializeStack` function SHALL write the Stack with every field it has, including `hidden` flags and the Stack `schemaVersion`.
4. THE `serializeStack` function SHALL write indented JSON text so that the owner can open the file in a text editor.
5. THE `serializeStack` function SHALL be pure: same input, same output, no clock read, no id made, no storage call, no change to the input.
6. THE `serializeStack` function SHALL return text that parses as JSON.
7. THE `serializeStack` function SHALL return text that contains no `NaN` number and no `undefined` value.
8. WHEN the input Stack is deeply frozen, THE `serializeStack` function SHALL return its text without throwing and without changing the input.
9. THE `serializeStack` function SHALL write money values as whole numbers, exactly as they are held in the Stack.
10. THE `src/domain-ui/` module SHALL provide a pure `backupFileName` function that takes a shop name and a date given as year, month and day numbers, and returns a Backup_File_Name.
11. THE `backupFileName` function SHALL lower-case the shop name, replace each run of characters other than letters, digits and hyphens with one hyphen, remove hyphens at both ends, and join the result, a hyphen and the date as YYYY-MM-DD with a `.json` ending.
12. IF the shop name has no letters or digits after cleaning, THEN THE `backupFileName` function SHALL use "shop" in place of the shop name.
13. THE `backupFileName` function SHALL return a name of at most 60 characters before the `.json` ending, by cutting the shop part, never the date.

### Requirement 7: Save a backup button

**User Story:** As a shop owner, I want one button that saves my shop to a file, so that I can keep a copy outside the app.

#### Acceptance Criteria

1. WHILE the App_Shell is in Builder mode, THE Builder_Panel SHALL show a "Save a backup" button in the Backup_Controls.
2. WHILE the App_Shell is in Play mode, THE App_Shell SHALL NOT show the Backup_Controls.
3. WHEN the owner activates "Save a backup", THE App_Shell SHALL wait for the Save_Queue to finish, then make the text with `serializeStack` for the current Stack and start a download of that text as a `.json` file named with `backupFileName`.
4. THE App_Shell SHALL read the current date in the UI layer and pass it to `backupFileName`.
5. WHEN the download has started, THE App_Shell SHALL show the Backup_Message "Backup saved. Keep the file somewhere safe, like your email or a memory card." and SHALL keep focus on the "Save a backup" button.
6. WHEN the download has started, THE App_Shell SHALL release any temporary file address it made for the download.
7. IF the download cannot start, THEN THE App_Shell SHALL show a Backup_Message that says the backup could not be saved and tells the owner to try again, and SHALL leave the Stack and storage unchanged.
8. THE "Save a backup" button SHALL change no data in the Stack or in storage.
9. THE Backup_Message SHALL use the shop name only inside the file name, and SHALL NOT include any money amount.

### Requirement 8: Parse and check a backup

**User Story:** As a shop owner, I want a damaged or wrong file to be refused with a clear message, so that a bad file never breaks my shop.

#### Acceptance Criteria

1. THE `parseBackup` function SHALL take Backup_File text and a fresh id string and return a Result holding either a Restored_Stack or a Backup_Error.
2. IF the text is longer than the Size_Limit in UTF-8 bytes, THEN THE `parseBackup` function SHALL return a `TOO_LARGE` error before it parses the text, with a message that says the file is too big and that a GhostStack backup is much smaller.
3. IF the text is not valid JSON, THEN THE `parseBackup` function SHALL return a `NOT_JSON` error with a message that says the file is not a GhostStack backup and tells the owner to choose a file saved with "Save a backup".
4. IF the parsed value is not an object with `format` equal to "ghoststack-backup" and a `stack` field, THEN THE `parseBackup` function SHALL return a `NOT_A_BACKUP` error with a plain-language message.
5. IF the `backupVersion` is not 1, THEN THE `parseBackup` function SHALL return a `WRONG_BACKUP_VERSION` error with a message that says the backup was made by a different version of GhostStack and tells the owner to update the app or use a newer backup.
6. IF the `stack` field is an object whose `schemaVersion` is not 1, THEN THE `parseBackup` function SHALL return a `WRONG_STACK_VERSION` error with a plain-language message.
7. IF the Stack_Checker rejects the `stack` field, THEN THE `parseBackup` function SHALL return an `INVALID_STACK` error with a message that says the backup is damaged and tells the owner to try another backup file.
8. THE `parseBackup` function SHALL use the existing Stack_Checker for the shape check and SHALL NOT change the Stack_Checker.
9. THE `parseBackup` function SHALL return an error Result for every input it cannot accept, and SHALL NOT throw for any string input, including empty text, text with only spaces, very deep nesting, and text that holds `__proto__` keys.
10. THE `parseBackup` function SHALL check the checks in the order of acceptance criteria 2 to 7, so that the same input always gives the same error code.
11. THE Backup_Error messages SHALL say what went wrong and what to do next, in short sentences with everyday words, and SHALL NOT contain the word "kobo", the word "schema", a file path, or a stack trace.
12. THE `parseBackup` function SHALL be pure: same inputs, same output, no clock read, no id made, no storage call.

### Requirement 9: Restored stack identity and name

**User Story:** As a shop owner, I want a restored shop to be clearly marked and separate, so that I never mix it up with my live shop.

#### Acceptance Criteria

1. WHEN the text is accepted, THE `parseBackup` function SHALL return a Restored_Stack whose `id` is the fresh id passed in.
2. WHEN the text is accepted, THE `parseBackup` function SHALL return a Restored_Stack whose `currency`, `schemaVersion` and cards, with every Item, Sale, Debt, card id, card title and `hidden` flag, are deep-equal to the file's Stack.
3. WHEN the text is accepted, THE `parseBackup` function SHALL return a Restored_Stack whose `name` is the file's name, trimmed and, where needed, cut short, followed by the Restored_Suffix.
4. THE `parseBackup` function SHALL return a Restored_Stack whose `name` has at most 40 characters after trimming, by cutting the file's name before the Restored_Suffix is added, so that the Restored_Suffix always stays complete.
5. IF the file's name is empty after trimming, THEN THE `parseBackup` function SHALL return the name "My shop (restored)".
6. IF cutting the file's name leaves spaces at the end of the cut text, THEN THE `parseBackup` function SHALL remove those spaces before it adds the Restored_Suffix.
7. THE `parseBackup` function SHALL return a Restored_Stack that the Stack_Checker accepts.
8. THE `parseBackup` function SHALL NOT change the Backup_File text, and SHALL NOT return an object that shares nested objects with any caller-owned value.

### Requirement 10: Load a backup button

**User Story:** As a shop owner, I want to choose a backup file and get my shop back, so that a lost phone does not end my records.

#### Acceptance Criteria

1. WHILE the App_Shell is in Builder mode, THE Builder_Panel SHALL show a "Load a backup" file chooser in the Backup_Controls, with a visible text label "Load a backup" joined to the file input.
2. THE file chooser SHALL accept files with the `.json` ending and the JSON type, and SHALL leave the owner free to pick any other file, which `parseBackup` then rejects.
3. WHEN the owner chooses a file larger than the Size_Limit, THE App_Shell SHALL show the `TOO_LARGE` message without reading the file into memory.
4. WHEN the owner chooses a file within the Size_Limit, THE App_Shell SHALL read it as text, make a fresh id with `crypto.randomUUID`, call `parseBackup`, and wait for the Save_Queue to finish.
5. IF the fresh id equals the id of any saved Stack, THEN THE App_Shell SHALL make another fresh id until it is different.
6. WHEN `parseBackup` returns a Restored_Stack, THE App_Shell SHALL save it once with `saveStack` as a new record, refresh the saved stack list, open it in Play mode and select its first visible card.
7. WHEN the Restored_Stack has been saved and opened, THE App_Shell SHALL move keyboard focus to the first tab in the Tab_Bar and show a Backup_Message "Backup loaded. Your shop is open as a new stack." in the Notice_Area.
8. IF `parseBackup` returns a Backup_Error, THEN THE App_Shell SHALL show the error's message in a Backup_Message, SHALL save nothing, SHALL stay in Builder mode, SHALL keep the current Stack open and SHALL move keyboard focus to the Backup_Message.
9. IF the file cannot be read, THEN THE App_Shell SHALL show a Backup_Message that says the file could not be read and tells the owner to try again, SHALL save nothing, SHALL stay in Builder mode and SHALL move keyboard focus to the Backup_Message.
10. IF `saveStack` fails, THEN THE App_Shell SHALL show the existing plain-language save error, SHALL stay in Builder mode with the current Stack open, SHALL keep every saved Stack unchanged and SHALL move keyboard focus to the Backup_Message.
11. WHEN the owner closes the file picker without choosing a file, THE App_Shell SHALL change nothing and SHALL show no message.
12. WHEN a file attempt has finished, THE App_Shell SHALL clear the file input value, so that the owner can choose the same file again.
13. WHILE a file is being read or saved, THE App_Shell SHALL mark the "Load a backup" chooser as busy and SHALL ignore a second file choice until the first one finishes.
14. WHEN the restored stack opens, THE Stack_Picker SHALL list it by its Restored_Stack name, and the last-opened stack id in `localStorage` SHALL be the Restored_Stack id.

### Requirement 11: A backup never overwrites existing data

**User Story:** As a shop owner, I want loading a backup to be safe, so that I can never lose my current shop by loading an old file.

#### Acceptance Criteria

1. THE App_Shell SHALL save every Restored_Stack under its fresh id and SHALL NOT write to any existing Stack record.
2. WHEN a Restored_Stack is saved, THE Storage layer SHALL hold every previously saved Stack deep-equal to what it held before.
3. WHEN a Restored_Stack is saved, THE Storage layer SHALL hold one more Stack than before.
4. WHEN the file holds a Stack with the same id as a saved Stack, THE App_Shell SHALL still save the Restored_Stack under the fresh id and SHALL keep the saved Stack as it was.
5. WHEN the same Backup_File is loaded twice, THE App_Shell SHALL save two separate Stacks with two different ids.
6. THE "Load a backup" action SHALL change no Stack other than the new Restored_Stack, and SHALL change no setting other than the last-opened stack id.
7. IF the App_Shell fails after the Restored_Stack is saved but before it opens, THEN THE App_Shell SHALL keep the Restored_Stack in storage and SHALL show the Stack_Picker entry for it on the next list refresh.

### Requirement 12: Plain wording and accessibility

**User Story:** As an owner on a small phone, I want big controls and simple words, so that I can use the tool easily.

#### Acceptance Criteria

1. THE "Save a backup" button, the "Load a backup" file chooser, the "Reload" button and the "Close" button of the Offline_Notice SHALL each have a tap target at least 44px high and 44px wide.
2. WHEN a control from this spec has keyboard focus, THE control SHALL show a visible focus outline.
3. THE "Load a backup" label SHALL be visible text and SHALL be joined to the file input so that screen readers read the label.
4. THE Backup_Message and every notice SHALL show an icon or text together with colour to show success or error, and SHALL NOT rely on colour alone.
5. THE screens and messages from this spec SHALL use simple English, short sentences and everyday words, and SHALL NOT contain the word "kobo", "schema", "JSON parse", "serialize", "payload" or "cache" in text shown to the owner.
6. WHERE spooky wording is used, THE wording SHALL stay light and optional and SHALL NOT change the meaning of any message.
7. THE new screens SHALL take all colours, fonts and spacing from the Theme variables and SHALL reuse the shared Button, Field and Card components.
8. THE new screens SHALL work on a screen 360px wide without sideways scrolling, in both the light and the midnight theme.
9. THE Backup_Controls SHALL show one main action per control and SHALL name the action in each control's accessible name.
10. THE Notice_Area SHALL NOT cover the Tab_Bar, a form or the Mode_Switch.

### Requirement 13: Offline test list

**User Story:** As a maintainer, I want a written manual test list for things automated tests cannot reach, so that offline behaviour is checked before each release.

#### Acceptance Criteria

1. THE project SHALL include the Offline_Test_List at `docs/OFFLINE_TESTING.md`.
2. THE Offline_Test_List SHALL include a "First load" test: open the production build with internet, wait for the Offline_Notice, and check that the notice shows once.
3. THE Offline_Test_List SHALL include an "Offline reload" test: turn off the network in the browser tools, reload the page, and check that the app, the saved stacks and the pixel font all appear.
4. THE Offline_Test_List SHALL include a "Record a sale offline" test: while offline, record a sale, reload, and check that the stock and the day's total are correct.
5. THE Offline_Test_List SHALL include an "Install on a phone" test: install from the browser menu on an Android phone and on an iPhone, open from the home screen, and check the name, the icon and the full-screen display, including the Maskable_Icon on Android.
6. THE Offline_Test_List SHALL include an "Update flow" test: build a changed version, reload the open app, check that the Update_Notice appears without a reload, type half a sale, activate "Reload", and check that saved data is intact.
7. THE Offline_Test_List SHALL include a "Backup and restore" test: save a backup, load it on a second device while offline, and check that a new stack named with the Restored_Suffix opens and the original is unchanged.
8. THE Offline_Test_List SHALL include a "Bad files" test: try a text file, a very large file and a JSON file from another app, and check that each shows a plain-language message.
9. THE Offline_Test_List SHALL give each test numbered steps and an expected result in simple English.

### Requirement 14: Property-based tests

**User Story:** As a maintainer, I want property-based tests for backup and restore, so that the numbers and the stack stay correct whatever the file holds.

#### Acceptance Criteria

1. THE test suite SHALL include a fast-check property that, for any valid Stack, `parseBackup(serializeStack(stack), freshId)` returns a Restored_Stack deep-equal to the original Stack in every field except `id` and the Restored_Suffix on `name`.
2. THE test suite SHALL include a fast-check property that, for any string that is not valid JSON, and for any JSON text whose Stack the Stack_Checker rejects, `parseBackup` returns an error Result and does not throw.
3. THE test suite SHALL include a fast-check property that, for any valid Stack and any fresh id, the Restored_Stack `name` never has more than 40 characters, always ends with the Restored_Suffix, and starts with the trimmed original name when that name has at most 29 characters.
4. THE test suite SHALL include a fast-check property, using the Storage layer with `fake-indexeddb`, that for any set of valid saved Stacks and any valid Backup_File, saving the Restored_Stack leaves every previously saved Stack deep-equal to before and adds exactly one Stack.
5. THE test suite SHALL include a fast-check property that, for any valid Stack whose text fields do not contain the words "undefined" or "NaN", the `serializeStack` output contains neither "undefined" nor "NaN".
6. THE test suite SHALL include a fast-check property that, for any deeply frozen valid Stack, `serializeStack` and `parseBackup` do not throw and do not change their input.
7. THE test suite SHALL include a fast-check property that, for any valid Stack, the `serializeStack` output parses as JSON and has `format` "ghoststack-backup", `backupVersion` 1 and a `stack` that is deep-equal to the input.
8. THE test suite SHALL include a fast-check property that, for any valid Stack, `parseBackup` returns a Stack the Stack_Checker accepts, with `id` equal to the fresh id passed in.
9. THE test suite SHALL include a fast-check property that, for any valid Stack, `serializeStack` returns the same text when called twice on the same input.
10. THE test suite SHALL include a fast-check property that, for any text longer than the Size_Limit, `parseBackup` returns `TOO_LARGE`, and for any valid backup text of at most the Size_Limit, `parseBackup` does not return `TOO_LARGE`.
11. THE test suite SHALL include a fast-check property that, for any valid Stack whose `backupVersion` or `schemaVersion` is changed to a value other than 1, `parseBackup` returns `WRONG_BACKUP_VERSION` or `WRONG_STACK_VERSION` respectively.
12. THE test suite SHALL include a fast-check property that, for any shop name string and any valid date, `backupFileName` returns a name that ends with the date and ".json", uses only lower-case letters, digits, hyphens and one dot, and has at most 60 characters before the ".json" ending.
13. THE test suite SHALL include a fast-check property that, for any valid Stack, the restored money totals (stock value, total of sales, total owed) equal the totals of the original Stack.
14. THE test suite SHALL run each property for at least 100 runs.

### Requirement 15: Unit and component tests

**User Story:** As a maintainer, I want example tests for the screens and the edge cases, so that the owner's flows keep working.

#### Acceptance Criteria

1. THE test suite SHALL include unit tests for `serializeStack`, `parseBackup` and `backupFileName` that cover each Backup_Error code, an empty file, a file with only spaces, a file of exactly the Size_Limit, a file one byte over the Size_Limit, a name of exactly 29, 30 and 40 characters, and an empty name.
2. THE test suite SHALL include testing-library component tests for the Backup_Controls that cover a successful save, a successful load, each failure message, focus after success, focus after failure, and choosing the same file twice.
3. THE test suite SHALL include a component test that a successful load opens the Restored_Stack in Play mode and leaves the earlier Stack in the Stack_Picker.
4. THE test suite SHALL include component tests for the Offline_Notice and the Update_Notice that cover showing once, closing, the "Reload" button waiting for the Save_Queue, and no focus theft.
5. THE test suite SHALL include a test that the service worker registration code does nothing in the test environment and does not throw when `navigator.serviceWorker` is missing.
6. THE test suite SHALL include a build check that the production build output contains the Manifest, the three icons, a Service_Worker file, and the pixel font file in the Precache list.
7. THE test suite SHALL include a test that the Manifest holds the required name, display mode and icon entries.

### Requirement 16: No change to existing behaviour

**User Story:** As a maintainer, I want this feature to be purely additive, so that nothing that works today breaks.

#### Acceptance Criteria

1. THE existing tests SHALL keep passing without edits.
2. THE Stack_Checker, the Storage layer functions, the domain functions and the Stack `schemaVersion` SHALL stay unchanged.
3. WHILE the App_Shell is in Play mode, THE App_Shell SHALL look and work as it does today, except for the Notice_Area that appears only when an Offline_Notice or an Update_Notice is due.
4. THE new pure functions SHALL live in `src/domain-ui/`, the file reading, download and storage steps SHALL live in the UI and storage code, and the service worker setup SHALL live in `vite.config.ts` and a small registration module, with no React code in `src/domain-ui/`.
5. THE only new package SHALL be `vite-plugin-pwa` or Workbox, added as a dev dependency, and THE project SHALL NOT add any other package without asking.
6. THE `npm run build` command SHALL still run `tsc --noEmit` and `vite build` and finish without errors.
