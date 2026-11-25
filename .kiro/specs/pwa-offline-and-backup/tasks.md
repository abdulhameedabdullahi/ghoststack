# Implementation Plan: PWA offline support and stack backup

## Overview

Build from the bottom up. First the install rule for `vite-plugin-pwa` (stop and report on a peer error), then the manifest constants, the icon generator and the Vite wiring, checked with `tsc` and a build. Next the pure backup code in `src/domain-ui/` (`cutText`, `serializeStack`, `parseBackup`, `backupFileName`), each correctness property as its own sub-task. Then the storage helper, the persist-once helper, service worker registration and notices, the backup and notice components, and the Builder panel change. After that `src/App.tsx` is wired in steps (one wave per step because they share one file). The build check script, the manual test document and a final run close the plan.

Properties 10 and 14 may use 25 runs. Every other property runs at least 100 cases. Existing tests are not edited. New cases go in new files. If an existing test fails after an edit to `src/App.tsx` or `BuilderPanel.tsx`, report it and do not patch the test.

## Tasks

- [x] 1. Install the PWA plugin
  - [x] 1.1 Run `npm install -D vite-plugin-pwa` and check the result
    - If npm reports a peer dependency error with the installed Vite (for example `ERESOLVE`), STOP. Copy the exact error message into the report. Do NOT use `--force`, `--legacy-peer-deps` or an `overrides` entry. Do NOT pick another package. Wait for the owner to decide, and do not start any later task.
    - If the install succeeds, confirm `vite-plugin-pwa` is under `devDependencies` and that no other package was added.
    - _Requirements: 16.5, 16.7_

- [x] 2. Manifest constants
  - [x] 2.1 Confirm the theme names, then create `src/pwa/manifestConfig.ts`
    - First open `src/components/theme.css` and confirm that `--color-title-bg` and `--color-bg` exist in the `:root` block (the light theme). Names confirmed when this plan was written: `--color-bg: #ffffff` and `--color-title-bg: #000000`. If they differ at implementation time, use the real values.
    - Export `BASE_PATH = "/"` and `MANIFEST` as in `design.md`. No imports. `theme_color` equals the light `--color-title-bg`. `background_color` equals the light `--color-bg`.
    - _Requirements: 1.1, 1.2, 1.3, 1.8, 1.9_
  - [x] 2.2 Write `src/pwa/manifestConfig.test.ts`
    - Check name "GhostStack", `display` "standalone", `start_url` and `scope` equal `BASE_PATH`, the 192 and 512 icons and one `maskable` icon. Read only the `:root` block of `theme.css` as text and check that `theme_color` and `background_color` equal its `--color-title-bg` and `--color-bg` values. Check that the text has no cloud, account or payment wording.
    - _Requirements: 1.1, 1.2, 1.3, 1.8, 15.7_

- [x] 3. Icons
  - [x] 3.1 Create `scripts/generate-icons.mjs`, add the `"icons"` script, run it and keep the PNGs
    - Use only `node:fs`, `node:path`, `node:url` and `node:zlib`. Draw an original 16×16 pixel ghost, black on white, scaled in whole blocks. Write `public/icons/icon-192.png`, `icon-512.png` and `icon-maskable-512.png` (ghost inside the central 80%). Encode PNG by hand (signature, `IHDR`, one `IDAT` from `zlib.deflateSync`, `IEND`, CRC-32 table). Output is deterministic.
    - Add `"icons": "node scripts/generate-icons.mjs"` to `package.json` scripts. Run `npm run icons`. Check each file starts with the PNG signature and has the right size. The three PNG files are committed (do not add `public/icons/` to `.gitignore`). Add no package.
    - _Requirements: 1.3, 1.4, 1.5, 1.7, 1.10_

