# Implementation Plan: Design polish

## Overview

Build from the bottom up. First the pure theme code in `src/theme/` (`contrastRatio`, `parseThemeVariables`, `palettePairs`), then the new variables and Moonlit palette in `theme.css`, checked by a contrast test that reads `theme.css` from disk. Then the pixel ghost, the reduced-motion hook with its test helper, the app header, and the empty states.

Global rules: do not edit existing tests (new cases go in new files). Make no change in `src/domain`, `src/domain-ui` or `src/storage`. Add no new package. Property tests run at least 100 cases.

## Tasks

- [x] 1. Contrast function
  - [x] 1.1 Create `src/theme/contrast.ts` with `contrastRatio`
    - Accept 3-digit and 6-digit hex colours, compute relative luminance, and divide the larger by the smaller (each plus 0.05). Throw an error that names the bad value for any non-hex input. No React, no storage.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  - [x] 1.2 Write unit tests in `src/theme/contrast.test.ts`
    - Black on white equals 21. A bad hex value throws and the message contains that value.
    - _Requirements: 12.3, 12.7_
  - [x] 1.3 Write property tests in `src/theme/contrast.property.test.ts`
    - Tag each with `// Feature: design-polish, Property N: ...`. Properties: the ratio is symmetric, it lies between 1 and 21, a colour on itself gives 1, and a 3-digit colour equals its 6-digit form.
    - **Property 1: Contrast ratio is symmetric**
    - **Property 2: Contrast ratio is between 1 and 21**
    - **Property 3: A colour on itself has ratio 1**
    - **Property 4: 3-digit and 6-digit hex give the same ratio**
    - **Validates: Requirements 12.1, 12.2, 12.4, 12.5, 12.6**

- [x] 2. Theme variable parser
  - [x] 2.1 Create `src/theme/parseThemeVariables.ts`
    - Read only the top-level `:root` and `[data-theme="midnight"]` blocks. Skip the contents of at-rules, strip comments, and resolve `var()` chains. Report cycles and unknown references as errors. A non-hex final value is an error naming the variable and the value.
    - _Requirements: 7.8_
  - [x] 2.2 Write unit tests in `src/theme/parseThemeVariables.test.ts`
    - Cover comments, `var()` chains, a cycle, an unknown reference, a non-hex value, and a `:root` block inside `@media` that must be ignored.
    - _Requirements: 12.9, 12.10_

