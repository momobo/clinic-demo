Prompt 4: Firestore store and deployment

Same constraints (no framework, no build, node --test). The Firebase JS SDK is the one allowed external dependency, loaded from Google's CDN.

BUILD
1. js/store-logic.js: all store operations as functions that mutate a state object, shared by every store. State holds only real service events; the seed is generated and merged in (publicState). Prune old data.
2. js/store-local.js and js/store-firestore.js: same method names; the Firestore store keeps everything in one document, clinic/state, changed through transactions, with a realtime listener.
3. js/store.js: use Firestore when js/firebase-config.js has real values, otherwise the local store.
4. Pages: await the store, show "Cannot reach the clinic system" on errors, show "Demo mode" when local, put the scenario tools in a collapsed section labelled as replacing the live queue.
5. Tests stay green; add tests for pruning and for the seed not being stored.

DONE WHEN npm test passes, both pages load in local mode, and the Firestore path has been run against a real project.