- [x] 4. Vite wiring
  - [x] 4.1 Wire the plugin into `vite.config.ts`, `index.html` and `src/vite-env.d.ts`
    - `vite.config.ts`: import `VitePWA`, `BASE_PATH` and `MANIFEST`. Set `base`, plugin `scope` and `base`, `registerType: "prompt"`, `injectRegister: false`, `strategies: "generateSW"`, the `workbox` block (`globPatterns` with `woff2`, `navigateFallback`, `cleanupOutdatedCaches`), and `devOptions.enabled: false`. Set no `runtimeCaching`, `skipWaiting` or `clientsClaim`. Keep the existing `test` block as it is.
    - `index.html`: add the manifest link, the `theme-color` meta tag and the `apple-touch-icon` link.
    - `src/vite-env.d.ts`: add `/// <reference types="vite-plugin-pwa/client" />`.
    - _Requirements: 1.6, 1.7, 1.9, 2.1, 2.5, 2.6, 2.9, 5.5_
  - [x] 4.2 Run `npx tsc --noEmit` and `npm run build`, and check the output
    - Confirm `tsc` resolves the `./src/pwa/manifestConfig` import in `vite.config.ts`. If it does not, fix the import path and run again.
    - Confirm `dist/sw.js`, `dist/manifest.webmanifest` and `dist/icons/` exist, and that `dist/index.html` has exactly one `rel="manifest"` link. If the plugin added a second one, remove the one that is not needed.
    - Run `npx vitest run` and report any failure. Do not edit an existing test.
    - _Requirements: 1.6, 1.7, 16.1, 16.6_

- [x] 5. Checkpoint - Ensure all tests pass
  - Run `npx vitest run` and `npx tsc --noEmit`. Ask the user if questions arise.

- [x] 6. `cutText`
  - [x] 6.1 Create `src/domain-ui/cutText.ts`
    - Follow `design.md`. A cut never ends on the first half of a surrogate pair. `max <= 0` returns an empty string. No React, no storage.
    - _Requirements: 6.13, 9.9_
  - [x] 6.2 Write unit tests in `src/domain-ui/cutText.test.ts`
    - Text that already fits, `max` of 0, a cut that lands between the two halves of a pair, an emoji at the start, and plain ASCII.
    - _Requirements: 6.13, 9.9_
  - [x] 6.3 Write property test for `cutText`
    - File: `src/domain-ui/cutText.property.test.ts`. At least 100 runs. Use `fc.fullUnicodeString()` and `fc.string()`. Add the tag comment `// Feature: pwa-offline-and-backup, Property 12: cutText is a safe prefix`.
    - **Property 12: `cutText` is a safe prefix**
    - **Validates: Requirements 6.13, 9.9**

