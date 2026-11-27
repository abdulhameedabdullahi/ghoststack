# Design Document

## Overview

The ghost gets a small brain (a pure function), a small body (SVG cells in a few poses) and a small voice (one speech bubble). Screens only say what happened, with `react("saleRecorded")`. They never know about poses, timers or bubbles.

Rules that hold for the whole design:

- Presentation only. No change in `src/domain/`, `src/domain-ui/` or `src/storage/`, and none of them imports from `src/components/ghost/`.
- No new package, no image, no library.
- Existing tests are not edited. Every screen works with no provider (the hook returns a do-nothing `react`).
- The existing `Ghost` component, `ghostGrid.ts` and `GhostGuide` wording stay. The new `GhostMascot` reads `GHOST_GRID` and does not replace `Ghost`.

### Files (all new unless marked)

| File | What it holds |
| --- | --- |
| `src/components/ghost/ghostTypes.ts` | `GhostMood`, `GHOST_MOODS`, `isGhostMood`, `isRestingMood`, `GhostEvent`, `GhostState` |
| `src/components/ghost/ghostMachine.ts` | `initialState(midnight)` and `next(state, event)`. Pure. |
| `src/components/ghost/ghostMachine.property.test.ts` | Property tests for the machine |
| `src/components/ghost/ghostFrames.ts` | Frame builder, `MOODS` table (frames and length per mood), nightcap and "z" cells |
| `src/components/ghost/GhostMascot.tsx` + `.css` | Draws the SVG, picks animation class |
| `src/components/ghost/GhostProvider.tsx` | Context, `GhostProvider`, `useGhost` |
| `src/components/ghost/GhostCompanion.tsx` + `.css` | The strip: Poke_Button, Mascot, Speech_Bubble |
| `src/components/ghost/useGhostError.ts` | `useGhostError(message)` |
| `src/components/ghost/ghostTips.ts` | `TIPS`, `BANNED_WORDS`, `pickTip` |
| `src/components/theme.css` (edit) | One new variable: `--color-ghost-cap`, both themes |
| `src/theme/palettePairs.ts` (edit) | Two new `ui` pairs for `--color-ghost-cap` |
| `src/main.tsx`, `src/App.tsx`, `StockCardView.tsx`, `DebtsCardView.tsx`, `GhostGuide.tsx`, `StarterChooser.tsx` (edits) | Wiring only |

### Design decisions

| Decision | Choice | Why |
| --- | --- | --- |
| `nightcap` type | `nightcap: boolean` in the state (false unless Midnight is on) | "Optional" is read as "only on in Midnight". A plain boolean is simpler to test than `boolean \| undefined`. |
| Who ends a pose | A provider `setTimeout` per Busy_Mood, from the `MOODS` table | CSS `animationend` never fires under Reduced_Motion, and looping CSS never ends. One timer path works in both cases, so the ghost cannot get stuck. |
| Waking from sleep | The provider sends `animationDone`, and the machine turns `sleep` into `idle` | The event list has no "wake" event. `animationDone` already means "this moment is over". Sleep has no timer, so only an interaction ends it. |
| `idleTimeout` during a pose | Set `sleepy: true`; the pose ends in `sleep` | Matches "idle, or sleep after idleTimeout" and never cuts a pose short. |
| Latest event wins | A new event replaces the current pose | Simple. `poked` must always give `giggle`, so no event may block another. |
| Tips | Chosen by the provider with `pickTip(kind, counter)`; the machine never sees them | Keeps the machine free of text, clock and randomness. A counter walks the list in order, so no `Math.random`. |
| Bubble state | Held in the provider, not in the machine | Dismiss is not one of the ten events. The bubble is text, not a mood. |
| Bubble place | In the page flow under the app bar, next to the ghost | A floating ghost would cover forms on a 360px phone (`design-retro.md`: mobile first, tap targets). |
| Empty screens | `GhostGuide` calls `react("emptyScreen")` on mount | One edit covers all three empty states. `GhostGuide` keeps its own text and its own small ghost. |
| Midnight | `App.tsx` calls `react({ type: "midnightToggled", on })` in `toggleTheme` | The provider sits above `App` in `main.tsx`, so `App` can call `useGhost()`. App tests render `App` alone and get the do-nothing hook. |
| Cap colour | One new variable, `--color-ghost-cap`, with two `ui` pairs | Bubble and buttons reuse existing variables, so the only new colour to check is the cap. Midnight gold is reserved for the main action and active tab, so the cap is not gold. |

