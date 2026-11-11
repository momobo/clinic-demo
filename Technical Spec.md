The Clinic Wait Time Project, Part 2 - Step 2: Technical Spec

Constraint: exercise project, zero cost, security not a priority. Single clinic, single queue.

What gets built: two static web pages hosted on GitHub Pages, talking directly to a free hosted database (Firebase Firestore, free tier). No server of our own.

Pieces
1. Patient page (static HTML + vanilla JS, no framework, no build step). Shows the wait range, "Take a number" (only with the on-site join token), the patient's number and position, a "turn is near" banner, and "Cancel".
2. Staff page (second static page, shared password checked in the page itself; acceptable here because security is out of scope). Open/Close queue, Serve next, Remove, Move to front, full list, rotate the join token.
3. Database (Firestore). Collections: tickets (number, joined_at, status, order key), service_events (anonymous served timestamps), settings (queue open/closed, join token, password).
4. Forecast module: a plain JS function, shared by both pages, that turns the queue and the recent service times into a wait range. No AI, no external service.
5. Retention: service_events older than 90 days are deleted (Firestore TTL policy, or a staff-page cleanup button if TTL is not available).
6. Repository: the code lives in the user's GitHub repo; pushing to it redeploys GitHub Pages.

How they talk
- Both pages read and write Firestore directly from the browser.
- Updates: pages subscribe to Firestore realtime listeners, so changes appear in about a second (better than the 8 s target). Fallback if listeners are not wanted: poll every 8 s, paused when the tab is in the background.
- Patient identity: a random token in the browser's local storage, stored on the ticket. The ticket number is shown on screen so staff can find a ticket if the token is lost.
- On-site join: the printed QR code on a sign outside carries a secret join token; "Take a number" works only with that token. Staff can rotate the token from the staff page and reprint if abused. Checking the wait needs no token.

Wait calculation: position x average service time of the last ~10 served patients, shown as a range around it, never wider than 15 minutes, wider when data is thin. With fewer than 3 patients served today, use a default blended with the historical average.

Edge states: closed (no numbers issued, "clinic closed" message), no data (default estimate marked as rough), zero wait ("you're next").

Known trade-offs: no real security (anyone who reads the page source can reach the database and the staff password); forecast runs in the browser; free tier quotas are enough for one clinic.
