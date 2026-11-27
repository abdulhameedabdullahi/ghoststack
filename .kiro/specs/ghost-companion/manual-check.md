# Ghost companion: manual check

Do this by hand on a phone-size window (about 375 px wide). Run the whole list twice: once in the light theme and once in Midnight. Tick each box as you go.

Start the app with `npm run dev` and open it in a browser. Use the browser's device toolbar to get a phone-size window.

| Light | Midnight | What to check |
| :---: | :------: | ------------- |
| [ ] | [ ] | **Wave on open.** Reload the page. The ghost waves, and a short tip appears in the bubble. |
| [ ] | [ ] | **Cheer after a sale.** Record a sale. The ghost cheers and the bubble gives a new tip that names a button. |
| [ ] | [ ] | **Sorry after an error.** Cause an error, for example enter a number that is too big in the sale form. The ghost looks sorry. The red error message stays on screen with its usual words. The bubble only adds a calm next step. |
| [ ] | [ ] | **Nightcap.** Flip the Midnight switch on: the ghost spins and wears a nightcap, and the cap is easy to see. Flip it off: the cap goes away. (In the light run, start in light, switch to Midnight, then switch back.) |
| [ ] | [ ] | **Sleep and wake.** Touch nothing for 60 seconds. The ghost falls asleep (closed eyes and a small "z") and the bubble closes. Tap anywhere. The ghost wakes up. |
| [ ] | [ ] | **Reduce motion.** Turn on "reduce motion" in your system settings (Windows: Settings > Accessibility > Visual effects > Animation effects off; macOS: Accessibility > Display > Reduce motion). Reload. Poke the ghost, record a sale and cause an error. Nothing hops, shakes or spins. The face and arms still change with each mood. Bubbles still appear, close with Got it, and close by themselves after about 12 seconds. The ghost goes back to its resting pose after a moment. |
| [ ] | [ ] | **Bubble covers nothing.** With a bubble showing, look at every screen (Stock, Debts, the forms). The bubble never sits on top of a field or a button. You can still tap everything. |
| [ ] | [ ] | **Focus outline.** Press Tab through the page. The "Poke the ghost" button and the "Got it" button each show the clear focus outline when they are selected. Press Enter or Space on the poke button: the ghost giggles. Press Enter on "Got it": the bubble closes and focus moves to the poke button. |

## Notes

- If something looks wrong, write down the theme, the window size, and whether "reduce motion" was on.
- Turn "reduce motion" back off when you are done.

Covers requirements 6.1, 6.2, 6.3 and 8.5.