## State machine

```ts
// ghostTypes.ts
export const GHOST_MOODS = [
  "idle", "wave", "cheer", "think", "spin", "sorry", "point", "sleep", "giggle",
] as const;
export type GhostMood = (typeof GHOST_MOODS)[number];

export type GhostEvent =
  | { type: "midnightToggled"; on: boolean }
  | { type: "appOpened" | "saleRecorded" | "debtAdded" | "debtPaid" | "errorShown"
        | "emptyScreen" | "idleTimeout" | "poked" | "animationDone" };

export interface GhostState {
  readonly mood: GhostMood;
  readonly nightcap: boolean; // true only in Midnight mode
  readonly sleepy: boolean;   // true only while a Busy_Mood plays and idleTimeout has come
}
```

Transitions (`n` = nightcap, kept unless noted; `s` = sleepy):

| Event | Result |
| --- | --- |
| `appOpened` | mood `wave`, `s=false` |
| `saleRecorded` | mood `cheer`, `s=false` |
| `debtPaid` | mood `cheer`, `s=false` |
| `debtAdded` | mood `think`, `s=false` |
| `errorShown` | mood `sorry`, `s=false` |
| `emptyScreen` | mood `point`, `s=false` |
| `midnightToggled(on)` | mood `spin`, `n=on`, `s=false` |
| `poked` | mood `giggle`, `s=false` (from any mood, including `sleep`) |
| `idleTimeout` | `idle` or `sleep` gives `sleep`. A Busy_Mood keeps its mood and sets `s=true`. |
| `animationDone` | `sleep` gives `idle`. `idle` gives `idle`. A Busy_Mood gives `sleep` if `s`, else `idle`. Then `s=false`. |

Why it cannot get stuck: every Busy_Mood has one exit (`animationDone`), the provider always schedules it, and `animationDone` from a Busy_Mood always lands in a Resting_Mood. `sleep` has one exit too (any interaction).

`next` works as a React reducer: `useReducer(next, initialState(midnight))`.

## Frames

The base grid is `GHOST_GRID` (16 x 16, `#` filled, `.` empty). The eyes are the 2-wide, 3-tall holes in rows 4 to 6. The mouth is the 4-wide hole in row 9. Arms live in the empty columns 0 to 1 (left) and 14 to 15 (right), so an arm never changes the body.

The Mascot uses `viewBox="0 -3 16 19"`: three extra rows above row 0 for the nightcap. The extra rows are always there, so the ghost does not jump when the cap appears. One cell is `--ghost-cell` (3px by default, so the SVG is 48 x 57px).

A frame is `base + eyes + mouth + arms`. Each variant below is a list of full 16-character rows that replace the base row with the same number.

**Eyes** (rows 4 to 6)

| Name | r4 | r5 | r6 |
| --- | --- | --- | --- |
| open (base) | `..##..####..##..` | `..##..####..##..` | `..##..####..##..` |
| happy (`^ ^`) | `..###.####.###..` | `..##.#.##.#.##..` | `..############..` |
| closed | `..############..` | `..##..####..##..` | `..############..` |

**Mouth** (rows 9 to 10)

| Name | r9 | r10 |
| --- | --- | --- |
| smile (base) | `..####....####..` | `..############..` |
| grin | `..####....####..` | `..#####..#####..` |
| frown | `..#####..#####..` | `..####....####..` |
| small o | `..#####..#####..` | `..############..` |

**Arms.** Each row is two characters for columns 14 and 15 (right arm). The left arm is the same rows with the two characters swapped, for columns 1 and 0.

