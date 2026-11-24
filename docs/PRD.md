# GhostStack: Product Requirements Document

Working title: GhostStack (can be renamed)
Hackathon: Kiroween 2026, Resurrection category
Status: Draft v1, written before Kiro credits arrive
Build window: Nov 16 to Dec 4, 2026 (submission deadline Friday, Dec 4 at 2:00 PM PT; aim to submit by Dec 2)

## 1. One-line pitch

GhostStack brings back Apple's 1987 HyperCard for small business owners: a simple builder where a shop owner arranges "cards" and "buttons" to make their own stock, sales, and debt-tracking app in minutes, with no coding and no constant internet.

## 2. The resurrected technology

HyperCard let ordinary people build their own programs from stacks of cards, with buttons that did things. It died because it was tied to old hardware and the web replaced it. We revive its core idea (people building tools for themselves) for a problem it never solved: small traders who track money in notebooks because business software is too complex, too expensive, or needs a good connection.

## 3. Problem

- Small shop owners, market traders, and farm-produce sellers often track stock, sales, and debts in paper notebooks or in their heads.
- Existing apps are built for larger businesses, have too many features, cost money, and often need a stable internet connection.
- Spreadsheets are powerful but intimidating for many people.
- Result: lost money from forgotten debts, unnoticed low stock, and no clear picture of daily profit.

## 4. Target user

Primary persona: a small shop or market-stall owner (for example, a provisions shop or a produce seller) who uses a smartphone, is not technical, and has patchy internet.

To do before building: talk to one real person like this and record what they track every day, so the starter stacks reflect real needs. Add their quotes to the demo and write-up.

## 5. Goals and non-goals

### Goals

1. A user can create a working business tool in under 5 minutes.
2. Everything works offline and saves data on the device.
3. Money calculations are always correct.
4. The product feels complete, polished, and memorable (retro Mac look with a spooky twist).
5. Show deep, genuine use of Kiro (specs, steering, hooks, MCP, property-based testing).

### Non-goals (to protect the timeline)

- No user accounts or cloud sync in v1.
- No payments, bank integration, or multi-user collaboration.
- No full programming language like HyperTalk; buttons use a fixed set of actions.
- No native mobile app; a responsive web app (installable as a PWA) is enough.

## 6. Key user stories

1. As a shop owner, I pick a starter stack for my business type so I don't start from a blank page.
2. As a shop owner, I add items to my stock list and see when something is running low.
3. As a shop owner, I record a sale in two taps, and my stock and daily total update automatically.
4. As a shop owner, I record who owes me money and mark debts as paid.
5. As a shop owner, I see a daily summary (sales, estimated profit, low stock, money owed).
6. As a shop owner, I rearrange cards and rename buttons so the app fits how I work.
7. As a shop owner, I keep using the app with no internet and never lose my data.

## 7. MVP features

### 7.1 Card types (4)

| Card type | Purpose | Main fields |
| --- | --- | --- |
| Stock | Track items and quantities | name, quantity, cost price, sell price, low-stock level |
| Sales log | Record what was sold | item, quantity, price, time |
| Debts | Track money owed | customer, amount, date, paid or unpaid |
| Daily summary | Show the day at a glance | total sales, estimated profit, low-stock list, total owed |

### 7.2 Buttons (fixed actions)

- Add item
- Record sale
- Record debt
- Mark debt as paid
- Show today's totals
- Go to another card

Each button is configurable (label, target card, which card it acts on), which gives the HyperCard "build it yourself" feel without a scripting language.

### 7.3 Stacks and builder

- 2 or 3 starter stacks (for example, provisions shop and farm produce stall).
- A builder mode: add a card, choose a type, drag to reorder, rename, delete.
- A play mode: the clean everyday view used for running the shop.

### 7.4 Offline and data

- Data stored on the device (IndexedDB or local storage) with an installable PWA.
- Export and import a stack as a file so users can back up or share it.

### 7.5 Stretch goals (only if time allows)

- "Ghost helper" that suggests a starter stack from a short description of the business.
- Simple weekly chart.
- Currency selection (for example, Naira).

## 8. Business rules and correctness requirements

These become the targets for property-based testing:

1. Stock quantity never goes below zero after any sequence of sales.
2. Recording a sale reduces stock by exactly the quantity sold.
3. Daily total equals the sum of that day's individual sales.
4. Estimated profit equals sum of (sell price minus cost price) times quantity.
5. Total debt owed equals the sum of unpaid debts; marking a debt paid reduces the total by exactly that amount.
6. Exporting then importing a stack returns identical data.
7. Money values are handled without floating-point rounding errors (store smallest currency units as integers).

## 9. Design direction

