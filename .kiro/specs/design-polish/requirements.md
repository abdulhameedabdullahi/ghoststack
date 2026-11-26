# Requirements Document

## Introduction

**Feature:** Design polish: ghost mascot, light spooky touches, a consistent retro styling pass, a contrast check, a small-screen layout pass and a screenshots list.

This spec makes GhostStack look finished and feel friendly. It adds no new feature and changes no behaviour.

It adds:

1. A small original pixel-art ghost mascot, drawn as an inline SVG React component, with no third-party artwork.
2. A header with the ghost and the app name, playful but plain empty-state lines, a subtle "moonlit" upgrade to the midnight theme, and a small success animation when a sale is recorded that respects `prefers-reduced-motion`.
3. One consistent retro styling pass over every card view, form, dialog and notice, using Theme variables only.
4. A contrast check: every text and background colour pair in both themes reaches at least 4.5:1, proven by a unit test that reads the palette from `theme.css`.
5. A layout pass at 360px and 768px wide: no sideways scrolling, readable line lengths, tap targets of at least 44px.
6. A documented manual list of screens to capture for the demo and the README.

Existing text that tests already check stays exactly as it is. The playful empty-state wording is added as an extra line next to the existing line, so the existing line is never replaced. Existing tests are not edited. No file in `src/domain/`, `src/domain-ui/` or `src/storage/` changes. The only logic added is one pure contrast function, which lives in a new file under `src/theme/` (not in the domain folders).

It builds on `ghoststack-foundation`, `app-shell-stock-card`, `sales-and-daily-summary`, `debts-card-ui`, `builder-mode-and-starter-stacks` and `pwa-offline-and-backup`, and follows `product.md`, `tech.md`, `design-retro.md`, `plain-language.md` and `money-rules.md`. No new package is added.

**Out of scope:** new features, new card types, new button actions, copyrighted characters or logos, sound, changes to domain logic or storage, changes to existing tests, changes to existing user-facing wording, a new font, an image or icon library.

## Glossary

- **App_Shell:** the React component in `src/App.tsx` that loads the Stack and shows the screens.
- **Theme_File:** `src/components/theme.css`, the only file that defines colour, font and spacing values.
- **Theme variables:** the CSS variables defined in the Theme_File.
- **Light_Theme:** the default theme, defined in the `:root` block of the Theme_File.
- **Midnight_Theme:** the dark theme, defined in the `[data-theme="midnight"]` block of the Theme_File.
- **Moonlit_Palette:** the updated set of Midnight_Theme values that gives the dark theme a soft blue-violet night look.
- **Palette_Pair:** a text colour variable and the background colour variable it is drawn on, listed in the Pair_List.
- **Pair_List:** the single list in `src/theme/palettePairs.ts` that names every Palette_Pair that the app uses.
- **Contrast_Ratio:** the WCAG 2.x relative-luminance ratio between two colours, from 1 to 21.
- **contrastRatio:** the pure function in `src/theme/contrast.ts` that takes two hex colours and returns the Contrast_Ratio.
- **Contrast_Minimum:** 4.5, the lowest Contrast_Ratio allowed for any Palette_Pair.
- **Ghost_Mascot:** the small original pixel-art ghost React component in `src/components/Ghost.tsx`.
- **Decorative_Ghost:** a Ghost_Mascot with `aria-hidden="true"` and no accessible name.
- **App_Header:** the new header at the top of the App_Shell that holds the Ghost_Mascot and the app name "GhostStack".
- **Empty_State:** the text and controls shown when a card has no items, no sales or no debts, and when no stack exists yet.
- **Empty_Tagline:** a short extra line shown in an Empty_State, in addition to the existing Empty_State text.
- **Existing_Text:** any user-facing string that an existing test checks, including the Starter_Chooser heading "Choose a starter" and intro line "Pick the one that is closest to your business.", "You have no items yet.", "No sales yet.", "You have no debts recorded yet.", "Sale recorded" and the "Midnight mode: on" and "Midnight mode: off" labels.
- **Sale_Notice:** the "Sale recorded" message shown by the Stock card after a sale is saved.
- **Success_Animation:** a short, small motion on the Sale_Notice.
- **Reduced_Motion:** the state in which the browser reports `prefers-reduced-motion: reduce`.
- **Surface:** one of the shared visual pieces: Card, Dialog, Field, Button, notice, tab bar, mode switch, form, picker and starter chooser.
- **Button_State:** one of default, hover, active (pressed), disabled and keyboard focus.
- **Small_Screen:** a viewport 360px wide.
- **Medium_Screen:** a viewport 768px wide.
- **Tap_Minimum:** 44px by 44px, the smallest size of a tap target.
- **Line_Length_Limit:** 70 characters, set with the `ch` unit as `70ch`, the largest width of a block of reading text.
- **Screenshot_List:** the manual list in `docs/SCREENSHOTS.md`.
- **Starter_Chooser:** the screen where the owner picks a starter stack.
- **Protected_Folders:** `src/domain/`, `src/domain-ui/` and `src/storage/`.