| Name | Rows (row: cells) |
| --- | --- |
| up | 3: `.#`, 4: `.#`, 5: `.#`, 6: `##` |
| up-lean | 3: `#.`, 4: `#.`, 5: `#.`, 6: `#.` |
| out-high | 7: `##` |
| out-low | 8: `##` |
| side (think) | 8: `##` |
| down | 8: `#.`, 9: `#.`, 10: `#.` |

**Extras**

- Nightcap (rows -3 to -1): `.##.............`, `.####...........`, `..#########.....`. Drawn in `--color-ghost-cap`. It droops to the left and touches row 0, so it reads as a cap on the head.
- Sleep "z" (cells x, y): (13,0), (14,0), (15,0), (14,1), (14,2), (15,2). The cell (13,2) is already body, so it joins the shape.

**Mood table** (`MOODS` in `ghostFrames.ts`). Frame B is only drawn when animation is allowed.

| Mood | Frame A | Frame B | Moves with | Length |
| --- | --- | --- | --- | --- |
| idle | open, smile, no arms | none | nothing | rests |
| wave | open, smile, right `up` | open, smile, right `up-lean` | frame switch, 400ms beat | 1600ms |
| cheer | happy, grin, both `up` | happy, grin, both `out-high` | frame switch 300ms beat + `ghost-hop` | 1600ms |
| think | open, small o, right `side` | closed, small o, right `side` | frame switch, 700ms beat | 2000ms |
| spin | happy, smile, no arms | none | `ghost-spin` | 900ms |
| sorry | open, frown, both `down` | closed, frown, both `down` | frame switch, 700ms beat + `ghost-droop` | 2000ms |
| point | open, smile, right `out-high` | open, smile, right `out-low` | frame switch, 300ms beat | 1800ms |
| sleep | closed, small o, "z" | closed, small o, no "z" | frame switch, 1000ms beat | rests |
| giggle | happy, grin | happy, smile | frame switch 150ms beat + `ghost-shake` | 1000ms |

`buildFrame(parts)` returns the rows as a `string[]`. `frameCells(rows)` turns rows into `{x, y}` cells, the same way `ghostCells()` does. A unit test checks that every row is 16 characters, that eyes and mouth only change rows 4 to 6 and 9 to 10, and that arms only touch columns 0, 1, 14 and 15.

## Mascot and CSS

```tsx
<span
  className={`ghost-mascot${animated ? ` ghost-mascot--anim ghost-mascot--anim-${mood}` : ""}`}
  data-mood={mood}
  style={{ "--ghost-cell": "3px" }}
>
  <svg viewBox="0 -3 16 19" aria-hidden="true" focusable="false" shapeRendering="crispEdges" fill="currentColor">
    <g className="ghost-mascot__frame ghost-mascot__frame--a">{cells A}</g>
    {animated && frameB && <g className="ghost-mascot__frame ghost-mascot__frame--b">{cells B}</g>}
    {nightcap && <g className="ghost-mascot__cap">{cap cells}</g>}
  </svg>
</span>
```

- `animated` is `!reduced && mood !== "idle"`, where `reduced` comes from `useReducedMotion()`. Under Reduced_Motion the span has only `ghost-mascot`, only frame A is drawn, and the face and arms show as a still picture.
- The provider gives the Mascot a `key` that changes on every `react()`, so the same mood twice in a row restarts the CSS animation.
- Colour: `.ghost-mascot { color: var(--color-ghost); }` and `.ghost-mascot__cap { fill: var(--color-ghost-cap); }`.

Keyframes. All of them live inside `@media (prefers-reduced-motion: no-preference)`. Every animation uses `steps(1, end)` between keyframes, so values jump and never slide. The loop is `infinite`; the provider's timer ends the mood, not the CSS.

