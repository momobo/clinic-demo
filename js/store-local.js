// Local stand-in for the Firestore store: state lives in localStorage so the
// patient page and the dev page share it across tabs of the same browser.
// The real Firestore store (later) must offer the same methods.
import { generateSeed } from "./seed.js";

const KEY = "clinic-state-v1";
const DEFAULT_JOIN_TOKEN = "demo";
const DEFAULT_PASSWORD = "clinic";
const MAX_RECORDED_MINUTES = 30;

const pad = (n) => String(n).padStart(2, "0");
export const localIso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

function freshState(now) {
  return {
    open: true,
    joinToken: DEFAULT_JOIN_TOKEN,
    password: DEFAULT_PASSWORD,
    openedAt: localIso(now),
    nextNumber: 1,
    nextOrder: 1,
    tickets: [],
    serviceEvents: generateSeed(),
  };
}

export function createLocalStore({ storage = globalThis.localStorage, now = () => new Date() } = {}) {
  const listeners = new Set();

  function load() {
    try {
      const raw = storage.getItem(KEY);
      // Older saved states may lack newer fields: fill them in.
      if (raw) return { password: DEFAULT_PASSWORD, ...JSON.parse(raw) };
    } catch { /* fall through to a fresh state */ }
    const s = freshState(now());
    storage.setItem(KEY, JSON.stringify(s));
    return s;
  }
  const save = (s) => {
    storage.setItem(KEY, JSON.stringify(s));
    listeners.forEach((fn) => fn(structuredClone(s)));
  };

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) listeners.forEach((fn) => fn(load()));
    });
  }

  return {
    getState: () => structuredClone(load()),
    subscribe(fn) {
      listeners.add(fn);
      fn(structuredClone(load()));
      return () => listeners.delete(fn);
    },

    takeNumber({ joinToken, clientToken }) {
      const s = load();
      if (!s.open) throw new Error("closed");
      if (!joinToken || joinToken !== s.joinToken) throw new Error("invalid-token");
      const existing = s.tickets.find((t) => t.clientToken === clientToken && t.status === "waiting");
      if (existing) return structuredClone(existing);
      const ticket = {
        id: `t${s.nextOrder}`,
        number: s.nextNumber++,
        order: s.nextOrder++,
        joinedAt: localIso(now()),
        status: "waiting",
        clientToken,
      };
      s.tickets.push(ticket);
      save(s);
      return structuredClone(ticket);
    },

    /** A cancelled ticket is final: there is no way to revive it. */
    cancelTicket({ clientToken }) {
      const s = load();
      const t = s.tickets.find((x) => x.clientToken === clientToken && x.status === "waiting");
      if (!t) return false;
      t.status = "cancelled";
      save(s);
      return true;
    },

    // --- dev / staff-side operations (the staff page will reuse these) ---
    setOpen(open) {
      const s = load();
      if (open && !s.open) s.openedAt = localIso(now());
      s.open = open;
      save(s);
    },

    addFakePatients(n) {
      const s = load();
      for (let i = 0; i < n; i++) {
        s.tickets.push({
          id: `t${s.nextOrder}`, number: s.nextNumber++, order: s.nextOrder++,
          joinedAt: localIso(now()), status: "waiting", clientToken: `fake-${s.nextOrder}`,
        });
      }
      save(s);
    },

    /**
     * Serves the first waiting patient. The service duration is the time since
     * the previous service (or since the queue opened), unless
     * durationMinutes is given. Durations outside 0.5-30 min are not recorded.
     */
    serveNext({ durationMinutes } = {}) {
      const s = load();
      const next = s.tickets.filter((t) => t.status === "waiting").sort((a, b) => a.order - b.order)[0];
      if (!next) return null;
      const t = now();
      let minutes = durationMinutes;
      if (minutes === undefined) {
        const lastReal = s.serviceEvents.filter((e) => e.source === "real")
          .map((e) => e.servedAt).sort().pop();
        const since = new Date(lastReal || s.openedAt);
        minutes = (t - since) / 60000;
      }
      next.status = "served";
      next.servedAt = localIso(t);
      if (minutes >= 0.5 && minutes <= MAX_RECORDED_MINUTES) {
        s.serviceEvents.push({ servedAt: next.servedAt, durationMinutes: Math.round(minutes * 10) / 10, source: "real" });
      }
      save(s);
      return structuredClone(next);
    },

    checkPassword: (candidate) => candidate === load().password,

    removeTicket(id) {
      const s = load();
      const t = s.tickets.find((x) => x.id === id && x.status === "waiting");
      if (!t) return false;
      t.status = "removed";
      save(s);
      return true;
    },

    moveToFront(id) {
      const s = load();
      const waiting = s.tickets.filter((x) => x.status === "waiting");
      const t = waiting.find((x) => x.id === id);
      if (!t) return false;
      t.order = Math.min(...waiting.map((x) => x.order)) - 1;
      save(s);
      return true;
    },

    /** Old join links stop working for taking numbers. Returns the new token. */
    rotateJoinToken() {
      const s = load();
      s.joinToken = Math.random().toString(36).slice(2, 10);
      save(s);
      return s.joinToken;
    },

    /**
     * Resets to the seed, then builds a test situation. clientToken is the
     * browser's own patient token, so a scenario can include "your" ticket.
     */
    loadScenario(name, { clientToken } = {}) {
      const s = freshState(now());
      const t0 = now();
      const addWaiting = (token) => {
        s.tickets.push({ id: `t${s.nextOrder}`, number: s.nextNumber++, order: s.nextOrder++,
          joinedAt: localIso(t0), status: "waiting", clientToken: token ?? `fake-${s.nextOrder}` });
        return s.tickets[s.tickets.length - 1];
      };
      const addServed = (n, minutes) => {
        for (let i = 0; i < n; i++) {
          const at = localIso(new Date(t0.getTime() - (n - i) * minutes * 60000));
          s.tickets.push({ id: `t${s.nextOrder}`, number: s.nextNumber++, order: s.nextOrder++,
            joinedAt: at, servedAt: at, status: "served", clientToken: `fake-${s.nextOrder}` });
          s.serviceEvents.push({ servedAt: at, durationMinutes: minutes, source: "real" });
        }
      };
      switch (name) {
        case "empty": break;
        case "fast5": addServed(10, 2); for (let i = 0; i < 5; i++) addWaiting(); break;
        case "closed": s.open = false; addWaiting(); addWaiting(); break;
        case "patient-next": addWaiting(clientToken); break;
        case "mid-cancel": {
          const ts = [addWaiting(), addWaiting(), addWaiting(), addWaiting(), addWaiting(clientToken)];
          ts[2].status = "cancelled"; // the 3rd patient gives up: the last one moves up
          break;
        }
        default: throw new Error(`unknown scenario: ${name}`);
      }
      save(s);
    },

    reset() {
      save(freshState(now()));
    },
  };
}
