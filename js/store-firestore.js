// Firestore store: the whole clinic state lives in ONE document, clinic/state,
// changed only through transactions. Every open page listens to that document,
// so changes appear in about a second. Methods are async; same names as the
// local store. Loaded from Google's CDN (no npm, no build step).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, runTransaction } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { createOps, freshState, withDefaults, publicState } from "./store-logic.js";

export function createFirestoreStore({ config, now = () => new Date() }) {
  const db = getFirestore(initializeApp(config));
  const ref = doc(db, "clinic", "state");
  const ops = createOps(now);
  const listeners = new Set();
  const errorListeners = new Set();
  let cache = null; // last public state received
  let rawPassword = null;
  let creating = false;
  let failure = null;

  async function mutate(fn) {
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const s = snap.exists() ? withDefaults(snap.data()) : freshState(now());
      const result = fn(s);
      tx.set(ref, JSON.parse(JSON.stringify(s))); // drops undefined values
      return JSON.parse(JSON.stringify(result ?? null));
    });
  }

  // No answer from the server within 10 s: tell the pages, instead of
  // leaving them blank or showing an invented empty queue.
  const giveUp = setTimeout(() => {
    if (!cache) { failure = new Error("timeout"); errorListeners.forEach((fn) => fn(failure)); }
  }, 10000);

  onSnapshot(
    ref,
    (snap) => {
      // An empty snapshot that did not come from the server is not an answer
      // (the server may be unreachable or refusing): keep waiting for it.
      if (!snap.exists() && snap.metadata.fromCache) return;
      clearTimeout(giveUp);
      if (!snap.exists()) {
        // First ever visit: show a fresh state and create the document.
        const s = freshState(now());
        rawPassword = s.password;
        cache = publicState(s);
        if (!creating) { creating = true; mutate(() => {}).catch(() => { creating = false; }); }
      } else {
        const s = withDefaults(snap.data());
        rawPassword = s.password;
        cache = publicState(s);
      }
      listeners.forEach((fn) => fn(structuredClone(cache)));
    },
    (err) => { clearTimeout(giveUp); failure = err; errorListeners.forEach((fn) => fn(err)); },
  );

  return {
    kind: "firestore",
    getState: () => (cache ? structuredClone(cache) : null),
    subscribe(fn, onError) {
      listeners.add(fn);
      if (onError) errorListeners.add(onError);
      if (cache) fn(structuredClone(cache));
      else if (failure && onError) onError(failure);
      return () => { listeners.delete(fn); if (onError) errorListeners.delete(onError); };
    },
    checkPassword: async (candidate) => rawPassword !== null && candidate === rawPassword,
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
