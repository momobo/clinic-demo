import { test } from "node:test";
import assert from "node:assert/strict";
import { createLocalStore } from "../js/store-local.js";
import { buildView } from "../js/queue.js";
import { buildStaffView, SCENARIOS } from "../js/staff-view.js";

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
const NOW = new Date(2026, 10, 11, 10, 30, 0);
const mk = () => createLocalStore({ storage: fakeStorage(), now: () => NOW });
const pv = (s, token) => buildView({ state: s.getState(), clientToken: token, hasJoinToken: true, now: NOW });
const numbers = (s) => buildStaffView(s.getState()).waiting.map((w) => w.number);

test("test 7: password check", () => {
  const s = mk();
  assert.equal(s.checkPassword("clinic"), true);
  assert.equal(s.checkPassword("nope"), false);
  assert.equal(s.checkPassword(""), false);
  assert.equal(s.checkPassword(undefined), false);
});

test("test 7: opening and closing the queue", () => {
  const s = mk();
  s.setOpen(false);
  assert.equal(buildStaffView(s.getState()).open, false);
  s.setOpen(true);
  assert.equal(buildStaffView(s.getState()).open, true);
});

test("test 8: serve next removes the patient, records a service, updates the others", () => {
  const s = mk();
  s.addFakePatients(3);
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  assert.equal(pv(s, "A").position, 4);
  const events = s.getState().serviceEvents.length;
  const served = s.serveNext({ durationMinutes: 5 });
  assert.equal(served.number, 1);
  assert.deepEqual(numbers(s), [2, 3, 4]);
  assert.equal(s.getState().serviceEvents.length, events + 1);
  assert.equal(pv(s, "A").position, 3);
  assert.equal(buildStaffView(s.getState()).nextNumber, 2);
});

test("test 8: serving an empty queue does nothing", () => {
  const s = mk();
  assert.equal(s.serveNext({ durationMinutes: 5 }), null);
});

test("test 9: remove takes the patient out; the others move up", () => {
  const s = mk();
  s.addFakePatients(3);
  assert.equal(s.removeTicket("t2"), true);
  assert.deepEqual(numbers(s), [1, 3]);
  assert.equal(s.removeTicket("t2"), false); // already gone
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  assert.equal(pv(s, "A").position, 3);
});

test("test 9: a removed patient sees a message and can take a new number", () => {
  const s = mk();
  const t = s.takeNumber({ joinToken: "demo", clientToken: "A" });
  s.removeTicket(t.id);
  assert.equal(pv(s, "A").mode, "ended");
  assert.match(pv(s, "A").message, /removed/);
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  assert.equal(pv(s, "A").mode, "ticket");
});

test("test 9: move to front makes the patient next, others +1", () => {
  const s = mk();
  s.addFakePatients(3);
  s.takeNumber({ joinToken: "demo", clientToken: "A" }); // #4, position 4
  assert.equal(s.moveToFront("t4"), true);
  assert.deepEqual(numbers(s), [4, 1, 2, 3]);
  assert.equal(pv(s, "A").position, 1);
  assert.equal(pv(s, "A").waitText, "You're next");
  assert.equal(s.moveToFront("t999"), false);
  s.moveToFront("t3"); // moving again still works with negative order keys
  assert.deepEqual(numbers(s), [3, 4, 1, 2]);
});

test("move to front: a returning patient with an old cancelled ticket still sees the new one", () => {
  const s = mk();
  s.addFakePatients(2);
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  s.cancelTicket({ clientToken: "A" });
  const t = s.takeNumber({ joinToken: "demo", clientToken: "A" });
  s.moveToFront(t.id);
  const v = pv(s, "A");
  assert.equal(v.mode, "ticket");
  assert.equal(v.position, 1);
});

test("join token rotation: old token is refused, new one works", () => {
  const s = mk();
  const fresh = s.rotateJoinToken();
  assert.notEqual(fresh, "demo");
  assert.ok(fresh.length >= 6);
  assert.throws(() => s.takeNumber({ joinToken: "demo", clientToken: "A" }), /invalid-token/);
  assert.equal(s.takeNumber({ joinToken: fresh, clientToken: "A" }).number, 1);
  assert.equal(buildStaffView(s.getState()).joinToken, fresh);
});

