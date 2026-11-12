// Pure queue logic shared by the pages. No DOM, no storage, no clock access.
import { estimate } from "./forecast.js";
import { seedAverageForHour } from "./seed.js";

const TURN_NEAR_MINUTES = 5;

export const waitingTickets = (state) =>
  state.tickets.filter((t) => t.status === "waiting").sort((a, b) => a.order - b.order);

export function findOwnTicket(state, clientToken) {
  if (!clientToken) return null;
  const mine = state.tickets.filter((t) => t.clientToken === clientToken);
  // Prefer a waiting ticket; otherwise the most recent one (numbers only grow,
  // while "order" can change when staff move a patient to the front).
  return mine.find((t) => t.status === "waiting") || mine.sort((x, y) => y.number - x.number)[0] || null;
}

export function realServiceMinutes(state) {
  return state.serviceEvents
    .filter((e) => e.source === "real")
    .sort((a, b) => (a.servedAt < b.servedAt ? -1 : 1))
    .slice(-10)
    .map((e) => e.durationMinutes);
}

export function seedAverage(state, now) {
  const seed = state.serviceEvents.filter((e) => e.source === "seed");
  const forHour = seedAverageForHour(seed, now.getHours());
  if (forHour !== null) return forHour;
  // Outside clinic hours the seed has nothing for this hour: use its overall mean.
  return seed.length ? seed.reduce((s, e) => s + e.durationMinutes, 0) / seed.length : null;
}

export function estimateForPosition(state, position, now) {
  return estimate({
    position,
    realServiceMinutes: realServiceMinutes(state),
    seedAverageMinutes: seedAverage(state, now),
  });
}

export function waitText(est, { forJoiner = false } = {}) {
  if (est.state === "next") return forJoiner ? "No wait" : "You're next";
  if (est.state === "range") return `${est.low}\u2013${est.high} min`;
  return "Wait estimate not available yet";
}

export function ordinal(n) {
  const suffix = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}

export const positionText = (n) => (n === 1 ? "First in line" : `${ordinal(n)} in line`);

export const lastCalledText = (n) => (n === null ? "Nobody called yet" : `Last called: #${n}`);

export const waitingText = (n) =>
  n === 0 ? "Nobody is waiting" : `${n} ${n === 1 ? "person is" : "people are"} waiting`;

export function nowServingNumber(state) {
  const served = state.tickets.filter((t) => t.status === "served" && t.servedAt);
  if (!served.length) return null;
  return served.sort((a, b) => (a.servedAt < b.servedAt ? 1 : -1))[0].number;
}

const ENDED = {
  served: "Your number was called. Thank you for waiting.",
  cancelled: "You left the queue. You can take a new number if you change your mind.",
  noshow: "Your number was called, but you were not here. Please see the front desk or take a new number.",
  removed: "Your number was removed from the queue by the staff. Please ask at the front desk.",
};

export const KEEP_OPEN_NOTE = "Keep this page open. We cannot alert you if your phone goes to sleep.";
export const JOIN_HELP = "To take a number, please use the QR code at the clinic or ask at the front desk.";

/**
 * Everything the patient page needs, as ready-to-show text. Exposes only the
 * viewer's own number and the last called number, never other patients' data.
 */
export function buildView({ state, clientToken, hasJoinToken, now }) {
  const own = findOwnTicket(state, clientToken);
  const nowServing = nowServingNumber(state);
  const lastCalled = lastCalledText(nowServing);

  if (own && own.status === "waiting") {
    const waiting = waitingTickets(state);
    const position = waiting.findIndex((t) => t.id === own.id) + 1;
    const est = estimateForPosition(state, position, now);
    const near = est.state === "next" || (est.state === "range" && est.low <= TURN_NEAR_MINUTES);
    return {
      mode: "ticket",
      open: state.open,
      number: own.number,
      numberText: `Your number: #${own.number}`,
      position,
      positionText: positionText(position),
      waitText: waitText(est),
      nowServing,
      lastCalledText: lastCalled,
      keepOpenNote: KEEP_OPEN_NOTE,
      showTurnNear: near,
      closedNote: state.open ? null : "The clinic is closed. Your number is kept.",
    };
  }

  if (own && ENDED[own.status]) {
    return { mode: "ended", open: state.open, message: ENDED[own.status], nowServing,
      lastCalledText: lastCalled, canJoin: state.open && hasJoinToken, joinHelp: hasJoinToken ? null : JOIN_HELP };
  }

  if (!state.open) {
    return { mode: "closed", open: false, message: "Clinic closed", detail: "Please try again later or ask at the front desk.",
      nowServing, lastCalledText: lastCalled, canJoin: false };
  }

  const position = waitingTickets(state).length + 1;
  const est = estimateForPosition(state, position, now);
  return {
    mode: "browse",
    open: true,
    waitText: waitText(est, { forJoiner: true }),
    ahead: position - 1,
    waitingText: waitingText(position - 1),
    nowServing,
    lastCalledText: lastCalled,
    canJoin: hasJoinToken,
    joinHelp: hasJoinToken ? null : JOIN_HELP,
  };
}