## Requirements

### Requirement 1: Original ghost mascot component

**User Story:** As a shop owner, I want a small friendly ghost in the app, so that GhostStack feels warm and has its own character.

#### Acceptance Criteria

1. THE Ghost_Mascot SHALL be a React component that renders one inline `<svg>` element and loads no image file and no network resource.
2. THE Ghost_Mascot SHALL draw a pixel-art ghost from square `<rect>` cells on a grid no larger than 16 by 16 cells, using `shape-rendering="crispEdges"`.
3. THE Ghost_Mascot SHALL take every fill colour from Theme variables through `currentColor` or `var(--...)` and SHALL contain no hard-coded colour value.
4. THE Ghost_Mascot SHALL be an original drawing and SHALL NOT copy any third-party artwork, character or logo.
5. THE Ghost_Mascot SHALL accept a `size` option and SHALL render at 24px, 48px or 96px square, with 48px as the default.
6. WHERE the Ghost_Mascot is given no `title`, THE Ghost_Mascot SHALL render as a Decorative_Ghost with `aria-hidden="true"`, `focusable="false"` and no `<title>` element.
7. WHERE the Ghost_Mascot is given a `title`, THE Ghost_Mascot SHALL render `role="img"`, a `<title>` element holding that text and no `aria-hidden` attribute.
8. THE Ghost_Mascot SHALL NOT take keyboard focus and SHALL NOT respond to clicks.
9. THE Ghost_Mascot SHALL use no animation of its own.
10. THE Ghost_Mascot SHALL use the same 16 by 16 pixel drawing as the GHOST grid in `scripts/generate-icons.mjs`, kept as a plain original ghost.

### Requirement 2: Header with ghost and app name

**User Story:** As a shop owner, I want to see the app name and the ghost at the top, so that I know I am in GhostStack.

#### Acceptance Criteria

1. THE App_Shell SHALL show the App_Header above the existing content on every screen, including the loading, choosing and error screens.
2. THE App_Header SHALL show one Decorative_Ghost and the text "GhostStack".
3. THE App_Header SHALL be a `<header>` landmark and SHALL hold the one `<h1>` of the app, with the text "GhostStack", and the existing headings (h2 and h3) SHALL keep their levels, text and accessible names.
4. THE App_Header SHALL use the pixel font from the Theme variables for the text "GhostStack" and a Card-style title bar built from Theme variables.
5. THE App_Header SHALL NOT contain a button, a link or any control that changes data.
6. THE App_Shell SHALL keep the existing "Midnight mode" button, its labels and its behaviour, and SHALL show it directly below the App_Header, as a sibling outside the `<header>` landmark and not as a child of the App_Header.
7. THE App_Header SHALL fit on a Small_Screen with no sideways scrolling, and the text "GhostStack" SHALL wrap instead of being cut off.
8. IF the App_Shell already has a "GhostStack" heading element, THEN THE App_Header SHALL hold that element, moved into the header and reused, and OTHERWISE THE App_Header SHALL add one new `<h1>` (today the App_Shell has none), so that the screen never shows a second copy of the app name heading.
9. THE Decorative_Ghost inside the App_Header SHALL take its colour from `var(--color-title-fg)`, so that it is drawn in the title bar text colour on the title bar background.

