---
inclusion: fileMatch
fileMatchPattern: ["src/domain/**/*", "src/storage/**/*", "**/*.test.ts"]
---
# Money and correctness rules

## Money representation

- Store all money as integers in the smallest currency unit (kobo for Naira).
  Never use floating-point for money.
- Convert to a display string only in the UI layer.
- Currency is configurable; default is Naira.

## Invariants (every one needs a property-based test with fast-check)

1. Stock quantity never goes below zero after any sequence of sales. Reject a
   sale larger than available stock.
2. Recording a sale reduces stock by exactly the quantity sold.
3. The daily total equals the sum of that day's individual sales.
4. Estimated profit equals the sum of (sell price minus cost price) times
   quantity.
5. Total debt owed equals the sum of unpaid debts. Marking a debt paid reduces
   the total by exactly that debt's amount.
6. Exporting then importing a stack returns identical data.
7. No operation may produce NaN, negative stock, or fractional kobo.

## Practices

- Domain functions are pure and deterministic.
- Validate inputs at the domain boundary and return clear errors.
- Write the property-based test in the same task as the function it covers.