- [x] 7. Backup functions
  - [x] 7.1 Create `src/domain-ui/backup.ts` with the constants, types, `BACKUP_ERROR_MESSAGES`, `serializeStack` and `backupFileName`
    - Export `BACKUP_FORMAT`, `BACKUP_VERSION`, `SIZE_LIMIT`, `NAME_LIMIT`, `RESTORED_SUFFIX`, `RESTORED_NAME_FALLBACK`, `BackupFile`, `BackupErrorCode`, `BackupError` and `BackupResult`. Use the exact message texts in `design.md`. Do not touch `ERROR_MESSAGES` in `src/domain/result.ts`.
    - `serializeStack` writes two-space indented JSON. `backupFileName` follows the hyphen, `shop` fallback and 60-character rules and uses `cutText`. No React, no clock, no storage.
    - _Requirements: 6.1 to 6.13, 8.11, 12.5, 16.2, 16.4_
  - [x] 7.2 Add `parseBackup` to `src/domain-ui/backup.ts`
    - Run the six checks in the fixed order, using `utf8ByteLength`, `JSON.parse` in try/catch and an own-property helper. Reuse `isStack` from `src/storage/isStack.ts` unchanged. Add the card title check (blank or over 40 characters after trimming gives `INVALID_STACK`). Build the result with `rebuildCard` and `restoredName`, copying known fields only (no `Object.assign`, no spread of parsed data, no `structuredClone`). Never throw.
    - _Requirements: 8.1 to 8.14, 9.1 to 9.9, 16.2_
  - [x] 7.3 Write unit tests in `src/domain-ui/backup.test.ts`
    - Each Backup_Error code with a fixed input. Empty text, spaces only, exactly `SIZE_LIMIT` bytes (passes the size check), one byte over (`TOO_LARGE`), multibyte text counted in bytes. Names of 29, 30 and 40 characters and an empty name. A `__proto__` key. Deep nesting (`"[".repeat(100000)`) gives `NOT_JSON`. Card titles: `""`, `"   "`, 41 characters (rejected), 41 characters that trim to 40 (accepted), exactly 40 (accepted). `backupFileName("Provisions Shop", { year: 2026, month: 10, day: 31 })` equals `provisions-shop-2026-10-31.json`. A name with no letters or digits gives a `shop-…` name. A 100-character name stays within 60 characters before `.json`. Every `BACKUP_ERROR_MESSAGES` text has none of the words "kobo", "schema", "JSON parse", "serialize", "payload" or "cache".
    - _Requirements: 8.2 to 8.14, 9.3 to 9.6, 12.5, 15.1, 15.8_
  - [x] 7.4 Write property test for the backup round trip
    - File: `src/domain-ui/backup.property.test.ts`. Add the shared generators here: a valid Stack with all four card types, optional `hidden`, titles of 1 to 40 characters after trimming, money from `fc.nat` and `fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER })`, names from `fc.string()` and `fc.fullUnicodeString()` and lengths around 29, 30, 40 and 41, no `-0`. Add a `deepFreeze` helper. Reuse an existing Stack generator if one fits. At least 100 runs. Tag comment: `// Feature: pwa-offline-and-backup, Property 1: Backup round trip`.
    - **Property 1: Backup round trip**
    - **Validates: Requirements 6.2, 6.3, 8.1, 9.1, 9.2, 9.7, 14.1, 14.8**
  - [x] 7.5 Write property test for the serialized output shape
    - **Property 2: Serialized output shape**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6, 14.7**
  - [x] 7.6 Write property test for purity and frozen input
    - Deep-freeze the Stack. Call `serializeStack` twice and `parseBackup` twice.
    - **Property 3: Backup functions are pure and safe on frozen input**
    - **Validates: Requirements 6.5, 6.8, 8.12, 9.8, 14.6, 14.9**
  - [x] 7.7 Write property test for no `NaN` or `undefined` text
    - Generate text fields that do not contain "undefined" or "NaN".
    - **Property 4: No NaN or undefined text**
    - **Validates: Requirements 6.7, 14.5**
  - [x] 7.8 Write property test for money
    - Compute stock value, total of sales and total owed with existing domain functions only. Add no domain function. Check every money field in the serialized JSON is a whole number.
    - **Property 5: Money survives a backup exactly**
    - **Validates: Requirements 6.9, 14.13**
  - [x] 7.9 Write property test for bad input
    - Non-JSON strings, and JSON text whose `stack` fails `isStack` or has a bad card title. Check an error code and a non-empty message, and no throw.
    - **Property 6: Bad input gives an error and never throws**
    - **Validates: Requirements 8.3, 8.7, 8.9, 8.14, 14.2**
  - [x] 7.10 Write property test for restored names
    - Include names around 29, 30, 40 and 41 characters, empty and space-only names, and names with surrogate pairs.
    - **Property 7: Restored name rules**
    - **Validates: Requirements 9.3, 9.4, 9.5, 9.6, 9.9, 14.3**
  - [x] 7.11 Write property test for version errors
    - **Property 8: Version mismatch gives the matching error**
    - **Validates: Requirements 8.5, 8.6, 14.11**
  - [x] 7.12 Write property test for check order
    - Build texts that fail several checks at once and compare the code to the earliest failed check.
    - **Property 9: Checks run in a fixed order**
    - **Validates: Requirements 8.10**
  - [x] 7.13 Write property test for the size limit
    - Build oversized text with `"x".repeat(SIZE_LIMIT + 1)` and a multibyte variant, not `fc.string`. This property MAY use 25 runs.
    - **Property 10: Size limit**
    - **Validates: Requirements 8.2, 14.10**
  - [x] 7.14 Write property test for backup file names
    - **Property 11: Backup file name shape**
    - **Validates: Requirements 6.10, 6.11, 6.12, 6.13, 9.9, 14.12**
  - [x] 7.15 Write property test for dropped extra keys
    - Walk the parsed JSON and insert random keys at every object, including `__proto__` added with `Object.defineProperty` and `constructor`. Re-stringify and compare with the result for the clean text.
    - **Property 13: Extra keys are dropped at every level**
    - **Validates: Requirements 8.13, 14.15**

- [x] 8. Checkpoint - Ensure all tests pass
  - Run `npx vitest run` and `npx tsc --noEmit`. Ask the user if questions arise.