- **Look:** retro black-and-white early-Mac style (chunky borders, pixel font, simple icons) with a Halloween twist: a small ghost mascot, a dark "midnight" mode, and playful spooky wording ("Raise a new card").
- **Rule:** spooky elements must never hurt clarity. Big tap targets, plain language, and high contrast matter more than decoration.
- **Language:** simple English, short sentences, no jargon.
- **Responsive:** designed mobile-first, works on desktop too.

## 10. Technical approach (proposed)

- **Frontend:** Vite with React and TypeScript, or another web stack you are most comfortable with. Choose one and write it into the first spec.
- **Storage:** IndexedDB (through a small wrapper) for offline data.
- **PWA:** service worker and manifest for offline use and installability.
- **Testing:** unit tests plus property-based tests (for example, with fast-check) for the money rules in section 8.
- **Hosting:** a free static host so judges can open a public URL with no login.
- **Repo:** public GitHub repo, open source license (for example, MIT), /.kiro folder committed and not in .gitignore.

## 11. Kiro usage plan

The judges score how well and how thoughtfully Kiro is used, so each feature should solve a real problem and be documented as we go.

Habit: keep a running notes file during the build (what worked, what failed, numbers like how many hooks, specs, tests). It will make the Kiro write-up much easier.

| Kiro feature | Planned use | Evidence to capture |
| --- | --- | --- |
| Specs | One spec for the core builder, one per card type, one for offline and storage | Spec files, how they changed the code |
| Steering docs | Retro design rules, plain-language rules, money-handling rules | Steering files, examples of Kiro following them |
| Agent hooks | When a new card type is added, update the card registry, tests, and docs; run tests on save | Hook files, time saved |
| Property-based testing | Enable for all rules in section 8 | Any bugs it caught that unit tests missed |
| MCP | Connect framework or library documentation to reduce wrong code | Before and after examples |
| Powers | Try any relevant power and note what it added | Short notes |
| Vibe coding vs specs | Vibe code the visual look; use specs for logic | Honest comparison in the write-up |

## 12. Milestones

The free credits take up to 48 business hours after the request, so the first days use the Kiro features you already have, and planning work doesn't need credits.

| Dates | Milestone |
| --- | --- |
| Nov 16 to 18 | Submit credit request; finish PRD; pick tech stack; set up repo with license and /.kiro; talk to one real shop owner |
| Nov 19 to 22 | Core spec and steering docs; data model; Stock card and Sales log working |
| Nov 23 to 26 | Debts card, Daily summary, buttons, and builder mode; property-based tests for money rules |
| Nov 27 to 30 | Offline support (PWA), starter stacks, export and import; hooks in place |
| Dec 1 to 2 | Design polish (spooky touches), bug fixing, deploy public URL, record demo, write Kiro write-up, optional blog and social posts |
| Dec 3 | Final checks and submit (one day of buffer) |
| Dec 4, 2:00 PM PT | Hard deadline: no extensions |

## 13. Submission checklist

- Public GitHub repo with open source license visible in the About section
- /.kiro folder at the root, not ignored
- Working public app URL (test login instructions if needed)
- Text description of features
- Demo video under 3 minutes, public on YouTube, showing the app working end to end, no copyrighted music
- Write-up on how Kiro was used
- Category selected: Resurrection
- Optional bonus entries: blog post (mention Kiroween 2026), social post starting with #KiroweenHackathon26, student prize if all team members are students
- Disclose any pre-existing code or templates used

## 14. Demo video plan (under 3 minutes)

1. 0:00 to 0:20: the problem (the notebook, the forgotten debt). Use the real shop owner's story if possible.
2. 0:20 to 0:40: what HyperCard was and why we brought it back.
3. 0:40 to 2:00: live walkthrough: pick a stack, record sales, check low stock, record a debt, see the daily summary, all while offline.
4. 2:00 to 2:40: how Kiro made it possible (specs, hooks, steering, tests) with one concrete example each.
5. 2:40 to 3:00: who it's for and why it matters.

## 15. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Scope too big for 19 days | Fixed 4 card types and fixed button actions; stretch goals only after MVP works |
| Credits arrive late | Do planning, repo setup, and design work first; request credits immediately |
| Money bugs | Integer money values and property-based tests from the start |
| Offline and PWA problems | Build storage layer early; test offline mode every few days |
| Kiro feature availability in Nigeria | Check kiro.dev regional notes early; confirm the tools you need work for you |
| Weak demo video | Script it early; record on the real device; keep it under 3 minutes |
| Too much spooky decoration hurts usability | Test with one real user and simplify |

## 16. Success criteria

- A first-time user builds and uses a working stack in under 5 minutes.
- All money-rule properties pass.
- The app works fully offline.
- A judge can open the public link and understand the project without help.
- The write-up clearly shows at least four Kiro features used with real examples.

## 17. Open questions

1. Final project name?
2. Which web stack will you use?
3. Who is the real shop owner or trader you'll talk to?
4. Working solo or with teammates (up to 3)?
5. Which currency and starter stacks should come first?
