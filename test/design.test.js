// Tests for the Part 3 design spec: wording, hierarchy fields, no-show.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createLocalStore } from "../js/store-local.js";
import { buildView, ordinal, positionText, lastCalledText, waitingText, KEEP_OPEN_NOTE } from "../js/queue.js";

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
const NOW = new Date(2026, 10, 11, 10, 30, 0);
const mk = () => createLocalStore({ storage: fakeStorage(), now: () => NOW });
const pv = (s, token, hasJoinToken = true) => buildView({ state: s.getState(), clientToken: token, hasJoinToken, now: NOW });
// Only texts a patient can read (the internal "mode" field is not shown).
const strings = (o) => Object.entries(o).filter(([k]) => k !== "mode").flatMap(([, v]) => (typeof v === "string" ? [v] : []));

test("ordinals read naturally", () => {
  const got = [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal);
  assert.deepEqual(got, ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"]);
  assert.equal(positionText(1), "First in line");
  assert.equal(positionText(6), "6th in line");
});

test("short texts: last called, people waiting", () => {
  assert.equal(lastCalledText(null), "Nobody called yet");
  assert.equal(lastCalledText(10), "Last called: #10");
  assert.equal(waitingText(0), "Nobody is waiting");
  assert.equal(waitingText(1), "1 person is waiting");
  assert.equal(waitingText(5), "5 people are waiting");
});

test("ticket view: wait, position, number, last called, keep-open note", () => {
  const s = mk();
  s.addFakePatients(5);
  s.takeNumber({ joinToken: "demo", clientToken: "A" });
  const v = pv(s, "A");
  assert.equal(v.mode, "ticket");
  assert.equal(v.positionText, "6th in line");
  assert.equal(v.numberText, "Your number: #6");
  assert.equal(v.lastCalledText, "Nobody called yet");
  assert.equal(v.keepOpenNote, KEEP_OPEN_NOTE);
  assert.match(v.keepOpenNote, /Keep this page open/);
});

test("patients never see the word 'ticket' or developer words", () => {
  const s = mk();
  s.addFakePatients(2);
  const t = s.takeNumber({ joinToken: "demo", clientToken: "A" });
  const views = [pv(s, "A"), pv(s, "Z"), pv(s, "Z", false)];
  s.cancelTicket({ clientToken: "A" }); views.push(pv(s, "A"));
  s.takeNumber({ joinToken: "demo", clientToken: "A" }); s.removeTicket("t4"); views.push(pv(s, "A"));
  s.setOpen(false); views.push(pv(s, "Z"));
  const all = views.flatMap(strings).join(" | ");
  assert.ok(t.number > 0);
  assert.doesNotMatch(all, /ticket|token|demo mode|now serving/i);
});

test("no-show: entry ends, others move up, history untouched, patient told what to do", () => {
  const s = mk();
  s.addFakePatients(2);
  s.takeNumber({ joinToken: "demo", clientToken: "A" }); // #3
  const events = s.getState().serviceEvents.length;
  assert.equal(s.markNoShow("t1"), true);
  assert.equal(s.markNoShow("t1"), false); // already ended
  assert.equal(s.markNoShow("t999"), false);
  assert.equal(pv(s, "A").positionText, "2nd in line");
  assert.equal(s.getState().serviceEvents.length, events); // service times unchanged
  s.markNoShow("t3");
  const v = pv(s, "A");
  assert.equal(v.mode, "ended");
  assert.match(v.message, /front desk/);
  assert.match(v.message, /take a new number/);
  assert.equal(v.nowServing, null); // a no-show is not "called and served"
  const fresh = s.takeNumber({ joinToken: "demo", clientToken: "A" });
  assert.ok(fresh.number > 3);
});

test("ended messages: called, left, no-show, removed are all different and clear", () => {
  const s = mk();
  const msg = (token) => pv(s, token).message;
  s.takeNumber({ joinToken: "demo", clientToken: "A" }); s.serveNext({ durationMinutes: 5 });
  s.takeNumber({ joinToken: "demo", clientToken: "B" }); s.cancelTicket({ clientToken: "B" });
  s.takeNumber({ joinToken: "demo", clientToken: "C" }); s.markNoShow("t3");
  s.takeNumber({ joinToken: "demo", clientToken: "D" }); s.removeTicket("t4");
  const four = [msg("A"), msg("B"), msg("C"), msg("D")];
  assert.equal(new Set(four).size, 4);
  assert.match(four[0], /called/); assert.match(four[1], /left the queue/);
  assert.match(four[2], /not here/); assert.match(four[3], /removed/);
});

test("closed view explains what to do; browse without token explains how to join", () => {
  const s = mk();
  const stranger = pv(s, "Z", false);
  assert.equal(stranger.mode, "browse");
  assert.match(stranger.joinHelp, /QR code|front desk/);
  assert.equal(pv(s, "Z", true).joinHelp, null);
  s.setOpen(false);
  const closed = pv(s, "Z");
  assert.equal(closed.message, "Clinic closed");
  assert.match(closed.detail, /try again later/);
});

test("last called shows the most recently called number", () => {
  const s = mk();
  s.addFakePatients(2);
  s.serveNext({ durationMinutes: 5 });
  assert.equal(pv(s, "Z").lastCalledText, "Last called: #1");
});