### Requirement 3: Friendly empty states

**User Story:** As a shop owner who is just starting, I want an empty screen to tell me what to do in a friendly way, so that I am never confused.

#### Acceptance Criteria

1. WHEN the Stock card has no items, THE Stock card view SHALL keep the Existing_Text "You have no items yet." and SHALL add the Empty_Tagline "Raise your first one!".
2. WHEN the Sales log card has no sales, THE Sales log card view SHALL keep the Existing_Text "No sales yet." and SHALL add the Empty_Tagline "Your first sale will show up here."
3. WHEN the Debts card has no debts, THE Debts card view SHALL keep the Existing_Text "You have no debts recorded yet." and SHALL add the Empty_Tagline "Nobody owes you anything right now."
4. THE Empty_Tagline SHALL be a separate element from the Existing_Text, so that a test that matches the Existing_Text finds exactly one element.
5. WHEN an Empty_State is shown, THE card view SHALL show one Decorative_Ghost of 48px next to the Empty_State text.
6. THE Empty_State SHALL keep the existing action button, its label and its position in the reading order after the text.
7. THE Empty_Tagline SHALL use simple English, short sentences and everyday words, and SHALL say the same thing in plain terms that a user with no spooky context can follow.
8. THE Starter_Chooser SHALL show one Decorative_Ghost of 48px next to its existing `<h2>` "Choose a starter", SHALL keep that heading as an `<h2>` with the same text, and SHALL keep every existing label, button and message.
9. THE Starter_Chooser SHALL add the new line "Pick a starter to raise your shop." below the existing intro line "Pick the one that is closest to your business.", and the existing intro line SHALL stay exactly as it is.
10. THE Empty_State SHALL show no money amount other than the amounts the card view already shows.

### Requirement 4: Moonlit midnight theme

**User Story:** As a shop owner working at night, I want a calm dark theme that still reads clearly, so that my eyes are comfortable.

#### Acceptance Criteria

1. THE Theme_File SHALL define the Moonlit_Palette by changing only values inside the `[data-theme="midnight"]` block, plus any new Theme variables added for it.
2. THE Moonlit_Palette SHALL use a blue-violet night background, a pale moon-white text colour and a warm gold accent.
3. THE Light_Theme SHALL keep its current black and white retro look, apart from any new Theme variable this spec adds.
4. WHEN a new Theme variable is added, THE Theme_File SHALL define it in both the Light_Theme and the Midnight_Theme.
5. THE Theme_File SHALL stay the only file that defines a colour, font size, font family or spacing value, and no other CSS or component file SHALL contain a hex colour, an `rgb()` colour or a named colour other than `transparent`, `inherit` and `currentColor`.
6. THE Midnight_Theme SHALL keep the Theme variable names that exist today.
7. THE toggle behaviour of the Midnight_Theme, including the `data-theme` attribute and the saved `ghoststack:theme` value, SHALL stay exactly as it is.
8. WHILE the Midnight_Theme is on, THE App_Shell SHALL show every piece of meaning with text or an icon together with colour, and SHALL NOT rely on colour alone.
9. WHEN the colour scan in Requirement 13 flags existing CSS, THE project SHALL change that CSS to use Theme variables, changing visual values only and no class name or behaviour.
10. THE `[data-theme="midnight"]` block of the Theme_File SHALL set `color-scheme: dark`.

### Requirement 5: Sale recorded animation

**User Story:** As a shop owner, I want a small sign that my sale was saved, so that I know it worked.

#### Acceptance Criteria

