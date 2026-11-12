Prompt 6: staff pages rebuilt against "Design Spec.md"

Read "Design Spec.md", "Audit.md" and the existing code. Keep all tests green.

BUILD
1. staff.html + js/staff.js: home with the status line, "Next: #N" and one big "Call next patient" (aria-disabled, never disabled, when nobody waits); the waiting list as an ordered list; per row "Didn't show up", "Remove from queue" and "Move to front", each with the patient's number in its accessible name.
2. staff-settings.html + js/staff-settings.js: open/close, the patient sign-up link with copy and "Change the sign-up link", and test data in a collapsed section that says it replaces the real queue.
3. js/staff-common.js: password gate as a real form (label, submit, wrong-password message, focus handling), status line (role=status) and error line (role=alert), offline banner, "Updated hh:mm", a renderer that builds layout only when the screen changes and moves focus only as the spec says (after a row action: the same button on the next row, or the list heading).
4. js/staff-view.js: pure texts and messages; every action produces a message saying what happened.
5. Tests for the new texts, unique button names and messages; no developer words.

DONE WHEN npm test passes; re-run the staff audit (axe, focus, messages) and report before/after.
