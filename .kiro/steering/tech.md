---
inclusion: always
---
# Tech stack

- Vite + React + TypeScript (strict mode)
- Storage: IndexedDB through the `idb` library. No backend, no accounts.
- PWA: manifest + service worker for offline use
- Tests: Vitest for unit tests, fast-check for property-based tests
- Styling: plain CSS with CSS variables (no heavy UI framework)
- No unnecessary dependencies. Ask before adding a new package.

# Structure

- src/domain/: pure business logic (money, stock, sales, debts). No React,
  no storage code.
- src/storage/: IndexedDB access only
- src/components/: React UI only (card components live in src/components/cards/)
- src/stacks/: starter stack definitions
- Keep domain logic, storage, and UI strictly separate.