1. WHEN the Stock card shows the Sale_Notice, THE Sale_Notice SHALL play the Success_Animation once.
2. THE Success_Animation SHALL last between 300ms and 800ms and SHALL use only `transform` and `opacity`.
3. THE Success_Animation SHALL move the Sale_Notice by no more than 8px and SHALL NOT flash.
4. WHILE Reduced_Motion is on, THE Sale_Notice SHALL show with no animation.
5. THE Sale_Notice SHALL carry the animation class only WHILE Reduced_Motion is off, decided in a small hook that reads `window.matchMedia("(prefers-reduced-motion: reduce)")`.
6. IF `window.matchMedia` is missing, THEN THE hook SHALL report Reduced_Motion as on, so that no animation plays.
7. WHEN the Reduced_Motion setting changes while the app is open, THE hook SHALL update to match the new setting.
8. THE stylesheet SHALL also hold a `@media (prefers-reduced-motion: reduce)` rule that turns off every animation and transition added by this spec.
9. THE Sale_Notice SHALL keep the text "Sale recorded", its `role`, its position and its timing of showing and hiding exactly as they are.
10. THE Success_Animation SHALL NOT delay, block or change the saving of the sale, the stock count or any money value.
11. WHEN a sale is recorded, THE Sale_Notice SHALL stay one element that is never remounted and SHALL alternate the classes `sale-notice--pop` and `sale-notice--pop-b` by the parity of a sale counter, with both classes running the same keyframes defined under two names, so that two sales in a row each play the Success_Animation, with no change to the notice text, role, position or timing, and WHILE Reduced_Motion is on, THE Sale_Notice SHALL carry neither class.

### Requirement 6: Consistent retro styling pass

**User Story:** As a shop owner, I want every screen to look like it belongs to the same app, so that it feels trustworthy.

#### Acceptance Criteria

1. THE stylesheets SHALL give every Surface a border of `var(--border-width)` solid `var(--color-border)` where it has a border.
2. THE stylesheets SHALL give every Card, Dialog and picker a title bar that uses the title colours and the pixel font from the Theme variables.
3. THE stylesheets SHALL take every gap, padding and margin from the `--space-*` Theme variables.
4. THE Theme_File SHALL define the Theme variables for the title bar font size, body font size, line height and corner style, and THE stylesheets SHALL read those variables instead of fixed values.
5. THE Button SHALL show five Button_States: default, hover, active, disabled and keyboard focus.
6. THE hover state SHALL change the background and the text colour, and SHALL add an underline on the label and a thicker border drawn with an inset shadow, so that the hover state does not rely on colour alone.
7. THE active state SHALL show a visible pressed look that differs from the hover state.
8. THE disabled state SHALL keep the label readable at the Contrast_Minimum and SHALL show a different look from the default state without lowering the text contrast.
9. THE keyboard focus state SHALL keep the shared `:focus-visible` outline and SHALL show the outline on every interactive element.
10. THE existing Button variants (main and danger) SHALL each keep their current class names and meaning.
11. THE forms and Fields SHALL show the label, the input and the error message in one consistent order and style, with the error text shown together with an icon or the word "Problem:" in a separate element, as set in criterion 16, so that colour is not the only sign.
12. THE Dialog, NoticeArea, Backup_Controls, Stack_Picker, Tab_Bar and Mode_Switch SHALL use the same border, title bar, spacing and Button_State rules as the Card.
13. THE styling pass SHALL change no class name, no `id`, no `role`, no accessible name and no existing text, and SHALL change no DOM structure except the additions that this spec lists.
14. THE existing shared components Card, Button, Field and Dialog SHALL be reused, and no new component SHALL repeat their styles.
15. THE styling pass SHALL keep every control one main action with a clear label.
16. THE error icon or the word "Problem:" SHALL be placed in a separate element with `aria-hidden="true"` next to the message element, for field errors (`span.field__error` with `role="alert"`) and for form-level error paragraphs (`p.item-form__error` with `role="alert"`), and THE message element and its text SHALL stay exactly as they are, so that a test that reads the alert text gets only the message.

### Requirement 7: Contrast function

**User Story:** As a maintainer, I want one trusted function that measures contrast, so that every colour pair can be checked the same way.

#### Acceptance Criteria

