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
