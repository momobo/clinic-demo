Design Spec, Part 3

Goal: fix what "Audit.md" found. The product requirement and the 46 tests stay valid; this spec changes how the app reads, orders and responds. English only. Standard: WCAG 2.2 AA.

## 1. Who we design for (proxies, no real users available)
- Parent in the car: sick child, phone in one hand, no patience, glances at the screen. Needs the wait in two seconds.
- Anxious older patient: afraid of missing the turn, reads every word, may use large text. Needs to know what to do next and that nothing is hidden.
- Front-desk staff: busy, interrupted, uses a tablet or computer, may use the keyboard. Needs the next action to be obvious and never ambiguous.

## 2. Flows
Patient:
1. Check the wait: open the link or scan the QR code, see the wait. No account.
2. Take a number (on site only), see the result.
3. Wait: the page shows the wait, position and a banner when the turn is near. The patient may leave the clinic and come back to the page.
4. Leave the queue: Leave the queue, then Yes, leave / Keep my place.
5. Called: the page says the number was called. Or: not shown up / removed by staff, with what to do next.
6. Clinic closed: say so and when to try again, no wait shown.
7. Connection lost: say so, say the wait may be out of date, show when it was last updated.

Staff:
1. Morning: log in, open the queue.
2. All day: call the next patient; handle someone who does not show up; remove a wrong entry; move someone to the front.
3. Rarely (Settings page): close the queue, get or change the patient sign-up link, load test data.

## 3. Information hierarchy (what comes first, top to bottom)
Patient with a number:
1. Banner when the turn is near ("Your turn is near. Please come to the clinic now.")
2. Estimated wait, largest text. When next: "You're next".
3. "6th in line" (position)
4. "Your number: #16", smaller
5. "Last called: #10"
6. "Keep this page open. We cannot alert you if your phone goes to sleep."
7. "Updated 14:52", or the offline warning (shown at the top, with the banner, when the connection is lost)
8. Leave the queue: last, quiet style (not primary)

Patient without a number: wait if you join now, people waiting, then "Take a number" (or, without the sign-up link: "To take a number, please use the QR code at the clinic or ask at the desk"), last called, updated.

Staff home, open queue: status line ("Open, 5 waiting"), then a card "Next: #11 (waiting since 14:52)" with one large "Call next patient", then the waiting list, then a link to Settings. When the queue is closed the large primary button is "Open the queue".
Staff Settings (own page, link back to home): close or open the queue, patient sign-up link and "Change the sign-up link", then "Test data".

## 4. Words (replace developer language)
| Now | New |
|---|---|
| Serve next (#11) | Call next patient (#11) |
| Remove | Didn't show up / Remove from queue (two actions) |
| Cancel my ticket | Leave the queue |
| Rotate join token | Change the sign-up link (old QR codes stop working) |
| Patient link | Patient sign-up link (for the QR code) |
| Testing tools / scenarios | Test data (replaces the real queue) |
| Now serving: - | Last called: #10, or "Nobody called yet" |
| Demo mode | "Practice mode: this data stays on this device" |
Patients always say "number", never "ticket". "Didn't show up" ends the entry and tells the patient to see the front desk or take a new number. "Remove from queue" is for mistakes and duplicates. Neither changes the service-time history.

## 5. Interaction and feedback patterns
- Update, don't redraw: changing data must not move the keyboard focus. Where a screen changes on purpose, focus moves to a stated place:
  - after "Leave the queue": to the question "Are you sure?"
  - after confirming or keeping: to the result message
  - after "Call next patient": stays on that button
  - after Didn't show up / Remove / Move to front: to the same button on the next row, or the list heading when the row is gone
- One polite live region, only for short status messages ("You took number 16.", "Called #11. 4 waiting.", "Removed #13."). The page itself is not a live region. The turn-near banner is the only other announcement, and it is announced once.
- Every staff action shows a visible result message in the status line for about 5 seconds.
- Errors say what happened and what to do: "We couldn't reach the clinic system. Your place is safe. Check your connection and try again." The offline banner stays until the connection is back.
- Confirmations stay as decided: the patient confirms before leaving the queue; staff actions have no confirmation and no undo.
- Structure: one h1 per page, h2 for each section; buttons that act on a patient have the number in their accessible name ("Didn't show up: #12").
- Touch targets at least 44 px; visible focus ring; no information by colour alone; dark mode kept; text readable at 200% zoom without sideways scrolling.

## 6. Checks for the rebuild (must pass, in addition to the 46 tests)
1. Focus stays on the same element when another patient joins or leaves.
2. Every staff row action has a unique accessible name.
3. Every user action produces a visible status message.
4. No developer words from the "Now" column appear anywhere.
5. The wait is the largest text on the ticket screen.
6. Offline: warning visible and "Updated" time shown.
7. axe: zero violations on every state; contrast at least 4.5:1 for text, 3:1 for the banner border and button edges.
8. Manual by a person: VoiceOver walkthrough of both patient flows, keyboard-only staff flow, 200% zoom.

## 7. Not in this round
SMS, a real QR code generator, other languages, real staff accounts.

## 8. Open decisions
- Keep the screen awake while a patient holds a number (browser "wake lock")? It would reduce the sleeping-phone problem but uses battery, and not every phone supports it.