1. THE `contrastRatio` function SHALL take two colours given as `#rgb` or `#rrggbb` hex text and return a number.
2. THE `contrastRatio` function SHALL compute the WCAG 2.x ratio `(L1 + 0.05) / (L2 + 0.05)` from the relative luminance of each colour, with `L1` the larger luminance.
3. THE `contrastRatio` function SHALL return the same number for two colours in either order.
4. THE `contrastRatio` function SHALL return a number from 1 to 21 for any two valid colours.
5. THE `contrastRatio` function SHALL return 21 for black `#000000` on white `#ffffff`, and 1 for any colour on itself.
6. IF a colour is not valid `#rgb` or `#rrggbb` hex text, THEN THE `contrastRatio` function SHALL throw an error that names the bad value.
7. THE `contrastRatio` function SHALL be pure and SHALL live outside the Protected_Folders, in `src/theme/contrast.ts`.
8. THE `src/theme/` module SHALL provide a `parseThemeVariables` function that takes the text of the Theme_File and returns the variables of the `:root` block and of the `[data-theme="midnight"]` block as two maps, with the midnight map holding the Light_Theme value for any variable it does not set. THE `parseThemeVariables` function SHALL read only the top-level `:root` block and the top-level `[data-theme="midnight"]` block and SHALL ignore the contents of at-rules such as `@media`, `@supports` and `@font-face`. THE `parseThemeVariables` function SHALL handle CSS comments, SHALL resolve `var()` references, including chains, to their final hex values, SHALL fail with a clear error WHEN a reference forms a cycle or names an unknown variable, and SHALL throw a clear error that names the variable and its value WHEN a colour variable is not a hex colour.

### Requirement 8: Palette contrast check

**User Story:** As an owner with weak eyesight or a bright market stall, I want text that is easy to read in both themes, so that I make no mistakes with money.

#### Acceptance Criteria

1. THE Pair_List SHALL name every text and background pair that the app draws, and SHALL include at least: body text on page background, muted text on page background, muted text on card background, title text on title background, accent-coloured button text on accent background, danger text on danger background, warning text on warning background, focus outline on page background, and the hover, active, disabled, error text, notice text, selected tab and unselected tab pairs.
2. THE unit test SHALL read `theme.css` from disk, parse both themes with `parseThemeVariables`, and compute the Contrast_Ratio for every Palette_Pair in both the Light_Theme and the Midnight_Theme.
3. THE unit test SHALL fail WHEN any text Palette_Pair in either theme has a Contrast_Ratio below the Contrast_Minimum.
4. THE unit test SHALL fail WHEN the focus outline and the border on the page background have a Contrast_Ratio below 3.
5. THE unit test SHALL fail WHEN a colour variable named in the Pair_List is missing from the Theme_File.
6. THE unit test SHALL fail WHEN the Theme_File defines a `--color-*` variable that is neither named in the Pair_List nor listed in a short, commented "not used for text" list in `src/theme/palettePairs.ts`.
7. THE unit test SHALL report the failing pair, the theme and the measured ratio in its failure message.
8. THE palette in the Theme_File SHALL pass the unit test in both themes once this spec is done.
9. THE disabled Button text on its background SHALL be in the Pair_List and SHALL meet the Contrast_Minimum.
10. THE unit test SHALL fail WHEN the ghost fill colour against its background, the header ghost colour (`--color-title-fg`) against the title bar background (`--color-title-bg`), or the border colour against the page background or the card background, has a Contrast_Ratio below 3 in either the Light_Theme or the Midnight_Theme, and SHALL report each failure like the other failures.

### Requirement 9: Small and medium screen layout

**User Story:** As a shop owner on a small phone or a tablet, I want every screen to fit and be easy to tap, so that I never have to scroll sideways or hunt for a button.

#### Acceptance Criteria

