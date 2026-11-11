// Pure view model for the staff page.
import { waitingTickets } from "./queue.js";

export const SCENARIOS = [
  ["empty", "Empty queue"],
  ["fast5", "5 waiting, fast service"],
  ["closed", "Clinic closed"],
  ["patient-next", "You are next"],
  ["mid-cancel", "You, with a cancel ahead"],
];

export function buildStaffView(state) {
  const waiting = waitingTickets(state);
  return {
    open: state.open,
    joinToken: state.joinToken,
    nextNumber: waiting.length ? waiting[0].number : null,
    waiting: waiting.map((t, i) => ({
      id: t.id,
      number: t.number,
      position: i + 1,
      joinedTime: t.joinedAt.slice(11, 16),
    })),
  };
}
