Prompt 3: staff page (QR code skipped for now)

Read the spec files and all existing code. Same constraints as before (no framework, no build, no dependencies, node --test). Security out of scope; staff actions have no confirmation and no undo.

BUILD
1. Extend js/store-local.js with: checkPassword (default "clinic"), removeTicket, moveToFront, rotateJoinToken, loadScenario(name, {clientToken}) with scenarios empty, fast5, closed, patient-next, mid-cancel.
2. staff.html + js/staff.js: password screen first (nothing else visible without it); open/close; "Serve next (#N)"; waiting list with Remove and Move to front; patient link with copy and "Rotate join token"; scenario buttons; reset. js/staff-view.js holds the pure view model.
3. Delete dev.html.
4. Tests for acceptance tests 7, 8, 9, scenarios and token rotation.

DONE WHEN npm test passes; list assumptions and what could not be tested.