- [x] 9. Unused stack id and restore safety
  - [x] 9.1 Create `src/storage/freshStackId.ts`
    - Export `makeUnusedStackId(makeId?, maxTries = 5)`. Use `loadStack` only: a `NOT_FOUND` error means the id is free. Any other result means try again. Return `null` after `maxTries`. It never writes. Do not edit `stackStore.ts`.
    - _Requirements: 10.5, 11.4, 16.2_
  - [x] 9.2 Write unit tests in `src/storage/freshStackId.test.ts`
    - Use `fake-indexeddb/auto`. Returns the first id that is not found. Skips an id that is saved and an id whose stored record fails `isStack`. Returns `null` after `maxTries`. Writes nothing.
    - _Requirements: 10.5, 11.4_
  - [x] 9.3 Write property test for restore never overwriting
    - File: `src/storage/backupRestore.property.test.ts`, using `fake-indexeddb/auto` and the setup from `stackStore.hidden.property.test.ts`. Include a backup whose Stack id equals a saved Stack id. Restore the same file twice. This property MAY use 25 runs.
    - **Property 14: Restored stacks never overwrite saved stacks**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 14.4**

- [x] 10. Persistent storage request
  - [x] 10.1 Create `src/pwa/requestPersistentStorage.ts`
    - Best effort. Wrap in try/catch, catch a rejected promise, and do nothing when `navigator.storage` is missing.
    - _Requirements: 5.6_
  - [x] 10.2 Write unit tests in `src/pwa/requestPersistentStorage.test.ts`
    - No throw when `navigator.storage` is missing, when `persist` rejects and when it throws. `persist` is called once when present.
    - _Requirements: 5.6_

- [x] 11. Service worker registration and notices
  - [x] 11.1 Create `src/pwa/registerServiceWorker.ts`
    - Return `null` when `import.meta.env.PROD` is false or `"serviceWorker" in navigator` is false. Otherwise import `virtual:pwa-register` dynamically and call `registerSW({ immediate: true, ... })`. Swallow errors from the import, from `registerSW` and from `onRegisterError`. `applyUpdate` calls the `updateSW(true)` function. Nothing calls `skipWaiting` before the owner presses "Reload".
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 4.4_
  - [x] 11.2 Write unit tests in `src/pwa/registerServiceWorker.test.ts`
    - Returns `null` and calls nothing in the test environment. No throw when `navigator.serviceWorker` is missing.
    - _Requirements: 2.6, 2.7, 15.5_
  - [x] 11.3 Create `src/pwa/useServiceWorkerNotices.ts`
    - Return `notice`, `closeOffline` and `applyUpdate`. Register once on mount (a ref guards the StrictMode second run). `update` wins over `offline`. Store `ghoststack:offlineNoticeShown` in `localStorage` with every read and write inside try/catch.
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 4.1, 4.9_
  - [x] 11.4 Write unit tests in `src/pwa/useServiceWorkerNotices.test.tsx`
    - Use `// @vitest-environment jsdom` and a mocked `registerServiceWorker`. `onOfflineReady` shows the offline notice once and sets the flag. A second mount does not show it. `onNeedRefresh` wins when both are due. Closing hides it. Blocked `localStorage` does not throw.
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 4.1, 4.9, 15.4_