```css
@media (prefers-reduced-motion: no-preference) {
  @keyframes ghost-frame-a { 0%, 49.9% { visibility: visible; } 50%, 100% { visibility: hidden; } }
  @keyframes ghost-frame-b { 0%, 49.9% { visibility: hidden; }  50%, 100% { visibility: visible; } }
  @keyframes ghost-hop    { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(calc(var(--ghost-cell) * -2)); } }
  @keyframes ghost-shake  { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(calc(var(--ghost-cell) * -1)); } 75% { transform: translateX(var(--ghost-cell)); } }
  @keyframes ghost-droop  { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(var(--ghost-cell)); } }
  @keyframes ghost-spin   { 0%, 100% { transform: scaleX(1); } 17% { transform: scaleX(0.5); } 33% { transform: scaleX(0.125); }
                            50% { transform: scaleX(-0.125); } 67% { transform: scaleX(-0.5); } 83% { transform: scaleX(-1); } }

  .ghost-mascot--anim .ghost-mascot__frame--a { animation: ghost-frame-a var(--beat) steps(1, end) infinite; }
  .ghost-mascot--anim .ghost-mascot__frame--b { animation: ghost-frame-b var(--beat) steps(1, end) infinite; }
  .ghost-mascot--anim-wave   { --beat: 400ms; }
  .ghost-mascot--anim-cheer  { --beat: 300ms; }
  /* ... one --beat per mood, from the table above ... */
  .ghost-mascot--anim-cheer svg  { animation: ghost-hop   600ms steps(1, end) infinite; }
  .ghost-mascot--anim-giggle svg { animation: ghost-shake 300ms steps(1, end) infinite; }
  .ghost-mascot--anim-sorry svg  { animation: ghost-droop 1400ms steps(1, end) infinite; }
  .ghost-mascot--anim-spin svg   { animation: ghost-spin  900ms steps(1, end) infinite; }
}
```

The `.css` file has no `@media (prefers-reduced-motion: reduce)` block, because the animations are only switched on inside `no-preference`. A test checks that no `animation:` line sits outside that block.

## Provider

```ts
interface GhostProviderProps {
  initialMidnight?: boolean;      // default false
  idleMs?: number;                // default 60000
  bubbleMs?: number;              // default 12000
  moodMs?: Partial<Record<GhostMood, number>>; // overrides MOODS[m].ms, for tests
  children: ReactNode;
}
interface GhostApi {
  state: GhostState;
  stamp: number;                  // changes on every react(); the Mascot's key
  bubble: string | null;
  react: (event: GhostEvent | GhostEvent["type"]) => void; // stable identity
  dismissBubble: () => void;
}
```

How it works:

1. `useReducer(next, initialState(initialMidnight))` holds the state. `bubble` and `stamp` are separate `useState` values. The tip counter is a `useRef`.
2. `react(e)` turns a string into `{ type }`, dispatches it, bumps `stamp`, picks a tip with `pickTip(e.type, counter++)` (for event types that carry a tip), sets the bubble, and restarts the idle timer. `react` is wrapped in `useCallback` with no changing dependencies, so `useEffect(() => react(...), [react])` in a screen runs once.
3. Mood timer: `useEffect([state.mood, stamp])`. For a Busy_Mood it sets `setTimeout(() => dispatch({type: "animationDone"}), ms)` and clears it in the cleanup.
4. Idle timer: kept in a ref, not in React state, so a click does not restart a running pose. `touch()` clears and sets `setTimeout(() => dispatch({type: "idleTimeout"}), idleMs)`. Document `pointerdown` and `keydown` listeners call `touch()`. If the mood is `sleep`, `touch()` also dispatches `animationDone` first (the wake).
5. Bubble timer: `useEffect([bubble])` clears the bubble after `bubbleMs`. An effect also clears it when the mood becomes `sleep`.
6. On mount, `react("appOpened")` runs once (a ref guards the StrictMode double run).
7. Cleanup on unmount clears all three timers and removes both listeners.

`useGhost()` outside a provider returns a constant `{ state: initialState(false), stamp: 0, bubble: null, react: noop, dismissBubble: noop }`.

## Companion strip

