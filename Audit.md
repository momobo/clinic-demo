Audit of the app, Part 3 (baseline: before the rebuild)

Date: 2026-11-12. Pages audited: patient page (7 states) and staff page (3 states), on a 390 px wide screen, local demo store.
Method: axe-core 4.10 (WCAG 2.0/2.1/2.2 A and AA plus best-practice rules) in headless Chrome; colour contrast computed from the stylesheet; scripted focus checks. Automated tools find only part of the problems, so "no axe violations" does not mean "accessible".

Verified = measured by a tool or script. Suspected = read from the code or judged by me, not yet checked.

## 1. Clarity and mental model
- Verified: staff page uses developer words: "Rotate join token", "Testing tools", "scenarios", "Reset everything (seed only)", "Demo mode".
- Verified: "Remove" does not say what it means (no-show? left? mistake?). "Ticket" and "number" are both used for the same thing.
- Verified: "Now serving: -" shows a bare dash when nobody has been served.
- Verified: a patient opening the plain link sees "scan the QR code at the clinic", but the QR code does not exist yet.
- Suspected: "Serve next" may not match what staff say ("call the next patient").

## 2. Information hierarchy
- Verified: with a ticket, the ticket number (3 rem) is bigger than the wait (2.2 rem). Decided: the wait must come first, then position, with the number as a smaller reference.
- Verified: staff page order is queue status, Serve next, list, patient link and token, testing tools. The daily job (call the next patient) is not first, and the link and token controls are in the everyday view.
- Verified: nothing tells the patient how fresh the estimate is, or what to do next (stay close? keep the page open?).
- Suspected, important: the "turn near" banner only works while the page is open. A phone that goes to sleep gets no alert, and the page does not say so.

## 3. Accessibility
- Verified, passes: axe found 0 violations in all 10 states (20-27 rules each). All buttons and fields are at least 44 px, except the "Patient page" link on the staff page. Page language and one main landmark are set.
- Verified, passes: text contrast is at least 5.1:1 in light and dark (computed). Not verified visually in dark mode: my dark-mode browser flag did not apply.
- Verified, fails: **focus is lost** on every redraw. Focus on "Cancel my ticket", then another patient joins: focus moves to the page body. Pressing Cancel, confirming, and staff pressing Serve next all drop focus to the body too. A keyboard or screen-reader user has to start again from the top.
- Verified, fails: staff rows have several buttons with identical names ("Remove", "Move to front" x4), so a screen reader cannot tell which patient they act on.
- Verified, minor: banner border contrast is 2.2:1 in light mode (needs 3:1 if the border is what marks the banner); the card borders are decorative.
- Verified: headings are flat (one h1, no h2); card titles are plain paragraphs.
- Suspected: the whole page is one live region, so a screen reader may re-read everything on every update; the banner adds a second live region.
- Not tested: real screen reader (VoiceOver), full keyboard-only walkthrough, 200% zoom and reflow, reduced motion, Windows high contrast. Needs a person.

## 4. Feedback and error handling
- Verified: after "Serve next" the page only changes silently: no "Served #11", and focus is lost. Remove and Move to front have no acknowledgement either.
- Verified: errors are one generic sentence ("Could not reach the clinic system. Please try again."), with no hint of what to do.
- Suspected: after the first load, a lost connection is not shown, so the patient can read an old estimate with no warning.
- Suspected: taking a number gives no confirmation message for assistive technology (the page just changes).
- Fine: cancelled and served tickets show a clear message; wrong password shows "Wrong password."; closed clinic is explained.

## Summary
Automated checks pass; the real problems are experiential and about focus: wrong first thing on the ticket screen, staff vocabulary, no acknowledgement of actions, no stale-data or sleeping-phone warning, and focus lost on every update.

---

# After the rebuild (2026-11-12)
Same method as the baseline: axe-core 4.10 in headless Chrome, scripted focus and message checks, local demo store. 57 unit tests pass.

## Before and after
| Check | Baseline | After |
|---|---|---|
| Axe violations | 0 (10 states) | 0 (15 states: 8 patient, 7 staff) |
| Focus when another patient joins | lost to the page body | stays on the same control |
| Focus after Leave / Confirm / Call next | lost | moves where the spec says |
| Staff row buttons | identical names repeated | each names its patient, all unique |
| Feedback after a staff action | none | visible message, announced once |
| Largest text on the ticket screen | ticket number | the wait |
| Offline | nothing shown | banner and "Updated hh:mm" |
| Developer words in the interface | several | none (a test enforces it) |
| Sleeping phone | not mentioned | stated on the page; screen wake lock requested |

## What the AI missed (and how it was found)
1. Focus was lost on every update. The first build redrew the whole page. Axe cannot see this; only a scripted focus test showed it.
2. Staff buttons with the same name ("Remove" x4). The AI wrote them without thinking about a screen reader.
3. Developer words in the interface ("Rotate join token", "scenarios", "Demo mode"), written for the builder, not the clinic admin.
4. "Remove" was ambiguous (no-show, mistake, or left?). Needed a design decision, not code.
5. The turn-near banner needs the page open, and the first build never said so. The code was correct; the promise to the patient was not.
6. Staff got no acknowledgement of actions.
7. When the database refused our connection, the first Firestore version showed an empty queue ("No wait") instead of an error. Found only by testing against the real database.
8. The turn-near rule fires late in a normal clinic (position 2 with 6-minute visits shows 10-15 min). The tests passed; the rule did not match what the patient needs. Still open.
9. A flag meant to test dark mode silently did nothing; dark contrast was calculated, not looked at.

## What cannot be claimed
Axe finds roughly a third of accessibility problems. Nothing here replaces a real screen-reader pass, keyboard-only use, or a real person.

## Manual checks (to be done by a person; fill in)
| Check | How | Result |
|---|---|---|
| VoiceOver, patient: take a number | Turn VoiceOver on (Cmd+F5), open the patient page with the join link, take a number. Is "You took number N" heard? Is the wait read first? | |
| VoiceOver, patient: leave the queue | Does focus land on "Leave the queue?" and is the result read? | |
| Keyboard only, staff | Tab through staff home. Call next with Enter. Can you reach every control, and is the focus ring always visible? | |
| 200% zoom | Browser zoom to 200% on both pages. Any sideways scroll or cut-off text? | |
| Dark mode | Switch the device to dark mode. Is everything readable? | |
| Phone, sleeping | Take a number, lock the phone, wait. Does the screen stay on (wake lock) and what do you see on return? | |