1. THE stylesheets SHALL set `box-sizing: border-box` and SHALL give the page no horizontal overflow on a Small_Screen or a Medium_Screen.
2. THE stylesheets SHALL let long words, shop names, item names and customer names wrap with `overflow-wrap: anywhere` instead of widening the page.
3. THE stylesheets SHALL limit every block of reading text to the Line_Length_Limit and SHALL centre the app content with a maximum content width set by a Theme variable.
4. THE stylesheets SHALL give every button, tab, checkbox row, file chooser, form input, select and close control a tap target of at least the Tap_Minimum.
5. THE stylesheets SHALL leave at least `var(--space-2)` between two neighbouring tap targets.
6. THE Tab_Bar SHALL fit on a Small_Screen with all tabs reachable, either by wrapping or by sideways scrolling inside the Tab_Bar only, and SHALL NOT widen the page.
7. THE data lists (stock rows, sale rows, debt rows) SHALL stack their parts in one column on a Small_Screen and MAY show them in columns on a Medium_Screen.
8. WHERE the viewport is at least 768px wide, THE stylesheets SHALL use a larger content width and larger spacing from Theme variables, and SHALL keep one column of cards.
9. THE layout pass SHALL work with the browser text size raised to 200% on a Small_Screen with no text cut off and no sideways scrolling.
10. THE layout pass SHALL work in both the Light_Theme and the Midnight_Theme.
11. THE viewport meta tag in `index.html` SHALL keep `width=device-width, initial-scale=1` and SHALL NOT block zoom.

### Requirement 10: Screenshots list

**User Story:** As a maintainer preparing the demo and the README, I want a written list of screens to capture, so that the screenshots are complete and consistent.

#### Acceptance Criteria

1. THE project SHALL include the Screenshot_List at `docs/SCREENSHOTS.md`.
2. THE Screenshot_List SHALL give a numbered list of screens, each with a file name, the viewport width, the theme, the mode and the steps to reach it.
3. THE Screenshot_List SHALL include at least: the starter chooser, the Stock card with items, the Stock card empty state, the "Sale recorded" notice, the Sales log, the Debts card, the Daily summary, Builder mode, the backup controls, and the update and offline notices.
4. THE Screenshot_List SHALL ask for each key screen in the Light_Theme and the Midnight_Theme, at 360px and at 768px width.
5. THE Screenshot_List SHALL say how to set the browser to 360px and 768px width, how to turn on Midnight mode, how to seed sample data with "Add sample items", and how to keep the "reduced motion" setting off while capturing the animation.
6. THE Screenshot_List SHALL use file names in the form `NN-screen-name-WIDTH-THEME.png`, saved in a `docs/screenshots/` folder.
7. THE Screenshot_List SHALL be written in simple English with numbered steps.
8. THE Screenshot_List SHALL need no script and no new package.

### Requirement 11: Plain wording

**User Story:** As a non-technical owner, I want every word on screen to be simple and clear, so that spooky touches never confuse me.

#### Acceptance Criteria

1. THE new user-facing text in this spec SHALL use simple English, short sentences and everyday words.
2. WHERE spooky wording is used, THE wording SHALL stay light and optional, and SHALL NOT replace or hide the plain meaning of any message, button or label.
3. THE new user-facing text SHALL NOT contain the words "kobo", "schema", "payload", "cache", "serialize" or "inventory records".
4. THE Ghost_Mascot SHALL carry no meaning that is not also given by text.
5. THE new Empty_Taglines SHALL end with a full stop or an exclamation mark and SHALL have no more than 8 words.

### Requirement 12: Property-based tests

**User Story:** As a maintainer, I want property tests for the one piece of logic this spec adds, so that the contrast numbers can be trusted.

#### Acceptance Criteria

1. THE test suite SHALL include a fast-check property that, for any two valid hex colours, `contrastRatio(a, b)` equals `contrastRatio(b, a)`.
2. THE test suite SHALL include a fast-check property that, for any two valid hex colours, `contrastRatio(a, b)` is at least 1 and at most 21.
3. THE test suite SHALL include a unit test that `contrastRatio("#000000", "#ffffff")` equals 21.
4. THE test suite SHALL include a fast-check property that, for any valid hex colour, `contrastRatio(a, a)` equals 1.
5. THE test suite SHALL include a fast-check property that, for any valid 3-digit hex colour, `contrastRatio` gives the same result as for its 6-digit form.
6. THE test suite SHALL run each property for at least 100 runs.
7. THE test suite SHALL include a unit test that `contrastRatio` throws for text that is not valid hex.
8. THE test suite SHALL NOT use property-based tests for the Ghost_Mascot, the styles, the layout or the screenshots list.
9. THE test suite SHALL include unit tests that `parseThemeVariables` ignores CSS comments, resolves `var()` references and chains to final hex values, fails clearly on a cycle or an unknown reference, and throws an error that names the variable and value WHEN a colour variable is not a hex colour.
10. THE test suite SHALL include a unit test that `parseThemeVariables` ignores a `:root` block placed inside an `@media` rule, so that its values do not change the parsed result.