```tsx
<div className="ghost-companion">
  <button type="button" className="ghost-companion__poke" aria-label="Poke the ghost" onClick={() => react("poked")}>
    <GhostMascot key={stamp} mood={state.mood} nightcap={state.nightcap} />
  </button>
  {bubble && (
    <div className="ghost-bubble">
      <p className="ghost-bubble__text">{bubble}</p>
      <Button onClick={dismiss}>Got it</Button>
    </div>
  )}
</div>
```

- No `role`, no `aria-live`. The bubble is plain content that appears after the button in reading order.
- `dismiss` calls `dismissBubble()` and then focuses the poke button through a ref, so keyboard focus is not lost.
- `.ghost-companion__poke { min-width: var(--tap-min); min-height: var(--tap-min); background: transparent; border: var(--border-width) solid transparent; }`. The shared `:focus-visible` outline from the Theme_File applies.
- The bubble copies the look of `.ghost-guide__bubble` (surface, 2px border, 2px offset shadow, left-pointing triangle) in its own CSS file. `GhostGuide.css` is not edited. The bubble text is `font-size: var(--font-size-body)`. The Got it button reuses the shared `Button`.
- The component returns `null` when there is no provider. It detects this with a context flag `active: true` that only the provider sets.

## How screens call `react()`

```tsx
import { useGhost } from "../ghost/GhostProvider";
import { useGhostError } from "../ghost/useGhostError";

const { react } = useGhost();

// After the state change succeeded:
onStackChange(result.value);
react("saleRecorded");

// For an error message that already renders with role="alert":
useGhostError(saleState?.error ?? saleState?.formError);
```

| Where | Call | Notes |
| --- | --- | --- |
| `StockCardView.handleSaleSubmit`, success branch | `react("saleRecorded")` | After `onStackChange` |
| `DebtsCardView` submit, success branch | `react("debtAdded")` | After `onStackChange` |
| `DebtsCardView.handleConfirmPay`, success branch | `react("debtPaid")` | After `onStackChange` |
| Sale form error, debt form errors, `settleError`, `StarterChooser` error | `useGhostError(message)` | Fires when the message changes from empty to text, or to different text |
| `App`: `saveError`, `switchError`, `loadState.message` | `useGhostError(message)` | The `role="alert"` markup stays |
| `GhostGuide` | `useEffect(() => react("emptyScreen"), [react])` | Covers Stock, Sales log and Debts empty states |
| `App.toggleTheme` | `react({ type: "midnightToggled", on: next === "midnight" })` | |
| `main.tsx` | `<GhostProvider initialMidnight={...}>` around `<App />` | `initialMidnight` reads `document.documentElement.dataset.theme` |
| `App`, under the app bar | `<GhostCompanion />` | |

`useGhostError(message)` is a `useEffect` on `[message, react]` that calls `react("errorShown")` when `message` is a non-empty string.

## Tips

`ghostTips.ts`:

```ts
export type TipKind = "appOpened" | "saleRecorded" | "debtAdded" | "debtPaid"
  | "errorShown" | "emptyScreen" | "midnightToggled" | "poked";

export const TIPS: Readonly<Record<TipKind, readonly string[]>> = {
  appOpened: ["Made a sale? Tap Record a sale.", "Boo! Tap Add an item to stock your shelf."],
  saleRecorded: ["Cha-ching! Owed money? Tap Record a debt.", "Sale saved! Peek at your totals tab."],
  debtAdded: ["Noted! Tap Mark as paid when they settle up.", "Tab saved. I will not tell a soul."],
  debtPaid: ["Paid up! Time for another Record a sale?", "Hooray! One less tab to chase."],
  errorShown: ["Oops! Read the red note, then try again.", "Hmm. Check the red note above and fix it."],
  emptyScreen: ["Nothing here yet. Tap the button below!", "Spooky and empty. Add your first one."],
  midnightToggled: ["Night mode! Tap the moon to go back.", "Lights out! Tap the moon for day mode."],
  poked: ["Hee hee! Tap Record a sale to get going.", "That tickles! Tap Add an item next."],
};

export const BANNED_WORDS: readonly string[] = [
  "inventory", "transaction", "database", "sync", "invalid", "exception", "null",
  "undefined", "cache", "payload", "receivable", "ledger", "parameter", "backend",
];

export function pickTip(kind: TipKind, counter: number): string; // pure, wraps round, handles negatives
```

