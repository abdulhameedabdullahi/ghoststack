# Implementation plan: GhostStack foundation

- [x] 1. Check the project tooling
  - Look for `package.json`, `tsconfig.json` (strict mode), Vite config and `src/main.tsx`.
  - The scaffold did not exist when this spec was written. If it is still missing, stop and ask the user to approve the setup and the package list in design.md ("Dependencies"). Do not install anything before approval.
  - Confirm `idb`, `vitest`, `fast-check` and `fake-indexeddb` are installed once approved.
  - _Requirements: 6.1, 7.1, 8.1_

- [x] 2. Domain types, results and validation
  - [x] 2.1 Create `src/domain/types.ts` with Kobo, Stack, Card (four kinds), Item, Sale and Debt
    - _Requirements: 1.1 to 1.8_
  - [x] 2.2 Create `src/domain/result.ts` with Result, DomainError and the error table from design.md
    - Every message says what went wrong and what to do next.
    - _Requirements: 5.1, 5.2_
  - [x] 2.3 Create `src/domain/validate.ts` with whole-number and safe-money checks
    - _Requirements: 2.5, 2.7, 3.2_
  - [x] 2.4 Add unit tests for the validation helpers and a test that checks every error code has a message
    - _Requirements: 5.1, 7.1_

- [ ] 3. recordSale
  - [-] 3.1 Implement `recordSale` and `saleTotal` in `src/domain/sales.ts`
    - Pure, no mutation, id and time passed in.
    - _Requirements: 2.1 to 2.9_
  - [~] 3.2 Write unit tests for success, price copying, each error code and no mutation
    - _Requirements: 2.1 to 2.9, 7.1_
  - [~] 3.3 Write fast-check property test for invariant 1 (stock never below zero, oversize sales rejected)
    - File: `src/domain/sales.property.test.ts`. At least 100 runs.
    - _Requirements: 7.2, 7.6, 7.7_
  - [~] 3.4 Write fast-check property test for invariant 2 (stock drops by exactly the quantity sold)
    - _Requirements: 7.3, 7.6, 7.7_

- [ ] 4. recordDebt, settleDebt and totalOwed
  - [~] 4.1 Implement `recordDebt`, `settleDebt` and `totalOwed` in `src/domain/debts.ts`
    - _Requirements: 3.1 to 3.5, 4.1 to 4.6_
  - [~] 4.2 Write unit tests for success, trimmed names, each error code, already-paid debts and no mutation
    - _Requirements: 3.1 to 3.5, 4.1 to 4.6, 7.1_
  - [~] 4.3 Write fast-check property test for invariant 5 (total owed equals unpaid sum; settling lowers it by exactly the amount)
    - File: `src/domain/debts.property.test.ts`. At least 100 runs.
    - _Requirements: 7.4, 7.6, 7.7_

- [ ] 5. Invariant 7 across all operations
  - [~] 5.1 Create `src/domain/index.ts` exporting the public domain API
    - _Requirements: 1.1_
  - [~] 5.2 Write fast-check property test for invariant 7 using random sequences of sale, debt and settle operations
    - File: `src/domain/invariants.property.test.ts`. No NaN, no negative stock, no fractional or unsafe money. At least 100 runs.
    - _Requirements: 7.5, 7.6, 7.7_

- [ ] 6. Storage layer
  - [~] 6.1 Create `src/storage/db.ts` that opens the `ghoststack` database with a `stacks` store
    - _Requirements: 6.1_
  - [~] 6.2 Create `src/storage/isStack.ts` shape check
    - _Requirements: 6.6_
  - [~] 6.3 Create `src/storage/stackStore.ts` with `saveStack`, `loadStack` and `listStacks`
    - No domain function calls, no React imports, no network calls.
    - _Requirements: 6.2 to 6.5, 6.7, 6.8_
  - [~] 6.4 Write unit tests with `fake-indexeddb`: round trip, replace on save, unknown id, malformed record, list
    - _Requirements: 6.2 to 6.6, 7.1_

- [ ] 7. Bare app screen
  - [~] 7.1 Create `src/main.tsx` and `src/App.tsx` showing the "GhostStack" heading and one short line
    - No cards, no builder, no styling work.
    - _Requirements: 8.1, 8.2_

- [ ] 8. Final check
  - [~] 8.1 Run `npx vitest run` and `npx tsc --noEmit`. Fix any failure.
  - [~] 8.2 Run the production build and open the app to confirm the heading shows.
  - [~] 8.3 Update `KIRO_NOTES.md` counts (specs, property tests, any bugs they found) and add a log row.
    - _Requirements: 7.1 to 7.7, 8.1_
