import { test } from "node:test";
import assert from "node:assert/strict";
import { createLocalStore } from "../js/store-local.js";
import { buildView } from "../js/queue.js";

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
// Tuesday 10:30 local time: inside clinic hours, so the seed has data for the hour.
const NOW = new Date(2026, 10, 11, 10, 30, 0);
const mk = () => createLocalStore({ storage: fakeStorage(), now: () => NOW });
const view = (store, clientToken, hasJoinToken = true) =>
  buildView({ state: store.getState(), clientToken, hasJoinToken, now: NOW });

test("test 1: browsing needs no account and gives a range no wider than 15 min", () => {
  const s = mk();
  s.addFakePatients(4);
  const v = view(s, "nobody", false);
  assert.equal(v.mode, "browse");
  const m = v.waitText.match(/^(\d+)–(\d+) min$/);
  assert.ok(m, v.waitText);
  assert.ok(Number(m[2]) - Number(m[1]) <= 15);
  assert.equal(v.canJoin, false);
});

test("test 3: valid token takes a number; wrong or missing token is refused", () => {
  const s = mk();
  const t = s.takeNumber({ joinToken: "demo", clientToken: "A" });
  assert.equal(t.number, 1);
  assert.throws(() => s.takeNumber({ joinToken: "wrong", clientToken: "B" }), /invalid-token/);
  assert.throws(() => s.takeNumber({ clientToken: "B" }), /invalid-token/);
  assert.equal(s.getState().tickets.length, 1);
  const v = view(s, "A");
  assert.equal(v.mode, "ticket");
  assert.equal(v.position, 1);
});

test("taking a number twice returns the same ticket", () => {
  const s = mk();
  const a = s.takeNumber({ joinToken: "demo", clientToken: "A" });
  const b = s.takeNumber({ joinToken: "demo", clientToken: "A" });
  assert.equal(a.id, b.id);
  assert.equal(s.getState().tickets.length, 1);
});

test("test 4: cancel removes the ticket, shortens the others, cannot be revived", () => {
  const s = mk();
  s.addFakePatients(3);
  s.takeNumber({ joinToken: "demo", clientToken: "A" }); // position 4
  s.takeNumber({ joinToken: "demo", clientToken: "B" }); // position 5
  const before = view(s, "B");
  assert.equal(before.position, 5);
  assert.equal(s.cancelTicket({ clientToken: "A" }), true);
  const after = view(s, "B");
  assert.equal(after.position, 4);
  assert.notEqual(after.waitText, before.waitText);
  const gone = view(s, "A");
  assert.equal(gone.mode, "ended");
  assert.equal(s.cancelTicket({ clientToken: "A" }), false); // nothing left to cancel
  const fresh = s.takeNumber({ joinToken: "demo", clientToken: "A" }); // new number, not the old one
  assert.ok(fresh.number > 5);
  assert.equal(s.getState().tickets.find((t) => t.number === 4).status, "cancelled");
});

test("test 5: turn-near banner at 5 min or less (6-min clinic: only once next in line)", () => {
  const s = mk();
  s.addFakePatients(8);
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  assert.equal(view(s, "A").showTurnNear, false);
  for (let i = 0; i < 7; i++) s.serveNext({ durationMinutes: 6 });
  const two = view(s, "A");
  assert.equal(two.position, 2);
  assert.equal(two.showTurnNear, false, two.waitText); // about 10-15 min
  s.serveNext({ durationMinutes: 6 });
  assert.equal(view(s, "A").showTurnNear, true);
});

test("test 5: in a fast clinic (2 min each) the banner appears at position 2", () => {
  const s = mk();
  s.addFakePatients(11);
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  for (let i = 0; i < 10; i++) s.serveNext({ durationMinutes: 2 }); // 10 real samples: seed no longer counts
  const v = view(s, "A");
  assert.equal(v.position, 2);
  assert.equal(v.showTurnNear, true, v.waitText);
});

test("test 2: faster real service shortens the displayed range", () => {
  const s = mk();
  s.addFakePatients(8);
  s.takeNumber({ joinToken: "demo", clientToken: "A" }); // position 9
  const before = view(s, "A");
  s.serveNext({ durationMinutes: 2 });
  s.serveNext({ durationMinutes: 2 });
  s.serveNext({ durationMinutes: 2 });
  const after = view(s, "A");
  assert.equal(after.position, 6);
  const hi = (v) => Number(v.waitText.match(/–(\d+)/)[1]);
  assert.ok(hi(after) < hi(before), `${before.waitText} -> ${after.waitText}`);
});

test("test 10: closed shows 'Clinic closed', refuses new tickets, keeps issued ones", () => {
  const s = mk();
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  s.setOpen(false);
  const stranger = view(s, "Z");
  assert.equal(stranger.mode, "closed");
  assert.equal(stranger.message, "Clinic closed");
  assert.equal(stranger.canJoin, false);
  assert.ok(!("waitText" in stranger));
  assert.throws(() => s.takeNumber({ joinToken: "demo", clientToken: "Z" }), /closed/);
  const holder = view(s, "A");
  assert.equal(holder.mode, "ticket");
  assert.match(holder.closedNote, /kept/);
});

test("test 11: no data at all -> position shown, 'not available yet'", () => {
  const s = mk();
  const st = s.getState();
  st.serviceEvents = [];
  const v = buildView({ state: { ...st, tickets: [
    { id: "t1", number: 1, order: 1, status: "waiting", clientToken: "x" },
    { id: "t2", number: 2, order: 2, status: "waiting", clientToken: "A" }] },
    clientToken: "A", hasJoinToken: true, now: NOW });
  assert.equal(v.mode, "ticket");
  assert.equal(v.position, 2);
  assert.equal(v.waitText, "Wait estimate not available yet");
  assert.ok(!/NaN|undefined/.test(JSON.stringify(v)));
});

test("test 12: empty queue shows 'No wait'; next in line shows \"You're next\"", () => {
  const s = mk();
  assert.equal(view(s, "Z").waitText, "No wait");
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  assert.equal(view(s, "A").waitText, "You're next");
  assert.equal(view(s, "A").showTurnNear, true);
});

test("served and removed patients see a closing message", () => {
  const s = mk();
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  s.serveNext({ durationMinutes: 6 });
  const v = view(s, "A");
  assert.equal(v.mode, "ended");
  assert.match(v.message, /served/);
  assert.equal(v.nowServing, 1);
});

test("test 6 (partly): a patient's view contains no other patient's data", () => {
  const s = mk();
  s.addFakePatients(3);
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  const json = JSON.stringify(view(s, "A"));
  assert.ok(!json.includes("fake-"), "other tokens leaked");
  assert.ok(!/joinedAt|clientToken/.test(json));
  const st = s.getState();
  for (const t of st.tickets) {
    assert.deepEqual(Object.keys(t).filter((k) => !["id", "number", "order", "joinedAt", "status", "clientToken", "servedAt"].includes(k)), []);
  }
});

test("state survives a reload of the store (same storage)", () => {
  const storage = fakeStorage();
  const a = createLocalStore({ storage, now: () => NOW });
  a.takeNumber({ joinToken: "demo", clientToken: "A" });
  const b = createLocalStore({ storage, now: () => NOW });
  assert.equal(b.getState().tickets.length, 1);
});
