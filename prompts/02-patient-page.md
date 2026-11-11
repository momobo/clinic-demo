Prompt 2: patient page with a local stand-in store

Read "Product Requirement.md", "Technical Spec.md", "Acceptance Test.md" and the code from prompt 1 (js/forecast.js, js/seed.js).

CONSTRAINTS
- Same as prompt 1: no framework, no build step, no npm dependencies, plain ES modules, tests with `node --test`.
- Firebase does not exist yet. Build a local stand-in store (localStorage, shared across tabs of one browser) with the same methods the Firestore store will need later: getState, subscribe, takeNumber, cancelTicket, plus setOpen, addFakePatients, serveNext, reset.
- The page must be mobile first: large text, buttons at least 48px high, readable in light and dark mode, no account, nothing to install.
- Put all logic that can be pure in a module with no DOM (js/queue.js) and test it.

BUILD
1. index.html + js/patient.js + css/style.css: the patient page.
   - View only (no join token in the URL): wait range if joining now, people waiting, now serving. No "Take a number" button.
   - With ?join=<token>: "Take a number" button. Wrong or missing token is refused.
   - With a ticket: own number, position, estimated wait, now serving. A banner when the estimate is 5 minutes or less (or the patient is next).
   - Cancel: "Cancel my ticket" -> "Are you sure you want to give up your place?" with default button "Keep my place" and second button "Yes, give up my place". Two taps; a cancelled ticket is final.
   - Closed: "Clinic closed", no wait range, no new tickets; tickets already issued are kept.
   - Wording: position 1 shows "You're next"; an empty queue shows "No wait" to someone browsing; no data at all shows "Wait estimate not available yet".
   - The page never shows other patients' numbers or data.
2. js/store-local.js: the stand-in store, with the seed as its initial history.
3. dev.html: a throwaway control page (open/close, add fake patients, serve next with a chosen duration, reset). Replaced by the staff page later.
4. Tests for acceptance tests 1, 2, 3, 4, 5, 10, 11, 12 and the data-exposure part of 6.

DONE WHEN
- `npm test` passes. Show the output.
- List the assumptions you made, and what you could not test (the DOM code).