The sample lines above are drafts. The tasks check each one against the 60-character limit, the banned list and the real button labels (`Record a sale`, `Record a debt`, `Add an item`, `Mark as paid`). Tips name buttons and the moon, not tab names, because starter stacks call the tabs different things ("Daily summary" or "Today's totals").

## Colours

| Variable | Light | Midnight | Pairs |
| --- | --- | --- | --- |
| `--color-ghost-cap` | proposed `#5b2fa0` | proposed `#c8a2ff` | "nightcap on page" with `--color-bg`, "nightcap on card" with `--color-surface`; both `ui`, 3:1, both themes |

The values are proposals. The palette contrast test decides, and the task adjusts them if a pair fails. `theme.css` is edited with a small targeted replace so its existing text and encoding are not rewritten.

## Testing

| Test file | What it proves |
| --- | --- |
| `ghostMachine.property.test.ts` (fast-check, 100+ runs each) | P1 any event sequence gives valid moods, never throws, keeps the invariant (`sleepy` only for Busy_Moods). P2 `animationDone` at most twice reaches `idle` or `sleep`. P3 `poked` gives `giggle`, then `animationDone` gives `idle`. P4 `nightcap` changes only on `midnightToggled` and equals `on`. P5 the eight event-to-mood rows. P6 `idleTimeout` rules. P7 `next` does not change a frozen input. |
| `ghostMachine.test.ts` | A few fixed examples, and a read of the source that checks it has no `Math.random`, `Date`, `setTimeout` or `import` of React |
| `ghostFrames.test.ts` | Every row 16 characters, face edits stay in their rows, arms stay in their columns, every mood has a frame A |
| `GhostMascot.test.tsx` | aria-hidden and focusable false, no title, no role. With reduced motion on: no class starting `ghost-mascot--anim`, one frame group, face still drawn. With reduced motion off: animation class and two frame groups. Nightcap group only when the flag is on. |
| `GhostMascot.css.test.ts` | Every `animation:` line sits inside the `no-preference` block; no colour literals |
| `GhostProvider.test.tsx` (fake timers) | Wave on mount, back to `idle` after the mood length (also with reduced motion on). `idleMs` gives `sleep`. A click wakes it. `react` keeps its identity. Unmount clears timers. Outside a provider, `react` does nothing and nothing throws. |
| `GhostCompanion.test.tsx` | Poke button name "Poke the ghost", CSS has `var(--tap-min)` for both sizes, click sends `poked`. Bubble: one at a time, no `role`/`aria-live`, Got it closes it and moves focus to the poke button, auto-closes. |
| `ghostTips.test.ts` (fast-check) | Every tip at most 60 characters, no banned word (whole word, any case). `pickTip` returns a tip from its group for any integer counter. Every kind has at least 2 tips. |
| `ghostWiring.test.tsx` | A sale, a debt, a paid debt, an error, an empty state and the Midnight toggle each reach `react` with the right event (a spy provider). Existing `role="alert"` messages are unchanged. |
| `ghostBoundary.test.ts` | No file under `src/domain`, `src/domain-ui` or `src/storage` mentions `components/ghost` |
| Existing palette contrast test | The new pairs pass in both themes |

## Known limits

- If the same error text shows twice in a row, `useGhostError` fires once, because the message did not change. The bubble from the first time may already be gone.
- On empty screens there are two ghosts: the companion strip and the small ghost in `GhostGuide`. Both stay, because changing `GhostGuide` risks existing tests. The companion's empty tip says something different from the guide's hint.
- `appOpened` and `emptyScreen` can fire within the same moment at start-up. The later one wins and the owner sees the pointing ghost.
- The ghost's mood is not saved. A reload starts with a wave.
