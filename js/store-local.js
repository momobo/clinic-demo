// Local stand-in for the Firestore store: state lives in localStorage so the
// patient page and the dev page share it across tabs of the same browser.
// The real Firestore store (later) must offer the same methods.
import { generateSeed } from "./seed.js";

const KEY = "clinic-state-v1";
const DEFAULT_JOIN_TOKEN = "demo";
const MAX_RECORDED_MINUTES = 30;

const pad = (n) => String(n).padStart(2, "0");
export const localIso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

function freshState(now) {
  return {
    open: true,
    joinToken: DEFAULT_JOIN_TOKEN,
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
      if (raw) return JSON.parse(raw);
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

    reset() {
      save(freshState(now()));
    },
  };
}
