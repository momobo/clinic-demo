Prompt 5: patient page rebuilt against "Design Spec.md"

Read "Design Spec.md", "Audit.md" and the existing code. Keep all existing tests green; change a test only where the spec deliberately changed the wording.

BUILD
1. Data: add markNoShow (status "noshow", service history untouched) to the shared store logic and to both stores. Ended tickets include noshow for pruning.
2. js/queue.js: patient texts follow the spec (position as "6th in line", "Your number: #16", "Last called: #10" or "Nobody called yet", "N people are waiting", the keep-this-page-open note, clear messages for called / left / no-show / removed / closed, how-to-join help). Patients never see "ticket", "token" or "Now serving".
3. index.html, css, js/patient.js: wait is the largest text; layout is rebuilt only when the screen changes and text is updated in place so focus stays; focus moves only where the spec says; one status line (role=status) and one error line (role=alert); offline banner and "Updated hh:mm"; screen wake lock while holding a number, with a line saying so; h2 headings; "Leave the queue" last and quiet.
4. Tests in test/design.test.js for wording, hierarchy fields and no-show.

DONE WHEN npm test passes; re-run the baseline audit checks on the patient page (axe, focus tests, offline) and report before/after.