- [x] 3. Palette
  - [x] 3.1 Create `src/theme/palettePairs.ts`
    - List the 23 pairs from `design.md`, including "ghost on title bar", with the minimum ratio for each. Add the `NOT_USED_FOR_TEXT` list with a one-line comment per variable.
    - _Requirements: 8.1, 8.6, 8.9, 8.10_
  - [x] 3.2 Update `src/components/theme.css`
    - Add the new variables in both themes. Use the Moonlit_Palette values from `design.md` in the midnight block and add `color-scheme: dark;` there. Leave the light theme values unchanged.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.10, 6.4_
  - [x] 3.3 Write the palette contrast test in `src/theme/palette.contrast.test.ts`
    - Read `theme.css` from disk and check every pair in both themes. A failure message names the pair, the theme and the ratio. Require 4.5 for text pairs and 3 for UI pairs. Fail on any `--color-*` variable that is in no pair and not in `NOT_USED_FOR_TEXT`.
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.10_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npx vitest run` and `npx tsc --noEmit`. Ask the user if questions arise.

- [x] 5. Ghost
  - [x] 5.1 Create `src/components/ghostGrid.ts` and `src/components/Ghost.tsx`
    - Export the shared `GHOST_GRID` constant. `Ghost` draws one `rect` per filled cell with `shape-rendering="crispEdges"` and `currentColor`. Size is 24, 48 or 96 (default 48). Without a title it is decorative (`aria-hidden`). With a title it has an accessible name. No focus, no animation.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_
  - [x] 5.2 Write component tests in `src/components/Ghost.test.tsx`
    - Check decorative and titled accessibility, the three sizes, and that no colour is hard-coded.
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 5.3 Write `src/components/ghostGrid.test.ts`
    - Read `scripts/generate-icons.mjs` as text, find the `GHOST` array, and check it equals `GHOST_GRID` (16 rows of 16 characters). Do not change the icon output.
    - _Requirements: 13.12_

- [x] 6. Reduced motion
  - [x] 6.1 Create `src/components/useReducedMotion.ts`
    - Read `prefers-reduced-motion: reduce` through `matchMedia`. If `matchMedia` is missing, return reduced. Follow `change` events and remove the listener on unmount.
    - _Requirements: 5.5, 5.6, 5.7_
  - [x] 6.2 Create the `matchMedia` mock helper and hook tests
    - Add a helper in `src/test/mockMatchMedia.ts` that can flip `matches`, fire a `change` event, and delete `matchMedia`. Write `src/components/useReducedMotion.test.tsx` using it.
    - _Requirements: 13.7, 13.13_

- [x] 7. App header
  - [x] 7.1 Check for an existing title
    - List the existing tests that query "GhostStack" or heading roles, and confirm `App.tsx` has no GhostStack element. If one exists, move it into the header instead of adding a second `h1`.
    - _Requirements: 2.1, 2.9_
  - [x] 7.2 Create `src/components/AppHeader.tsx` and `AppHeader.css`
    - A `header` landmark with one `h1` "GhostStack" and a decorative ghost coloured `var(--color-title-fg)`. No props or children. Pixel font, title bar colours, and wrapping that works at 360px.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9_
  - [x] 7.3 Insert `AppHeader` in `src/App.tsx`
    - Render it first in every screen (loading, choosing, error, normal), with the Midnight button directly below as a sibling. Leave all labels unchanged.
    - _Requirements: 2.1, 2.6, 14.4_
  - [x] 7.4 Write tests in `src/components/AppHeader.test.tsx`
    - Check the landmark, one `h1`, the title text, and that the header shows on every load state.
    - _Requirements: 13.4_

- [x] 8. Empty states
  - [x] 8.1 Update the Stock, Sales log and Debts empty states
    - Add each tagline as its own element and a decorative 48px ghost. Keep the Existing_Text and the action button order unchanged.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.10, 11.1, 11.2, 11.3, 11.4, 11.5_
  - [x] 8.2 Update `StarterChooser.tsx`
    - Put a decorative ghost next to the existing `h2` "Choose a starter". Add the line "Pick a starter to raise your shop." below the existing intro.
    - _Requirements: 3.8, 3.9_
  - [x] 8.3 Write component tests for the empty states and the chooser
    - Check that each Existing_Text matches exactly one element and that the taglines show.
    - _Requirements: 13.5_

- [x] 9. Sale notice animation
  - [x] 9.1 Add the animation to the Stock card view
    - Alternate `sale-notice--pop` and `sale-notice--pop-b` by sale counter parity on the same element, with no `key` remount. Add neither class when `useReducedMotion` reports reduced. Define two identical `@keyframes` using only transform and opacity, lasting 300 to 800ms, moving at most 8px, with no flash. Add an `@media (prefers-reduced-motion: reduce)` rule. Text, role, position and timing stay unchanged, and saving is not affected.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.8, 5.9, 5.10, 5.11_
  - [x] 9.2 Write component tests in a new file next to the Stock card view
    - Use the `matchMedia` mock. The class is on when motion is allowed and off when reduced. Two sales within 3 seconds keep the same DOM node and the class changes. The text stays "Sale recorded".
    - _Requirements: 13.6, 13.11_

- [x] 10. Checkpoint - Ensure all tests pass
  - Run `npx vitest run` and `npx tsc --noEmit`. Ask the user if questions arise.

- [x] 11. Styling pass
  - Use theme variables only. Change no class name, id, role, accessible name or text.
  - [x] 11.1 Style Button states in `Button.css`
    - Hover: underline plus `box-shadow: inset 0 0 0 var(--border-width) currentColor`. Active: a pressed look. Disabled: text readable at 4.5. Only `:focus-visible` uses the focus colour. The main and danger variants keep their classes.
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_
  - [x] 11.2 Style Card and Dialog title bars, borders and spacing
    - Use `--space-*` variables for spacing.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.12, 6.14_
  - [x] 11.3 Style field and form errors
    - Add an icon or the word "Problem:" in a separate `aria-hidden` element next to the unchanged message element (`span.field__error`, `p.item-form__error`).
    - _Requirements: 6.11, 6.16_
  - [x] 11.4 Style NoticeArea, Backup_Controls, Stack_Picker, Tab_Bar, Mode_Switch and Starter_Chooser surfaces
    - _Requirements: 4.8, 6.12, 6.13, 6.15_

- [x] 12. CSS checks
  - [x] 12.1 Write the colour scan test in `src/theme/css.colours.test.ts`
    - Scan every `.css` file except `theme.css`. Strip comments and quoted strings, check property values only, ignore hyphenated words, and allow media breakpoints and `ch` units. If the test flags CSS, change the CSS to Theme variables. Never loosen the test.
    - _Requirements: 4.5, 4.9, 13.9_
  - [x] 12.2 Write a test that a `prefers-reduced-motion: reduce` rule exists
    - Check the CSS files from disk.
    - _Requirements: 13.8_

- [x] 13. Layout pass
  - [x] 13.1 Set base layout rules
    - Set `box-sizing`, prevent horizontal overflow, use `overflow-wrap: anywhere`, limit reading text to `70ch`, and add a max content width variable. At 768px and wider use larger width and spacing with one column.
    - _Requirements: 9.1, 9.2, 9.3, 9.8_
  - [x] 13.2 Set tap targets and spacing
    - Use 44px tap targets and `var(--space-2)` gaps. The tab bar fits without widening the page. Data lists stack at 360px.
    - _Requirements: 9.4, 9.5, 9.6, 9.7_
  - [x] 13.3 Check 200% text size and both themes
    - Confirm the viewport meta tag in `index.html` is unchanged.
    - _Requirements: 9.9, 9.10, 9.11_

- [x] 14. Screenshots
  - [x] 14.1 Write `docs/SCREENSHOTS.md`
    - List numbered screens, named `NN-screen-name-WIDTH-THEME.png` and stored in `docs/screenshots/`. Cover widths 360 and 768 and the light and midnight themes. Give steps for each screen. Turn reduced motion off for the animation screen.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.1_
  - [x] 14.2 Write a test in `src/theme/screenshots.test.ts`
    - Check that `docs/SCREENSHOTS.md` exists and lists the screens named in Requirement 10.3.
    - _Requirements: 13.10_

- [ ] 15. Final checkpoint
  - [x] 15.1 Run `npx vitest run` and `npx tsc --noEmit`
    - Fix failures in new code only. Edit no existing test. Change nothing in `src/domain`, `src/domain-ui` or `src/storage`. Add no package.
    - _Requirements: 14.1, 14.2, 14.3, 14.5, 14.6, 14.8_
  - [x] 15.2 Run `npm run build`
    - `package.json` has no `check:pwa` script (checked), so skip it.
    - _Requirements: 14.7, 14.9_
  - [~] 15.3 Check by hand at 360px and 768px
    - Test both themes with visible keyboard focus and write the result in `docs/SCREENSHOTS.md`. This needs a person with a browser.
    - _Requirements: 6.9, 9.9, 9.10_

## Notes

- Existing tests are not edited. New cases go in new files.
- `src/domain`, `src/domain-ui` and `src/storage` are protected and not changed.
- There is no lint script.
- Property tests apply only to `contrastRatio`. Everything else uses unit and component tests.
- Task 15.3 needs a real browser and stays open until a person has run it.
- Tasks 11.1 to 11.4 and 13.1 to 13.2 edit CSS files that may overlap, so each runs in its own wave.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2"] },
    { "id": 3, "tasks": ["3.3"] },
    { "id": 4, "tasks": ["4"] },
    { "id": 5, "tasks": ["5.1", "6.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.2", "7.1"] },
    { "id": 7, "tasks": ["7.2", "8.1", "8.2"] },
    { "id": 8, "tasks": ["7.3", "8.3", "9.1"] },
    { "id": 9, "tasks": ["7.4", "9.2"] },
    { "id": 10, "tasks": ["10"] },
    { "id": 11, "tasks": ["11.1", "12.2", "14.1"] },
    { "id": 12, "tasks": ["11.2", "14.2"] },
    { "id": 13, "tasks": ["11.3"] },
    { "id": 14, "tasks": ["11.4"] },
    { "id": 15, "tasks": ["12.1"] },
    { "id": 16, "tasks": ["13.1"] },
    { "id": 17, "tasks": ["13.2"] },
    { "id": 18, "tasks": ["13.3"] },
    { "id": 19, "tasks": ["15.1"] },
    { "id": 20, "tasks": ["15.2"] },
    { "id": 21, "tasks": ["15.3"] }
  ]
}
```
