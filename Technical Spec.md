The Clinic Wait Time Project, Part 2 - Step 2: Technical Spec

Constraint: exercise project, zero cost, security not a priority. Single clinic, single queue.

What gets built: two static web pages hosted on GitHub Pages, talking directly to a free hosted database (Firebase Firestore, free tier). No server of our own.

Pieces
1. Patient page (static HTML + vanilla JS, no framework, no build step). Shows the wait range, "Take a number" (only with the on-site join token), the patient's number and position, a "turn is near" banner, and "Cancel" (with an "Are you sure?" step; staff actions have none).
2. Staff page (second static page, shared password checked in the page itself; acceptable here because security is out of scope). Open/Close queue, Serve next, Remove, Move to front, full list, rotate the join token.
3. Database (Firestore). One document, clinic/state, holds everything: settings (queue open/closed, join token, password), tickets (number, joined_at, status, order key) and real service events (anonymous served timestamps). All changes go through transactions. The seed is NOT stored: it is generated in code and merged in when pages read the state. Chosen over separate collections because it is simpler and one listener keeps every page in sync; the limit is 1 MiB per document, so old data is pruned. Without Firebase configured, the pages fall back to a local stand-in store (data stays in the browser).
4. Forecast module: a plain JS function, shared by both pages, that turns the queue and the recent service times into a wait range. No AI, no external service.
5. Retention: pruned inside the transactions: real service events older than 90 days, and ended tickets (served, cancelled, removed) older than 2 days. Seed is generated, so it is never pruned.
6. Repository: the code lives in the user's GitHub repo; pushing to it redeploys GitHub Pages.

How they talk
- Both pages read and write Firestore directly from the browser, using Google's Firebase JS SDK loaded from its CDN (no npm, no build step).
- Updates: pages subscribe to Firestore realtime listeners, so changes appear in about a second (better than the 8 s target). Fallback if listeners are not wanted: poll every 8 s, paused when the tab is in the background.
- Patient identity: a random token in the browser's local storage, stored on the ticket. The ticket number is shown on screen so staff can find a ticket if the token is lost.
- On-site join: the printed QR code on a sign outside carries a secret join token; "Take a number" works only with that token. Staff can rotate the token from the staff page and reprint if abused. Checking the wait needs no token.

Wait calculation: position x average service time of the last ~10 served patients, shown as a range around it, never wider than 15 minutes, wider when data is thin. The seed (about two weeks of deterministic fake service times, 6-8 min average, varying by time of day) initializes the history, so there is no hard-coded default; real service times count more as they accumulate. Staff page has a button to load test scenarios (empty queue, 5 waiting with fast service, closed, patient is next, mid-queue cancel).

Edge states: closed (no numbers issued, "clinic closed" message), no data (position shown with "Wait estimate not available yet", no invented number), zero wait ("you're next").

Known trade-offs: no real security (anyone who reads the page source can reach the database and the staff password); forecast runs in the browser; free tier quotas are enough for one clinic.