- [x] 12. Backup and notice components
  - [x] 12.1 Create `src/components/backup/downloadText.ts`, `downloadText.test.ts` and `readFileText.ts`
    - `downloadText` makes an object URL, clicks a hidden anchor, removes it, and revokes the URL after 1000 ms. The test stubs `URL.createObjectURL` and `revokeObjectURL`, uses fake timers, and checks that revoke runs at 1000 ms and not before. `readFileText` uses `FileReader.readAsText` and rejects on error.
    - _Requirements: 7.3, 7.6, 10.4, 10.9_
  - [x] 12.2 Create `src/components/backup/backupMessages.ts` and `BackupMessage.tsx`
    - Constants: "Your backup file is ready.", "We could not save your backup. Please try again.", "We could not read that file. Please try again.", "Backup loaded. Your shop is open as a new stack.", and the tip line. Export the `BackupMessageState` type. `BackupMessage` uses `role="status"` for success and `role="alert"` for error, `tabIndex={-1}`, an icon with `aria-hidden` plus text, and focuses itself on a new error (keyed on `seq`). No money amount and no shop name in any text.
    - _Requirements: 7.5, 7.7, 7.9, 10.8, 10.9, 10.10, 12.4, 12.5_
  - [x] 12.3 Create `src/components/backup/BackupControls.tsx` and `BackupControls.css`
    - "Save a backup" shared `Button`. A visible `<label>` "Load a backup" joined to `<input type="file" accept=".json,application/json,text/plain">` with `aria-busy`. The tip line. `BackupMessage` when `place === "controls"`. In `onChange`, read `files?.[0]` before any `await`, do nothing when there is none, call `onLoadFile`, then clear the input value in a `finally`. The input is not `disabled`. Theme variables only, 44px targets, visible focus outline, no sideways scroll at 360px.
    - _Requirements: 7.1, 7.10, 10.1, 10.2, 10.11, 10.12, 10.13, 12.1, 12.2, 12.3, 12.7, 12.8, 12.9_
  - [x] 12.4 Write component tests in `src/components/backup/BackupControls.test.tsx`
    - Use `// @vitest-environment jsdom` and `import "../../test/setup";`. Label joined to input. `accept` value. Choosing a file calls `onLoadFile`. Empty `files` calls nothing and shows no message. The input value is cleared so the same file can be chosen twice. An error message gets focus. A success message does not move focus. `aria-busy` while `busy`. Tip line shown.
    - _Requirements: 7.5, 10.1, 10.2, 10.8, 10.11, 10.12, 10.13, 12.3, 15.2_
  - [x] 12.5 Create `src/components/NoticeArea.tsx` and `NoticeArea.css`
    - A block in the page flow (not fixed), shown under the theme button and above the `ModeSwitch`. Update notice: `role="status"`, `↻` icon, "A new version is ready. Reload to update." and a "Reload" button (`aria-disabled` while `reloading`). Offline notice: `✔` icon, "Ready for offline use" and "Close". Backup loaded notice when `backupMessage.place === "notice"`, with "Close". No `focus()` call and no `autoFocus`. Theme variables only. Wraps at 360px.
    - _Requirements: 3.2, 3.6, 3.7, 4.2, 4.7, 10.7, 12.1, 12.4, 12.8, 12.10_
  - [x] 12.6 Write component tests in `src/components/NoticeArea.test.tsx`
    - Exact texts. "Close" and "Reload" call their handlers. `role="status"`. No element gets focus when a notice appears. Update wins over offline. "Reload" is `aria-disabled` while `reloading`.
    - _Requirements: 3.2, 3.3, 3.6, 4.2, 4.7, 4.9, 15.4_
  - [x] 12.7 Add the optional `backup` prop to `src/components/builder/BuilderPanel.tsx`
    - `backup?: BackupControlsProps`. When present, render `BackupControls` in the footer under "Choose a starter". No other change. Existing `BuilderPanel` tests stay unedited and must still pass.
    - _Requirements: 7.1, 7.2, 10.1, 16.1, 16.3_

- [x] 13. Checkpoint - Ensure all tests pass
  - Run `npx vitest run` and `npx tsc --noEmit`. Ask the user if questions arise.

