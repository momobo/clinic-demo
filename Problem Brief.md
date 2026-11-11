The Clinic Wait Time Project

-- A community health clinic needs a way for patients to check wait times before coming in

A patient come into the clinic, and get a number, from a machine or with an app. Do we have an employee in the lobby at any time? [Decided: yes, assumed always present, with special functions in a staff web page.]
The patient has to know his number. We need some kind of display, a panel, or in the app. 
Could I suppose every patient has a cellphone? [Decided: yes, for simplicity. No paper ticket, no lobby display; the patient uses a mobile web page reached by QR code, with no app and no account.]
Once I have the history, I could just extrapolate the speed of the queue, eventually using statistic to forecast the wait time.
It would be best if the Patient came in, and already sees the waiting time. Then he could decide coming into the queue. If the expected time are long, the patient could go and will be alerted 5 min before the expected time. [Decided: v1 shows a banner on the page; SMS moves to v2.] The wait time is shown as a range. When the patient is served, we need to drop the patient from the queue, automatically. 
Are there parallel queues? maybe retiring results? Possible feature. [Decided: single queue for v1.]
Budget is probably low. No AI with image recognition. Just possibly a printer for the ticket, and a panel with the expected time or times. The app is optional, but is vibe coded, therefore cheap. [Decided: printer and panel dropped; a mobile web page replaces them.] 
Option for the empolyees: start the queue, stop the queue, manually eliminate a patient. Manually get a patient to jump the queue. [Decided: staff page protected by a shared password in v1.]
Option for the patient: scan the QR code on site and take a number on the phone (the wait time can be checked from anywhere, but taking a number is only possible on site). A patient can cancel; a cancelled ticket is dropped and cannot be reinstated.

Privacy: only ticket number, join time and status are stored; no names, phone numbers or health data. A patient sees only their own number and the 'now serving' number. Anonymous timestamps are kept 90 days for forecasting. The phone remembers its ticket through a browser token; if lost, staff can find the ticket by number.