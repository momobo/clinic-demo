// Picks the store: Firestore when js/firebase-config.js has real values,
// otherwise the local stand-in (data stays in this browser only).
import { firebaseConfig } from "./firebase-config.js";
import { createLocalStore } from "./store-local.js";

export const isConfigured = !Object.values(firebaseConfig).some((v) => String(v).startsWith("TODO"));

export async function createStore() {
  if (isConfigured) {
    const { createFirestoreStore } = await import("./store-firestore.js");
    return createFirestoreStore({ config: firebaseConfig });
  }
  return createLocalStore();
}
