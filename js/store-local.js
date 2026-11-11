// Local stand-in store: state lives in localStorage, shared across tabs of
// one browser. Used when Firebase is not configured, and by the tests.
import { createOps, freshState, withDefaults, publicState } from "./store-logic.js";

export { localIso } from "./store-logic.js";
const KEY = "clinic-state-v2";

export function createLocalStore({ storage = globalThis.localStorage, now = () => new Date() } = {}) {
  const ops = createOps(now);
  const listeners = new Set();

  function load() {
    try {
      const raw = storage.getItem(KEY);
      if (raw) return withDefaults(JSON.parse(raw));
    } catch { /* fall through to a fresh state */ }
    const s = freshState(now());
    storage.setItem(KEY, JSON.stringify(s));
    return s;
  }
  function save(s) {
    storage.setItem(KEY, JSON.stringify(s));
    listeners.forEach((fn) => fn(publicState(s)));
  }
  function mutate(fn) {
    const s = load();
    const result = fn(s);
    save(s);
    return structuredClone(result);
  }

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) listeners.forEach((fn) => fn(publicState(load())));
    });
  }

  return {
    kind: "local",
    getState: () => publicState(load()),
    subscribe(fn) {
      listeners.add(fn);
      fn(publicState(load()));
      return () => listeners.delete(fn);
    },
    checkPassword: (candidate) => candidate === load().password,
    takeNumber: (a) => mutate((s) => ops.takeNumber(s, a)),
    cancelTicket: (a) => mutate((s) => ops.cancelTicket(s, a)),
    setOpen: (open) => mutate((s) => ops.setOpen(s, open)),
    addFakePatients: (n) => mutate((s) => ops.addFakePatients(s, n)),
    serveNext: (a) => mutate((s) => ops.serveNext(s, a)),
    removeTicket: (id) => mutate((s) => ops.removeTicket(s, id)),
    moveToFront: (id) => mutate((s) => ops.moveToFront(s, id)),
    rotateJoinToken: () => mutate((s) => ops.rotateJoinToken(s)),
    loadScenario: (name, a) => mutate((s) => ops.loadScenario(s, name, a)),
    reset: () => mutate((s) => ops.reset(s)),
  };
}
