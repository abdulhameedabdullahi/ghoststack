# Architecture

GhostStack has four layers. Each layer has one job and must not reach into the others.

## Layers

- **Domain** (`src/domain/`): pure business logic for money, stock, sales, and debts. No React and no storage code. Functions are pure and deterministic.
- **Storage** (`src/storage/`): IndexedDB access only, through the `idb` library. No business rules.
- **Components** (`src/components/`): React UI only. Card components live in `src/components/cards/`. Money is turned into display text here and nowhere else.
- **Stacks** (`src/stacks/`): starter stack definitions, such as a provisions shop and a farm produce stall.

## Main data types

All money is an integer in the smallest currency unit (kobo for Naira).

**Stack**
- id
- name
- ordered list of cards
- currency (default Naira)

**Card**
- id
- type (Stock, Sales log, Debts, Daily summary)
- title
- position in the stack
- buttons (label, action, target card)

**Item**
- id
- name
- quantity (whole number, never below zero)
- cost price (integer kobo)
- sell price (integer kobo)
- low-stock level

**Sale**
- id
- item id
- quantity
- price per unit (integer kobo)
- time

**Debt**
- id
- customer name
- amount (integer kobo)
- date
- status (paid or unpaid)

## Data flow

1. UI action: the owner taps a button in a card.
2. Domain function: checks the input and returns the new data, or a clear error.
3. Storage: saves the new data on the device.
4. UI: shows the updated data, or a friendly error message.