test("scenarios: each one loads and gives the expected situation", () => {
  const s = mk();
  s.loadScenario("empty");
  assert.deepEqual(numbers(s), []);
  assert.equal(s.getState().open, true);

  s.loadScenario("fast5");
  assert.equal(numbers(s).length, 5);
  const real = s.getState().serviceEvents.filter((e) => e.source === "real");
  assert.equal(real.length, 10);
  assert.ok(real.every((e) => e.durationMinutes === 2));

  s.loadScenario("closed");
  assert.equal(s.getState().open, false);
  assert.equal(pv(s, "stranger").message, "Clinic closed");

  s.loadScenario("patient-next", { clientToken: "ME" });
  assert.equal(pv(s, "ME").waitText, "You're next");

  s.loadScenario("mid-cancel", { clientToken: "ME" });
  assert.equal(numbers(s).length, 4); // 5 minus the one who cancelled
  assert.equal(pv(s, "ME").position, 4); // would have been 5

  assert.throws(() => s.loadScenario("bogus"), /unknown/);
  assert.equal(SCENARIOS.length, 5);
  assert.ok(SCENARIOS.every(([name]) => { s.loadScenario(name, { clientToken: "ME" }); return true; }));
});

test("scenario load replaces the previous queue and real history", () => {
  const s = mk();
  s.addFakePatients(4);
  s.serveNext({ durationMinutes: 5 });
  s.loadScenario("empty");
  const st = s.getState();
  assert.equal(st.tickets.length, 0);
  assert.equal(st.serviceEvents.filter((e) => e.source === "real").length, 0);
});

test("an older saved state without a password still gets the default", () => {
  const storage = fakeStorage();
  storage.setItem("clinic-state-v2", JSON.stringify({ open: true, joinToken: "custom", openedAt: "2026-11-11T08:00:00",
    nextNumber: 1, nextOrder: 1, tickets: [], serviceEvents: [] }));
  const s = createLocalStore({ storage, now: () => NOW });
  assert.equal(s.checkPassword("clinic"), true);
  assert.equal(s.getState().joinToken, "custom"); // the stored state was really read
});

test("the seed is generated in code, never stored", () => {
  const storage = fakeStorage();
  const s = createLocalStore({ storage, now: () => NOW });
  s.addFakePatients(1);
  const stored = JSON.parse(storage.getItem("clinic-state-v2"));
  assert.equal(stored.serviceEvents.length, 0);
  const seedRows = s.getState().serviceEvents.filter((e) => e.source === "seed");
  assert.ok(seedRows.length > 500);
  s.serveNext({ durationMinutes: 5 });
  assert.equal(s.getState().serviceEvents.filter((e) => e.source === "seed").length, seedRows.length); // not doubled
});

test("old data is pruned: events past 90 days, ended tickets past 2 days", () => {
  const storage = fakeStorage();
  const old = { open: true, joinToken: "demo", password: "clinic", openedAt: "2026-01-01T08:00:00", nextNumber: 5, nextOrder: 5,
    tickets: [
      { id: "t1", number: 1, order: 1, joinedAt: "2026-11-01T09:00:00", status: "served", servedAt: "2026-11-01T09:10:00", clientToken: "x" },
      { id: "t2", number: 2, order: 2, joinedAt: "2026-11-11T09:00:00", status: "cancelled", clientToken: "y" },
      { id: "t3", number: 3, order: 3, joinedAt: "2026-10-01T09:00:00", status: "waiting", clientToken: "z" },
      { id: "t4", number: 4, order: 4, joinedAt: "2026-11-11T10:00:00", status: "waiting", clientToken: "w" },
    ],
    serviceEvents: [
      { servedAt: "2026-06-01T09:00:00", durationMinutes: 5, source: "real" },
      { servedAt: "2026-11-10T09:00:00", durationMinutes: 5, source: "real" },
    ] };
  storage.setItem("clinic-state-v2", JSON.stringify(old));
  const s = createLocalStore({ storage, now: () => NOW });
  s.serveNext({ durationMinutes: 5 });
  const st = s.getState();
  assert.deepEqual(st.tickets.map((t) => t.id).sort(), ["t2", "t3", "t4"]); // t1 pruned; waiting t3 kept even if old
  assert.equal(st.serviceEvents.filter((e) => e.source === "real").length, 2); // June one pruned, new one added
});

test("reset and scenarios keep the clinic's password and sign-up link", () => {
  const storage = fakeStorage();
  storage.setItem("clinic-state-v2", JSON.stringify({ open: true, joinToken: "mylink", password: "klee", openedAt: "2026-11-11T08:00:00",
    nextNumber: 1, nextOrder: 1, tickets: [], serviceEvents: [] }));
  const s = createLocalStore({ storage, now: () => NOW });
  for (const name of ["empty", "fast5", "closed", "patient-next", "mid-cancel"]) {
    s.loadScenario(name, { clientToken: "ME" });
    assert.equal(s.checkPassword("klee"), true, name);
    assert.equal(s.checkPassword("clinic"), false, name);
    assert.equal(s.getState().joinToken, "mylink", name);
  }
  s.reset();
  assert.equal(s.checkPassword("klee"), true);
  assert.equal(s.getState().joinToken, "mylink");
  assert.equal(s.getState().tickets.length, 0); // the queue itself was cleared
});
