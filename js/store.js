// Picks the store: Firestore when js/firebase-config.js has real values,
// otherwise the local stand-in (data stays in this browser only).
import { firebaseConfig } from "./firebase-config.js";
import { createLocalStore } from "./store-local.js";

export const isConfigured = !Object.values(firebaseConfig).some((v) => String(v).startsWith("TODO"));

// Adding ?local=1 to a page's URL forces the local demo store (used for testing
// and audits, so they never touch the real clinic data).
const forceLocal = typeof location !== "undefined" && new URLSearchParams(location.search).has("local");

export async function createStore() {
  if (isConfigured && !forceLocal) {
    const { createFirestoreStore } = await import("./store-firestore.js");
    return createFirestoreStore({ config: firebaseConfig });
  }
  return createLocalStore();
}
