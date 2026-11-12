Critique, Part 3: where the AI did well, and where it is flat

Basis: the rebuilt app, 57 tests, the audit in Audit.md. "Measured" means a script or tool showed it; "my view" means a judgement that needs a person to confirm.

## Where the AI nailed it
- Logic with clear rules. The forecast (weights, ranges, rounding, a 15-minute cap, edge cases) and the queue operations came out right from the spec and are covered by tests. Measured.
- Consistency of words. Once the word table existed, the same terms appeared everywhere and a test keeps the old ones out. Measured.
- Mechanical accessibility. Contrast of at least 5.1:1 in both themes, 44 px touch targets, language, landmarks, headings, labelled form fields, zero axe violations. Measured.
- Following a precise spec. Focus management and feedback were implemented as written, and checked by script. Measured.
- Honest data handling. The page never invents a number: no data shows "not available yet", the closed state says so, offline is shown. Measured.

## Where it is technically correct but experientially flat
- Every state is a card of text lines. The ticket screen has about eight lines; nothing says "this is the one thing to look at" except size. My view.
- No reassurance. For a parent with a sick child the tone is accurate and neutral ("Your place is kept"). Nothing acknowledges the situation. My view.
- "You're next" has no stronger moment. It is the same card with a banner; no vibration, no sound, no change of colour that a glance across a waiting room would catch. My view.
- The wait is a range of numbers only. There is no sense of movement ("faster than usual", "2 ahead of you moved up"). My view.
- Staff list is dense and equal: every row has three buttons, nothing shows how long someone has waited. For the front desk the daily job is one tap, but there is no keyboard shortcut and no sign of an unusually long wait. My view.
- Empty states are flat: "Nobody is waiting" with nothing to do next. My view.
- Visual design is generic: system font, one accent colour, no brand or warmth. Your own word for it was "barebone". My view.
- Nobody outside this project has used it. Passing tests and audits say it works, not that a worried patient is satisfied. Part 2's question applies: if they disagree, go back to the design spec, not the code.

## Where the chain would break first (my guess)
1. The turn-near rule (audit item 8), a requirement question.
2. The sleeping-phone limit, a platform limit that needs SMS (version 2).
3. The first-time experience: how a patient gets the link without a QR code that does not exist yet.
