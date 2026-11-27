// Tips the ghost says: playful, plain English, under 60 characters, naming a next step.

export type TipKind =
  | "appOpened"
  | "saleRecorded"
  | "debtAdded"
  | "debtPaid"
  | "errorShown"
  | "emptyScreen"
  | "midnightToggled"
  | "poked";

/** Words the ghost must never say. Checked by tests, whole-word, case-insensitive. */
export const BANNED_WORDS: readonly string[] = [
  "inventory",
  "transaction",
  "database",
  "sync",
  "invalid",
  "exception",
  "null",
  "undefined",
  "cache",
  "payload",
  "receivable",
  "ledger",
  "parameter",
  "backend",
];

// Button names below match the real labels: "Record a sale" (ItemRow),
// "Record a debt" and "Mark as paid" (DebtsCardView), "Add an item" (StockCardView).
export const TIPS: Readonly<Record<TipKind, readonly string[]>> = {
  appOpened: [
    "Boo! Tap Add an item to stock your shelf.",
    "Made a sale? Tap Record a sale on an item.",
    "Welcome back! Tap Add an item to get going.",
  ],
  saleRecorded: [
    "Cha-ching! Owed money? Tap Record a debt.",
    "Sale saved! Tap Record a sale for the next one.",
  ],
  debtAdded: [
    "Noted! Tap Mark as paid when they settle up.",
    "Tab saved. I won't tell a soul. Mark as paid later!",
  ],
  debtPaid: [
    "Paid up! Time for another Record a sale?",
    "Hooray! One less tab to chase. Add an item next?",
  ],
  errorShown: [
    "Oops! Read the red note, then try again.",
    "Hmm. Fix the red note above, then save again.",
  ],
  emptyScreen: [
    "Nothing here yet. Tap Add an item to start!",
    "Spooky and empty. Tap Record a debt or Add an item.",
  ],
  midnightToggled: [
    "Night mode! Flip the switch again for day mode.",
    "Lights out! Toggle midnight again to go back.",
  ],
  poked: [
    "Hee hee! Tap Record a sale to get going.",
    "That tickles! Tap Add an item next.",
  ],
};
const TIP_KINDS: readonly string[] = Object.keys(TIPS);

export function isTipKind(value: string): value is TipKind {
  return TIP_KINDS.includes(value);
}

/** Pure. Wraps round the group, also for negative counters. */
export function pickTip(kind: TipKind, counter: number): string {
  const list = TIPS[kind];
  const n = list.length;
  return list[((counter % n) + n) % n];
}
