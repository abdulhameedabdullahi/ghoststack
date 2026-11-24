# Manual check: App shell and Stock card (task 9.3)

## How this was done

No human opened the app in a browser. The checks below were run by an AI agent in two ways:

- **Automated Chrome run.** Headless Chrome 159 (already installed on this machine) was driven over the Chrome DevTools Protocol by a throwaway Node script. The script ran against the Vite **dev server** (so React StrictMode was active). It used a 360x740 mobile viewport and emulated `prefers-color-scheme: dark`. No dependency was installed and the script was deleted afterwards. It is not in the repo, so these results can't be re-run from the repo.
- **Code inspection** of `index.html`, `theme.css`, the shared components and the Stock card files.

Marking: **Verified (automated Chrome)** means the throwaway script observed it in headless Chrome. **Verified (code)** means read from source only. **Not verified** means a person still needs to check it.

Limits of the automated run: headless Chrome, not a real phone, no real touch input, nobody looked at the screen. Keyboard focus was driven with synthetic Tab key events. The production build (`dist/`) was not run in the browser. Only dev-server behaviour was observed.

## Mobile at 360px (Req 7.5, 7.6, 7.7)

| Item | Status | How |
|---|---|---|
| No sideways scrolling, list view | Verified (automated Chrome) | `scrollWidth` 360 = `clientWidth` 360 |
| No sideways scrolling, form open with field errors and a very long unbroken item name | Verified (automated Chrome) | Same measure, 360 = 360 |
| Every Button and Field input at least 44px high and wide, all inside 360px | Verified (automated Chrome) | Measured every `button` and `input` in the list view and the form view. None was under 44px or past the right edge. |
| Visible focus outline on keyboard focus | Verified (automated Chrome) | Tab key on 6 controls (toggle, Add an item, Edit, Delete) and on a Field input. All matched `:focus-visible` with a 3px solid outline. |
| Looks right to a human on a phone | Not verified (needs a human in the browser) | |

## Midnight mode (Req 6.4 to 6.8)

| Item | Status | How |
|---|---|---|
| First load follows device dark setting when nothing is saved | Verified (automated Chrome) | Cleared site data, emulated dark. `data-theme` was `midnight`. |
| No light flash | Verified (automated Chrome), with a limit | A paint observer recorded `data-theme=midnight` and body background `rgb(11,11,18)` at first-paint and first-contentful-paint. Headless Chrome cannot show a flash a person would see on a slow device. |
| Toggle switches at once | Verified (automated Chrome) | Click changed `data-theme` to `light`, body background to white, and the label, with no reload. |
| Choice survives reload | Verified (automated Chrome) | Saved "light" survived a reload while the device was dark. Saved "midnight" survived a reload. |
| Label says "Midnight mode: on/off" | Verified (automated Chrome) | Both texts were seen. |
| First load follows device setting when device is light | Not verified (needs a human in the browser) | Only the dark device case was run. The code path in `index.html` is the same `matchMedia` check. |
| Contrast of 4.5 to 1 (Req 6.8) | Partly verified (automated Chrome) | Computed body text, title bar and main Button: light 21:1 for all; midnight 17.8:1, 17.8:1 and 13.6:1. Warning badge, muted text and error colours were not measured here. |
| Blocked `localStorage` falls back (Req 6.11) | Verified (code) | `try/catch` around `localStorage` and `matchMedia` in `index.html` and in `toggleTheme` in `src/App.tsx`. Not run with storage blocked. |

## Stock card (Req 8.2 to 8.6, 9.5, 11.1 to 11.3)

| Item | Status | How |
|---|---|---|
| Empty state: "You have no items yet." and one "Add an item" button | Verified (automated Chrome) | Page text read, exactly one such button. |
| Add an item (valid, with `₦ 1,250.50` typed) | Verified (automated Chrome) | Item appeared with `₦1,250.50`. |
| Cancel adds nothing | Verified (automated Chrome) | |
| Edit: form pre-filled, prices as Naira text, change saved | Verified (automated Chrome) | Fields were `Beans, 3, ₦100.00, ₦150.00, 5`. Quantity changed to 50 and saved. |
| Delete asks first, shows the item name, has "Delete item" (danger) and "Keep item" | Verified (automated Chrome) | Text and the `button--danger` class on "Delete item". |
| "Keep item" changes nothing | Verified (automated Chrome) | |
| "Delete item" removes the item | Verified (automated Chrome) | |
| Out of stock warning with icon and text | Verified (automated Chrome) | "✖ Out of stock" shown, icon is `aria-hidden`, and "Low stock" is not shown on the same row. |
| Low stock warning with icon and text | Verified (automated Chrome) | "⚠ Low stock" on an item with quantity 3, level 5. It disappeared at quantity 50. |
| Form errors next to the right Field, typed text kept | Verified (automated Chrome) | All five fields filled badly. Each had its own error message linked by `aria-describedby`. All five typed values were still there after the failed save. |
| Domain error with no single Field shows at top of form | Not verified (needs a human in the browser) | Hard to trigger from the UI. Code path read: `StockCardView.tsx` sets `formError` from the domain error. |
| Domain error on delete keeps the item and shows the message | Not verified (needs a human in the browser) | Hard to trigger. Code path read: `handleDelete` sets `deleteError` and returns. |
| Warning colours, wording and look judged by a person | Not verified (needs a human in the browser) | |

## Storage (Req 12.2, 12.4, 12.13)

| Item | Status | How |
|---|---|---|
| Items survive reload | Verified (automated Chrome) | "Rice" and its price were there after a reload. |
| Only one Starter_Stack under StrictMode in dev | Verified (automated Chrome) | Page was the Vite dev build. IndexedDB had one Stack ("Provisions shop") after first load, and still one after reload. |
| Add and save work while offline | Verified (automated Chrome), with a limit | Network emulated offline, then an item was added. It showed on screen, was found in IndexedDB, and no "Try again" appeared. |
| App loads from cold start with no network | Not verified (needs a human in the browser) | Not applicable yet. There is no service worker (PWA is out of scope), so a reload with no network would fail to fetch the page itself. |
| No font or other network request (dev server) | Verified (automated Chrome) | Recorded every request across 4 page loads. All went to `localhost:5199`. The font came from `/src/components/fonts/PressStart2P-Regular.woff2`. |
| No font or other network request (production build) | Verified (code) only | Searched `dist/index.html`, the built CSS and JS for Google Fonts, `@import` and `http(s)://`. The only matches in the JS are the react.dev error-message link and XML namespace strings, not requests. The built app was not loaded in the browser. |
| Storage error and "Try again" flow (Req 12.7) | Not verified (needs a human in the browser) | Code read in `src/App.tsx`. No save failure was forced. |

## Needs a human

1. Open the app on a real phone (or Chrome DevTools device mode) and look at it at 360px in light and midnight. Check it reads well.
2. Check first load with the device set to light and nothing saved.
3. Run the production build (`npm run build`, then `npx vite preview`) and watch the Network tab once.
4. Optionally force a save failure (for example, block site data) to see the storage message and "Try again".

## Observations (no change made)

- Req 6.2 allows the pixel font on "the Card title bar and the screen heading". There is no screen heading in `src/App.tsx`, only the Card title. This does not break a check above.
- `listStacks()` in the load effect of `src/App.tsx` is not inside a `try/catch`. If it throws, the page would stay on "Opening your shop…". Not triggered here.
