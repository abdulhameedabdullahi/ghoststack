---
inclusion: fileMatch
fileMatchPattern: ["src/components/**/*", "src/**/*.css"]
---
# Design: retro Mac with a spooky twist

## Look

- Early-Mac feel: black and white base, chunky 2px borders, pixel-style font,
  simple icons, card "windows" with title bars.
- Halloween touches: a small ghost mascot, a dark "midnight" mode, playful
  wording (for example "Raise a new card"). Spooky elements must never reduce
  clarity.

## Usability rules

- Mobile first. Tap targets at least 44px.
- High contrast. Never rely on colour alone to show meaning.
- One main action per screen, clearly labelled.
- Every card works in both Builder mode and Play mode; Play mode is clean and
  minimal.
- Show friendly empty states and error messages.

## Implementation

- All colours, fonts, and spacing come from CSS variables in one theme file.
- Reuse shared components (Card, Button, Field) instead of repeating styles.
