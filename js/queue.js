// Pure queue logic shared by the pages. No DOM, no storage, no clock access.
import { estimate } from "./forecast.js";
import { seedAverageForHour } from "./seed.js";

const TURN_NEAR_MINUTES = 5;

export const waitingTickets = (state) =>
  state.tickets.filter((t) => t.status === "waiting").sort((a, b) => a.order - b.order);

export function findOwnTicket(state, clientToken) {
  if (!clientToken) return null;
  const mine = state.tickets.filter((t) => t.clientToken === clientToken);
  return mine.length ? mine.sort((a, b) => b.order - a.order)[0] : null;
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
  if (est.state === "range") return `${est.low}–${est.high} min`;
  return "Wait estimate not available yet";
}

export function nowServingNumber(state) {
  const served = state.tickets.filter((t) => t.status === "served" && t.servedAt);
  if (!served.length) return null;
  return served.sort((a, b) => (a.servedAt < b.servedAt ? 1 : -1))[0].number;
}

const ENDED = {
  served: "You have been served. Thank you!",
  cancelled: "Your ticket was cancelled. Take a new number to rejoin.",
  removed: "Your ticket was removed by the staff. Please ask at the desk.",
};

/**
 * Everything the patient page needs. Exposes only the viewer's own ticket
 * number and the "now serving" number, never other patients' data.
 */
export function buildView({ state, clientToken, hasJoinToken, now }) {
  const own = findOwnTicket(state, clientToken);
  const nowServing = nowServingNumber(state);

  if (own && own.status === "waiting") {
    const waiting = waitingTickets(state);
    const position = waiting.findIndex((t) => t.id === own.id) + 1;
    const est = estimateForPosition(state, position, now);
    const near = est.state === "next" || (est.state === "range" && est.low <= TURN_NEAR_MINUTES);
    return {
      mode: "ticket",
      open: state.open,
      number: own.number,
      position,
      waitText: waitText(est),
      nowServing,
      showTurnNear: near,
      closedNote: state.open ? null : "The clinic is closed. Your ticket is kept.",
    };
  }

  if (own && ENDED[own.status]) {
    return { mode: "ended", open: state.open, message: ENDED[own.status], nowServing,
      canJoin: state.open && hasJoinToken };
  }

  if (!state.open) {
    return { mode: "closed", open: false, message: "Clinic closed", nowServing, canJoin: false };
  }

  const position = waitingTickets(state).length + 1;
  const est = estimateForPosition(state, position, now);
  return {
    mode: "browse",
    open: true,
    waitText: waitText(est, { forJoiner: true }),
    ahead: position - 1,
    nowServing,
    canJoin: hasJoinToken,
  };
}