- [ ] 14. App_Shell wiring
  - [x] 14.1 Add `drainSaves`, `saveErrorRef` and the persist-once helper to `src/App.tsx`
    - `saveErrorRef` mirrors what `enqueueSave` passes to `setSaveError`. `drainSaves` loops until `saveQueueRef.current` stops changing and returns the save error. `notePersistOnce` calls `requestPersistentStorage` once, and is called only when `saveStack` returns ok inside `enqueueSave`. Never call it on page load. Behaviour and text of `enqueueSave` stay the same.
    - _Requirements: 4.5, 4.6, 5.6_
  - [x] 14.2 Add notices, `handleReload` and backup message state to `src/App.tsx`
    - Call `useServiceWorkerNotices`. Add `backupMessage` state with a `seq` counter, and clear any `place: "controls"` message when `mode` changes. Render `NoticeArea` under the theme button and above the `ModeSwitch`. `handleReload` runs `drainSaves`, shows the save error and stays open on error, otherwise calls `applyUpdate` and ignores its failure. Nothing else reloads the page.
    - _Requirements: 3.1, 3.3, 4.1, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9_
  - [x] 14.3 Add `handleSaveBackup` and pass the `backup` prop to `BuilderPanel` in `src/App.tsx`
    - Wait for `drainSaves`, read `latestStackRef.current`, call `serializeStack` and `backupFileName` (date from `new Date()` local parts), then `downloadText`. Success shows "Your backup file is ready." and does not move focus. A thrown error shows the save failure message. Writes nothing to storage or the Stack.
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_
  - [x] 14.4 Add `handleLoadFile` and the focus effect to `src/App.tsx`
    - Ignore a second choice while busy (`loadBusyRef`, `loadBusy` state). Files over `SIZE_LIMIT` show `TOO_LARGE` and are not read. Then `readFileText`, `makeUnusedStackId`, `parseBackup`, `drainSaves`, `saveStack`, `notePersistOnce`, a second `drainSaves`, then `openStack(id)` (the same function the Stack_Picker uses). If `latestStackRef.current?.id` is not the new id, call `refreshSavedStacks()` and show the unreadable-data message. On success set `focusFirstTab` and show "Backup loaded. Your shop is open as a new stack." with `place: "notice"`. Every failure shows a message with focus on it, saves nothing more, and keeps Builder mode and the open Stack. A `catch` calls `refreshSavedStacks()`. An effect keyed on `[focusFirstTab, mode, stack]` focuses the first `[role="tab"]`, then resets the flag.
    - _Requirements: 10.3 to 10.14, 11.1 to 11.7_
  - [x] 14.5 Write `src/App.backup.test.tsx` for save, persist and reload
    - Use `fake-indexeddb/auto` and stub `URL.createObjectURL`. Cover: a successful save (download name from `backupFileName`, message shown, focus stays on "Save a backup", file text parses back to the open Stack, storage unchanged). "Save a backup" waits for a stalled `saveStack`. `navigator.storage.persist` is not called on load or while saves fail, is called once after the first successful save, is not called again, and a refusal or throw shows nothing. Reload: `applyUpdate` runs only after the pending save finished, is not called when the save fails (the alert shows), and typed form values stay while the update notice is shown. Play mode shows no Backup_Controls. `fetch` is never called.
    - _Requirements: 4.3, 4.5, 4.6, 5.3, 5.4, 5.6, 7.2, 7.3, 7.5, 7.8, 15.4_
  - [-] 14.6 Add load tests to `src/App.backup.test.tsx`
    - Successful load: new Stack named with " (restored)", opened in Play mode through `openStack`, first tab focused, notice shown, Stack_Picker lists both Stacks, last-opened id is the new id. Failures (too-big file with `FileReader` not called, unreadable file, text file, JSON from another app, damaged backup, failing `saveStack`): message with focus on it, Builder mode stays, storage unchanged. Same file twice gives two Stacks. A file whose Stack id equals a saved id still saves under a new id and leaves the saved Stack as it was. A mocked `crypto.randomUUID` that first returns a taken id makes the second candidate be used. A second file chosen while busy is ignored. An edit made while a restore is saving is still written to the old Stack.
    - _Requirements: 10.3 to 10.14, 11.1 to 11.7, 15.2, 15.3_

- [~] 15. Checkpoint - Run the whole suite after the App changes
  - Run `npx vitest run` and `npx tsc --noEmit`. List every failing existing test in the report. Do not edit an existing test. Ask the user if questions arise.
  - _Requirements: 16.1, 16.3_

- [ ] 16. Build check script
  - [~] 16.1 Create `scripts/check-pwa.mjs` and add `"check:pwa": "node scripts/check-pwa.mjs"` to `package.json`
    - Use `node:fs` and `node:path` only. Check `dist/manifest.webmanifest` (name, `display: "standalone"`, `start_url`, `scope`, three icons with one `maskable`), the three PNG files in `dist/icons/` start with the PNG signature, `dist/sw.js` exists, one file matching `PressStart2P-Regular-*.woff2` exists in `dist/assets/` and its exact hashed name appears in the precache list in `sw.js` (a different font file does not count), and `dist/index.html` has exactly one `rel="manifest"` link, one `theme-color` meta tag and one `apple-touch-icon` link. Print a plain list of problems and exit 1 on any failure. Leave the `build` script unchanged. Not part of Vitest.
    - _Requirements: 1.6, 1.7, 2.1, 15.6, 16.6_

- [ ] 17. Manual test document
  - [~] 17.1 Create `docs/OFFLINE_TESTING.md`
    - Seven numbered tests, each with numbered steps and an "Expected result" in simple English: First load, Offline reload, Record a sale offline, Install on a phone (Android and iPhone, including the maskable icon), Update flow, Backup and restore, Bad files. Add the note that on an iPhone an app installed to the home screen has storage separate from Safari. The install and the backup tests tell the tester to restore a backup into the installed home-screen app and check that the new stack appears there. Plain Markdown, no code.
    - _Requirements: 13.1 to 13.10_

