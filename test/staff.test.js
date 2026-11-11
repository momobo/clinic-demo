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
  storage.setItem("clinic-state-v1", JSON.stringify({ open: true, joinToken: "demo", openedAt: "2026-11-11T08:00:00",
    nextNumber: 1, nextOrder: 1, tickets: [], serviceEvents: [] }));
  const s = createLocalStore({ storage, now: () => NOW });
  assert.equal(s.checkPassword("clinic"), true);
});
