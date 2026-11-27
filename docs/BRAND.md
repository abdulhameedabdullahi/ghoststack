# GhostStack Brand Guide

## Story

GhostStack is built for the trader who keeps their stock in a notebook
and settles debts by memory. The name fuses two ideas:

**Ghost** — the invisible helper haunting your stall at midnight, counting
goods while you sleep. Friendly, not frightening. The mascot's name is
**Kobo**: small, quick, and always on your side.

**Stack** — the HyperCard metaphor: index cards you arrange yourself
into *your* shop's app. No cloud, no account, no learning curve.

The concept is **Midnight Market** — the last stall lit up after dark,
run by someone who knows every item and every customer by name.

---

## Palette

| Name | Token | Midnight | Light | Use |
|------|-------|----------|-------|-----|
| Midnight | `--color-bg` | #07050f | #ffffff | Backgrounds |
| Moonlight | `--color-ghost` | #d8c4ff | #000000 | Ghost / primary text |
| Candle Gold | `--color-moon-icon` | #d4a030 | — | Accents, coins, Naira |
| Ghost Lavender | `--color-ghost-cap` | #ff4de8 | #5b2fa0 | Highlights |
| Neon Accent | `--color-accent` | #9254ff | #000000 | Interactive elements |

All pairs pass WCAG AA contrast (≥4.5:1 for text). Never use raw hex in
components — always read from CSS custom properties in `theme.css`.

---

## Typography

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Display / logo | Press Start 2P | 400 | Bundled SIL OFL, no CDN |
| Body / UI | system-ui | 400/600 | Monospace fallback |

The pixel font is loaded via `@font-face` in `src/components/theme.css`.
Use `var(--font-pixel)` in CSS. Never reference an external font URL.

---

## Logo

**Mark:** Direction C — ghost body (rows 0–13 of `GHOST_GRID`) whose
lower edge folds into an index-card corner. 16 × 19 pixel grid.
Defined in `src/brand/logoGrids.ts` as `MARK_GRID`.

**Wordmark:** GHOSTSTACK in a 4 × 5 pixel font, 49 × 5 grid.

**Lockups:**
- Horizontal: mark + wordmark at 2×, viewBox 118 × 19
- Stacked: mark centred over wordmark at 2×, viewBox 98 × 33

**Files:**
- `brand/ghoststack-mark.svg` — currentColor, theme-aware
- `brand/ghoststack-mark-black.svg` / `-white.svg` — fixed colour
- `brand/ghoststack-logo.svg` — horizontal lockup
- `brand/ghoststack-logo-stacked.svg` — stacked lockup
- `brand/ghoststack-wordmark.svg` — text only

**Minimum size:** 24 × 24 px for the mark in isolation.
**Clear space:** ½ mark width on all sides.
**Don't:** add drop-shadows, gradients, stretching, or rotations.

---

## Voice

GhostStack speaks like a sharp-eyed market trader, not a tech company.

| Do | Don't |
|----|-------|
| "Sold" | "Transaction recorded" |
| "What you're owed" | "Outstanding receivables" |
| "Save to file" | "Export backup" |
| "Opens fast" | "Optimised for performance" |
| "No internet needed" | "Works in offline mode" |

**Tone:** direct, warm, present tense. One sentence per message.
Never mention cloud, sync, or account.

---

## Microcopy (20 canonical lines)

1. Raise your shop.
2. Stock, sales and debts. Offline. In Naira.
3. Opening your shop…
4. Choose a starter
5. Add item
6. Record sale
7. Mark as paid
8. What you're owed
9. Today's totals
10. Save to file
11. Load from file
12. Builder mode
13. Play mode
14. No connection — your data is safe on this device.
15. Update ready — tap to reload.
16. Saved.
17. Could not save — try again.
18. No items yet. Add your first item above.
19. Nothing sold today.
20. All debts paid.