- [ ] 18. Final check
  - [~] 18.1 Run `npx vitest run` and `npx tsc --noEmit`. Fix any failure in new code.
    - Existing tests must pass with no edits. Report any existing test that fails instead of changing it.
    - _Requirements: 16.1_
  - [~] 18.2 Run `npm run build`, then `npm run check:pwa`
    - Confirm the check finds the manifest, the three icons, `sw.js`, and the hashed `PressStart2P-Regular-*.woff2` in the precache list. Report the exact output.
    - _Requirements: 15.6, 16.6_
  - [~] 18.3 Do the manual checks in `docs/OFFLINE_TESTING.md` in a real browser and on a real phone, and write down the result
    - This step cannot be finished by an automated agent or by the test suite. Offline reload, install, the maskable icon, the update flow and the iPhone storage note need a real browser with network tools and a real Android phone and iPhone. An agent MUST NOT mark this step done, and MUST NOT claim it passed, unless a person ran the tests and gave the results. Leave it open and tell the owner which tests are still to do.
    - _Requirements: 2.2, 2.3, 3.1, 4.5, 5.1, 13.1 to 13.10_

## Notes

- Each property test is a separate sub-task and runs at least 100 cases, except Property 10 (task 7.13) and Property 14 (task 9.3), which may use 25. Property 12 lives in `cutText.property.test.ts`. Tasks 7.4 to 7.15 all write `src/domain-ui/backup.property.test.ts`, so each runs in its own wave.
- Task 1.1 is a stop point. If the install reports a peer dependency error, stop and report it. Use no `--force`, no `--legacy-peer-deps` and no `overrides`.
- Tasks 14.1 to 14.4 all edit `src/App.tsx`, and tasks 14.5 and 14.6 both write `src/App.backup.test.tsx`, so each runs in its own wave.
- `package.json` is edited by tasks 1.1, 3.1 and 16.1, which run in different waves. `src/domain-ui/backup.ts` is edited by tasks 7.1 and 7.2, in different waves.
- Existing tests are not edited. New cases go in new files. `ERROR_MESSAGES` is not touched, because `validate.test.ts` counts its keys.
- Component tests use a per-file `// @vitest-environment jsdom` line and an explicit `import "../test/setup";` (adjust the relative path).
- No package is added except `vite-plugin-pwa` as a dev dependency.
- Task 18.3 needs a real browser and phone and stays open until a person has run it.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2"] },
    { "id": 4, "tasks": ["5"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 7, "tasks": ["7.2"] },
    { "id": 8, "tasks": ["7.3", "7.4"] },
    { "id": 9, "tasks": ["7.5"] },
    { "id": 10, "tasks": ["7.6"] },
    { "id": 11, "tasks": ["7.7"] },
    { "id": 12, "tasks": ["7.8"] },
    { "id": 13, "tasks": ["7.9"] },
    { "id": 14, "tasks": ["7.10"] },
    { "id": 15, "tasks": ["7.11"] },
    { "id": 16, "tasks": ["7.12"] },
    { "id": 17, "tasks": ["7.13"] },
    { "id": 18, "tasks": ["7.14"] },
    { "id": 19, "tasks": ["7.15"] },
    { "id": 20, "tasks": ["8"] },
    { "id": 21, "tasks": ["9.1", "10.1", "11.1", "12.1", "12.2", "12.5"] },
    { "id": 22, "tasks": ["9.2", "10.2", "11.2", "11.3", "12.3", "12.6"] },
    { "id": 23, "tasks": ["9.3", "11.4", "12.4", "12.7"] },
    { "id": 24, "tasks": ["13"] },
    { "id": 25, "tasks": ["14.1"] },
    { "id": 26, "tasks": ["14.2"] },
    { "id": 27, "tasks": ["14.3"] },
    { "id": 28, "tasks": ["14.4"] },
    { "id": 29, "tasks": ["14.5"] },
    { "id": 30, "tasks": ["14.6"] },
    { "id": 31, "tasks": ["15"] },
    { "id": 32, "tasks": ["16.1", "17.1"] },
    { "id": 33, "tasks": ["18.1"] },
    { "id": 34, "tasks": ["18.2"] },
    { "id": 35, "tasks": ["18.3"] }
  ]
}
```
