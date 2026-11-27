---
inclusion: always
---

# GhostStack Brand

## Identity

- **Name:** GhostStack
- **Tagline (fixed):** "Raise your shop."
- **Sub-line (fixed):** "Stock, sales and debts. Offline. In Naira."
- **Mascot name (constant):** `Kobo` — small, kind, never scary

## Concept: Midnight Market

Ghost = the shop's spirit of a night market. Sits on a stack of index
cards (HyperCard "stack"). The ghost *is* the shop-keeper's helper.

## Mark

Direction C: ghost body (rows 0–13 of GHOST_GRID) whose lower edge
folds into an index-card corner. 16 × 19 pixel grid.

Grid lives in `src/brand/logoGrids.ts` (TypeScript source of truth) and
inline-duplicated in `scripts/generate-brand.mjs`. Keep them in sync.

## Colour tokens

| Token | CSS var | Midnight | Light |
|-------|---------|----------|-------|
| midnight | `--color-bg` | #07050f | #ffffff |
| moonlight | `--color-ghost` | #d8c4ff | #000000 |
| candleGold | `--color-moon-icon` | #d4a030 | — |
| ghostLavender | `--color-ghost-cap` | #ff4de8 | #5b2fa0 |
| neonAccent | `--color-accent` | #9254ff | #000000 |

Never hard-code hex values. Always read from CSS custom properties.

## Typography

- **Display / logo:** "Press Start 2P" (bundled SIL OFL, no CDN)
- **Body / UI:** system-ui / monospace fallback

## Rules (must hold in every change)

1. All brand art is **original** — no Pac-Man ghosts, Happy Mac, Kiro mascot,
   HyperCard art, or any known character.
2. No new npm packages, no external fonts, no CDN references.
3. Every colour pair must pass contrast in both themes; add to PAIR_LIST.
4. Money stays integer kobo; visible text follows plain-language.md.
5. Do not change `src/domain`, `src/domain-ui`, `src/storage`.
6. Do not edit `src/components/ghost/` (another spec owns it).