### Requirement 13: Component tests

**User Story:** As a maintainer, I want example tests for the mascot and the motion rule, so that accessibility and motion settings stay correct.

#### Acceptance Criteria

1. THE test suite SHALL include a component test that a Ghost_Mascot with no `title` has `aria-hidden="true"`, `focusable="false"` and no `<title>`.
2. THE test suite SHALL include a component test that a Ghost_Mascot with a `title` has `role="img"`, an accessible name equal to that title and no `aria-hidden`.
3. THE test suite SHALL include a component test that the Ghost_Mascot renders at each of the three sizes and uses no hard-coded colour value.
4. THE test suite SHALL include a component test that the App_Header shows the text "GhostStack" and a Decorative_Ghost.
5. THE test suite SHALL include component tests that each Empty_State shows its Existing_Text and its Empty_Tagline, and that the Existing_Text is matched by exactly one element.
6. THE test suite SHALL include a component test that the Sale_Notice carries the animation class WHEN Reduced_Motion is off, and does not carry it WHEN Reduced_Motion is on.
7. THE test suite SHALL include a component test that the animation hook reports Reduced_Motion as on WHEN `window.matchMedia` is missing, and updates WHEN the setting changes.
8. THE test suite SHALL include a unit test that reads the stylesheets of this spec and checks that a `prefers-reduced-motion: reduce` rule exists.
9. THE test suite SHALL include a unit test that reads every `.css` file other than the Theme_File, strips comments and quoted strings first, checks property values only, and checks that they hold no hex colour, no `rgb()` colour and no named colour other than `transparent`, `inherit` and `currentColor`, while ignoring hyphenated words (such as class-like or custom-property names, for example "light-blue-ish" or "--color-red") and allowing media query breakpoints and `ch` units. THE unit test is expected to flag existing CSS, and THE fix SHALL be to change that CSS to Theme variables and never to loosen the test.
10. THE test suite SHALL include a unit test that reads `docs/SCREENSHOTS.md` and checks that it exists and lists the screens named in Requirement 10.3.
11. THE test suite SHALL include a component test that records two sales within 3 seconds and proves that, after two sales, the Sale_Notice is the same DOM node (strict reference equality) and its class changes from one pop class (`sale-notice--pop` or `sale-notice--pop-b`) to the other, while the text stays "Sale recorded".
12. THE test suite SHALL include a unit test that the cells drawn by the Ghost_Mascot match the GHOST grid of `scripts/generate-icons.mjs`, or are copied from one shared constant, so that the two cannot drift.
13. THE test suite SHALL stub `window.matchMedia` with a controllable mock, from a test helper that returns a MediaQueryList-like object, lets the test flip `matches` and fires the change listeners, and SHALL include a case where `matchMedia` is deleted.

### Requirement 14: No change to existing behaviour

**User Story:** As a maintainer, I want this polish to be purely visual, so that nothing that works today breaks.

#### Acceptance Criteria

1. THE project SHALL keep every existing test file unchanged, and every existing test SHALL pass after this spec is done.
2. THE project SHALL change no file in the Protected_Folders.
3. THE project SHALL add no package, and SHALL add no font, image or icon file other than the inline SVG component.
4. THE project SHALL change no existing user-facing text, accessible name, `role`, class name or `id`, and SHALL only add new elements and new text.
5. THE project SHALL add no new button action, no new card type, no new route and no new storage key.
6. THE project SHALL add no sound and no network request.
7. THE project SHALL keep the app working offline, and the production build SHALL still pass `npm run check:pwa`.
8. THE project SHALL keep the Tab_Bar, Mode_Switch, Dialog and form focus behaviour exactly as it is.
9. THE project SHALL keep `npm run build` passing with TypeScript strict mode on.
