Acceptance Tests (Part 2, Step 3)

Each test has a concrete input and an observable result. Test data comes from the seed and the scenarios described at the end.

PATIENT
1. Check wait: with the queue open, a phone on 4G opens the patient page and sees a wait range within 3 seconds, with no login or account. The range is no wider than 15 minutes.
2. Live pace: with 5 patients waiting and the seed average at about 6 minutes per patient, the estimate for position 5 is centred near 30 minutes. If the next 3 patients are served in 2 minutes each, the displayed range drops within 5 seconds of the third one.
3. Take a number on site: with a valid join token in the URL, one tap on "Take a number" shows a ticket number and position. Without the token the button is absent or disabled, and the wait can still be viewed.
4. Cancel: "Cancel" asks "Are you sure?" with the default button "Keep my place" and the other "Yes, give up my place". After confirming, the ticket is removed, everyone behind has their position reduced by 1 with a shorter estimate within 5 seconds, and the ticket cannot be revived (a new number must be taken). Two taps in total.
5. Turn near: when a patient's estimated wait drops to 5 minutes or less, a banner appears on their page within 5 seconds.
6. Privacy (manual checklist): inspecting the database and the page shows only ticket number, join time and status, with no names, phone numbers or health data. A patient's page shows only their own number and the "now serving" number.

STAFF (no confirmation step, no undo)
7. Open queue: a person who knows the password opens the queue from the staff page in 3 taps or fewer and under 1 minute. Without the password the staff actions are unavailable.
8. Serve: "Serve next" takes at most 2 taps, removes the patient from the waiting list and records a service time. Estimates for everyone else update within 5 seconds.
9. Remove and move to front: Remove works in at most 2 taps. Move to front makes that patient next and increases everyone else's position by 1.

EDGE CASES
10. Clinic closed: with the queue closed, the page shows "Clinic closed" and no wait range. "Take a number" is unavailable, and tickets already issued are kept.
11. No data: with no seed and nobody served yet, the page shows the patient's position and "Wait estimate not available yet". No error, no "NaN", no blank.
12. Zero wait: with an empty queue, or when the patient is next, the page shows "You're next" or "No wait", not "0-0 min".

SEED AND SCENARIOS
- Seed: about two weeks of anonymous service times, varying by time of day, averaging 6-8 minutes per patient, generated with a fixed random seed so a reset always gives the same data. Rows are marked source "seed", are exempt from the 90-day retention cleanup, and count less than real service times as those accumulate.
- Scenarios (loaded with a button on the staff page, on top of the seed): empty queue; 5 waiting with fast service; closed clinic; patient is next; a patient cancels mid-queue.
