# GhostStack

**Raise your shop.**

Stock, sales and debts. Offline. In Naira.

---

GhostStack brings back Apple's 1987 HyperCard for small business owners: a simple builder where a shop owner arranges "cards" and "buttons" to make their own stock, sales, and debt-tracking app in minutes, with no coding and no constant internet.

## Why HyperCard?

HyperCard let ordinary people build their own programs from stacks of cards, with buttons that did things. It faded because it was tied to old hardware and the web replaced it. GhostStack revives that idea for small traders who track money in notebooks because business software is too complex, too expensive, or needs a good connection.

## Features

- 4 card types: Stock, Sales log, Debts, Daily summary
- Fixed button actions: add item, record sale, record debt, mark debt as paid, show today's totals, go to another card
- Builder mode (add, rename, reorder, delete cards) and Play mode (everyday use)
- 2 or 3 starter stacks
- Works offline, with data saved on the device
- Installable as a PWA
- Export and import a stack as a file

## Tech stack

- Vite + React + TypeScript (strict mode)
- IndexedDB through the `idb` library
- PWA: manifest + service worker
- Vitest and fast-check for tests
- Plain CSS with CSS variables

## How to run

```bash
npm install
npm run dev        # start dev server at http://localhost:5173
npm test           # run all tests (Vitest)
npm run build      # type-check + production build → dist/
```

To install as a PWA, open the dev or production URL in Chrome and use the browser's install prompt.

## How Kiro was used

### Specs

9 Kiro specs drove all features: `ghoststack-foundation`, `app-shell-stock-card`, `sales-and-daily-summary`, `debts-card-ui`, `ghost-companion`, `builder-mode-and-starter-stacks`, `pwa-offline-and-backup`, `design-polish`, and `whatsapp-share`. Each spec produced a requirements file, a design file, tasks, and a manual-check checklist. Tasks were executed one at a time; Kiro generated the implementation, Vitest confirmed it.

### Steering

5 steering files kept every conversation on track: `brand.md` (colours, pixel art style), `money-rules.md` (kobo integers, no floats, `Result` types, pure functions), `plain-language.md` (Nigerian English, short UI copy), `product.md` (HyperCard-for-traders goal), and `tech.md` (Vite + React + TypeScript strict, IndexedDB, no external UI libraries).

### Hooks

2 hooks ran automatically:
- **`register-new-card`** – fired when a new card-related file was created; reminded Kiro to update the card registry.
- **`run-domain-tests`** – fired after domain file edits; ran the domain test suite and reported the result inline.

### Property-based testing

fast-check property tests guard every invariant. The first batch (25 tests) covered domain-layer invariants: no floats, no mutation, `Result` error codes, quantity and revenue arithmetic. Later specs added 9 more properties for debts ordering and grouping, 11 for the ghost state machine, and 7 for the WhatsApp share templates. The `money-auditor` custom agent found that `recordSale` did not guard `quantity × unitCost` overflow — a bug the unit tests missed, caught by property test invariant 7.

### MCP

No external MCP servers were used. Kiro's built-in tools (file read/write, terminal, browser automation via `check-brand.mjs`) were sufficient for the full build.

### Vibe coding vs specs

Vibe coding (open-ended prompts) was used for brand generation (`generate-brand.mjs`), splash screen animation, and the spooky background. Everything with money, storage, or accessibility was spec-driven: requirements written first, design reviewed before coding, tasks run one at a time with tests confirming each.

## Hackathon

Kiroween 2026, Resurrection category.

## License

MIT. See [LICENSE](LICENSE).
