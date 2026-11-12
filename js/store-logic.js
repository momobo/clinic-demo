// Store logic shared by the local stand-in and the Firestore store.
// Every operation mutates a state object in place and may throw. The stores
// decide where the state lives (localStorage or one Firestore document).
// The state holds only REAL service events; the seed is generated in code
// and merged in by publicState().
import { generateSeed } from "./seed.js";

export const DEFAULT_JOIN_TOKEN = "demo";
export const DEFAULT_PASSWORD = "clinic";
const MAX_RECORDED_MINUTES = 30;
const KEEP_EVENTS_DAYS = 90;
const KEEP_ENDED_TICKETS_DAYS = 2;

const pad = (n) => String(n).padStart(2, "0");
export const localIso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export function freshState(now) {
  return {
    open: true,
    joinToken: DEFAULT_JOIN_TOKEN,
    password: DEFAULT_PASSWORD,
    openedAt: localIso(now),
    nextNumber: 1,
    nextOrder: 1,
    tickets: [],
    serviceEvents: [], // real events only
  };
}

export const withDefaults = (s) => ({
  ...freshState(new Date()),
  ...s,
  tickets: s.tickets || [],
  serviceEvents: (s.serviceEvents || []).filter((e) => e.source !== "seed"),
});

let seedCache = null;
/** What the pages see: the stored state plus the generated seed history. */
export function publicState(s) {
  seedCache = seedCache || generateSeed();
  return structuredClone({ ...s, serviceEvents: [...seedCache, ...s.serviceEvents] });
}

const daysAgoIso = (now, days) => localIso(new Date(now.getTime() - days * 86400000));

/** Keeps the state small: events older than 90 days, ended tickets older than 2 days. */
export function prune(s, now) {
  const evCut = daysAgoIso(now, KEEP_EVENTS_DAYS);
  s.serviceEvents = s.serviceEvents.filter((e) => e.servedAt >= evCut);
  const tCut = daysAgoIso(now, KEEP_ENDED_TICKETS_DAYS);
  s.tickets = s.tickets.filter((t) => t.status === "waiting" || (t.servedAt || t.joinedAt) >= tCut);
}

// Resetting the queue must not undo the clinic's own settings.
function keepSettings(from, to) {
  if (from.password) to.password = from.password;
  if (from.joinToken) to.joinToken = from.joinToken;
}

function replaceState(s, next) {
  for (const k of Object.keys(s)) delete s[k];
  Object.assign(s, next);
}

export function createOps(now = () => new Date()) {
  const newTicket = (s, clientToken) => {
    const t = {
      id: `t${s.nextOrder}`,
      number: s.nextNumber++,
      order: s.nextOrder++,
      joinedAt: localIso(now()),
      status: "waiting",
      clientToken,
    };
    s.tickets.push(t);
    return t;
  };

  return {
    takeNumber(s, { joinToken, clientToken }) {
      if (!s.open) throw new Error("closed");
      if (!joinToken || joinToken !== s.joinToken) throw new Error("invalid-token");
      const existing = s.tickets.find((t) => t.clientToken === clientToken && t.status === "waiting");
      if (existing) return existing;
      prune(s, now());
      return newTicket(s, clientToken);
    },

    /** A cancelled ticket is final: there is no way to revive it. */
    cancelTicket(s, { clientToken }) {
      const t = s.tickets.find((x) => x.clientToken === clientToken && x.status === "waiting");
      if (!t) return false;
      t.status = "cancelled";
      return true;
    },

    setOpen(s, open) {
      if (open && !s.open) s.openedAt = localIso(now());
      s.open = open;
    },

    addFakePatients(s, n) {
      for (let i = 0; i < n; i++) newTicket(s, `fake-${s.nextOrder}`);
    },

    /**
     * Serves the first waiting patient. The duration is the time since the
     * previous service (or since the queue opened) unless durationMinutes is
     * given. Durations outside 0.5-30 min are not recorded.
     */
    serveNext(s, { durationMinutes } = {}) {
      const next = s.tickets.filter((t) => t.status === "waiting").sort((a, b) => a.order - b.order)[0];
      if (!next) return null;
      const t = now();
      let minutes = durationMinutes;
      if (minutes === undefined) {
        const lastReal = s.serviceEvents.map((e) => e.servedAt).sort().pop();
        minutes = (t - new Date(lastReal || s.openedAt)) / 60000;
      }
      next.status = "served";
      next.servedAt = localIso(t);
      if (minutes >= 0.5 && minutes <= MAX_RECORDED_MINUTES) {
        s.serviceEvents.push({ servedAt: next.servedAt, durationMinutes: Math.round(minutes * 10) / 10, source: "real" });
      }
      prune(s, t);
      return next;
    },

    removeTicket(s, id) {
      const t = s.tickets.find((x) => x.id === id && x.status === "waiting");
      if (!t) return false;
      t.status = "removed";
      return true;
    },

    /** Called but did not show up: the entry ends; service history is not touched. */
    markNoShow(s, id) {
      const t = s.tickets.find((x) => x.id === id && x.status === "waiting");
      if (!t) return false;
      t.status = "noshow";
      return true;
    },

    moveToFront(s, id) {
      const waiting = s.tickets.filter((x) => x.status === "waiting");
      const t = waiting.find((x) => x.id === id);
      if (!t) return false;
      t.order = Math.min(...waiting.map((x) => x.order)) - 1;
      return true;
    },

    /** Old join links stop working for taking numbers. Returns the new token. */
    rotateJoinToken(s) {
      s.joinToken = Math.random().toString(36).slice(2, 10);
      return s.joinToken;
    },

    /**
     * Replaces the whole state with a test situation. clientToken is the
     * browser's own patient token, so a scenario can include "your" ticket.
     */
    loadScenario(s, name, { clientToken } = {}) {
      const f = freshState(now());
      const t0 = now();
      const addWaiting = (token) => newTicketIn(f, token ?? `fake-${f.nextOrder}`);
      function newTicketIn(state, token) {
        const t = { id: `t${state.nextOrder}`, number: state.nextNumber++, order: state.nextOrder++,
          joinedAt: localIso(t0), status: "waiting", clientToken: token };
        state.tickets.push(t);
        return t;
      }
      const addServed = (n, minutes) => {
        for (let i = 0; i < n; i++) {
          const at = localIso(new Date(t0.getTime() - (n - i) * minutes * 60000));
          f.tickets.push({ id: `t${f.nextOrder}`, number: f.nextNumber++, order: f.nextOrder++,
            joinedAt: at, servedAt: at, status: "served", clientToken: `fake-${f.nextOrder}` });
          f.serviceEvents.push({ servedAt: at, durationMinutes: minutes, source: "real" });
        }
      };
      switch (name) {
        case "empty": break;
        case "fast5": addServed(10, 2); for (let i = 0; i < 5; i++) addWaiting(); break;
        case "closed": f.open = false; addWaiting(); addWaiting(); break;
        case "patient-next": addWaiting(clientToken); break;
        case "mid-cancel": {
          const ts = [addWaiting(), addWaiting(), addWaiting(), addWaiting(), addWaiting(clientToken)];
          ts[2].status = "cancelled"; // the 3rd patient gives up: the last one moves up
          break;
        }
        default: throw new Error(`unknown scenario: ${name}`);
      }
      keepSettings(s, f);
      replaceState(s, f);
    },

    reset(s) {
      const f = freshState(now());
      keepSettings(s, f);
      replaceState(s, f);
    },
  };
}
