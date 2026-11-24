# Kiro usage log

| Date | What I did | Kiro feature used | What worked | What didn't | Credits used (approx) |
| --- | --- | --- | --- | --- | --- |
| 2026-11-24 | Project foundation set up with a single master prompt | Steering, hooks, docs | | | |
| 2026-11-24 | Completed the ghoststack-foundation spec (domain logic for sales and debts, storage, tests). 60 tests pass, 8 of them property tests across sales.property.test.ts, debts.property.test.ts and invariants.property.test.ts | Specs, property-based tests | Property tests covered invariants 1, 2, 5 and 7 plus no-mutation checks for recordDebt, settleDebt and recordSale. Implementation also added DUPLICATE_ID and SAVE_FAILED error codes beyond the design table | Property tests found no bugs | |
| 2026-11-25 | Completed the app-shell-stock-card spec (app shell, item add/edit/delete, money and whole-number parsing, starter stack, stock card). 149 tests pass, 25 of them property tests. Manual check (.kiro/specs/app-shell-stock-card/manual-check.md) was run through headless Chrome, not by a human | Specs, property-based tests | The invariant-7 property test (task 2.11) found that recordSale does not guard quantity*unitCost overflow, only revenue. Property 13 covers random item and sale operation sequences | Manual check had no human tester, so touch and visual behavior is unverified | |

## Counts

- Specs written: 2 (ghoststack-foundation, app-shell-stock-card, both completed)
- Steering files: 5
- Hooks: 2
- Property tests: 25 (sales: 2, debts: 4, invariants: 2, items: 10, itemForm: 2, money: 2, wholeNumber: 2, starterStack: 1)
- Total tests passing: 149
- Bugs found by property tests: 1 (recordSale does not guard quantity*unitCost overflow, found by invariant 7)
