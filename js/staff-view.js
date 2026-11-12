// Pure view model and messages for the staff pages (see "Design Spec.md").
import { waitingTickets } from "./queue.js";

export const SCENARIOS = [
  ["empty", "Empty queue"],
  ["fast5", "5 waiting, fast service"],
  ["closed", "Clinic closed, 2 waiting"],
  ["patient-next", "This device is next in line"],
  ["mid-cancel", "This device is 5th, someone ahead left"],
];

export function buildStaffView(state) {
  const waiting = waitingTickets(state);
  const n = waiting.length;
  const first = waiting[0] || null;
  return {
    open: state.open,
    joinToken: state.joinToken,
    nextNumber: first ? first.number : null,
    statusLine: `${state.open ? "Open" : "Closed"}, ${n === 0 ? "nobody waiting" : `${n} waiting`}`,
    nextHeading: first ? `Next: #${first.number}` : "Nobody is waiting",
    nextDetail: first ? `Waiting since ${first.joinedAt.slice(11, 16)}` : "",
    callLabel: first ? `Call next patient (#${first.number})` : "Call next patient",
    listHeading: `Waiting (${n})`,
    waiting: waiting.map((t, i) => ({
      id: t.id,
      number: t.number,
      position: i + 1,
      joinedTime: t.joinedAt.slice(11, 16),
      // every button names its patient, so a screen reader can tell rows apart
      noShowLabel: `Didn't show up: #${t.number}`,
      removeLabel: `Remove #${t.number} from the queue`,
      moveLabel: i > 0 ? `Move #${t.number} to the front` : null,
    })),
  };
}

export const messages = {
  called: (n, remaining) => `Called #${n}. ${remaining === 0 ? "Nobody else is waiting." : `${remaining} waiting.`}`,
  nobodyWaiting: "Nobody is waiting, so there is no one to call.",
  noShow: (n) => `#${n} marked as didn't show up.`,
  removed: (n) => `Removed #${n} from the queue.`,
  moved: (n) => `Moved #${n} to the front.`,
  opened: "Queue opened. Patients can now take a number.",
  closed: "Queue closed. Patients can't take new numbers; numbers already given are kept.",
  linkChanged: "Sign-up link changed. Old QR codes no longer work: print a new one.",
  copied: "Link copied.",
  copyFailed: "Couldn't copy. Select the link above and copy it by hand.",
  wrongPassword: "Wrong password. Please try again.",
  saveFailed: "We couldn't save that. Nothing was changed. Check the connection and try again.",
  offline: "No connection. What you see may be out of date, and actions won't work until it's back.",
};
