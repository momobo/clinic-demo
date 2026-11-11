import { test } from "node:test";
import assert from "node:assert/strict";
import { estimate } from "../js/forecast.js";

const sixes = Array(10).fill(6);

test("test 2: position 5 at 6 min average is centred near 30, width <= 15", () => {
  for (const input of [
    { position: 5, realServiceMinutes: sixes, seedAverageMinutes: 6 },
    { position: 5, realServiceMinutes: [], seedAverageMinutes: 6 },
  ]) {
    const r = estimate(input);
    assert.equal(r.state, "range");
    assert.ok(Math.abs((r.low + r.high) / 2 - 30) <= 5, JSON.stringify(r));
    assert.ok(r.high - r.low <= 15);
  }
});

test("test 2: faster real service lowers the range", () => {
  const before = estimate({ position: 5, realServiceMinutes: [], seedAverageMinutes: 6 });
  const after = estimate({ position: 5, realServiceMinutes: [2, 2, 2], seedAverageMinutes: 6 });
  assert.ok(after.low < before.low && after.high < before.high, JSON.stringify({ before, after }));
});

test("test 11: no real data and no seed -> unavailable", () => {
  assert.deepEqual(estimate({ position: 4, realServiceMinutes: [], seedAverageMinutes: null }), { state: "unavailable" });
  assert.deepEqual(estimate({ position: 4 }), { state: "unavailable" });
});

test("test 12: position 1 -> next, never a range", () => {
  assert.deepEqual(estimate({ position: 1, realServiceMinutes: sixes, seedAverageMinutes: 6 }), { state: "next" });
  assert.deepEqual(estimate({ position: 1 }), { state: "next" });
});

test("small values: position 2 at 2 min gives about 3-5, never 0", () => {
  const r = estimate({ position: 2, realServiceMinutes: Array(10).fill(2), seedAverageMinutes: null });
  assert.deepEqual(r, { state: "range", low: 3, high: 5 });
});

test("tiny values: low >= 1 and high > low", () => {
  const r = estimate({ position: 2, realServiceMinutes: Array(10).fill(0.5), seedAverageMinutes: null });
  assert.equal(r.state, "range");
  assert.ok(r.low >= 1 && r.high > r.low, JSON.stringify(r));
});

test("step boundary: centre 9 rounds to 1 min, centre 10 to 5 min", () => {
  const nine = estimate({ position: 3, realServiceMinutes: Array(10).fill(3), seedAverageMinutes: null });
  assert.deepEqual(nine, { state: "range", low: 8, high: 10 });
  const ten = estimate({ position: 2, realServiceMinutes: Array(10).fill(5), seedAverageMinutes: null });
  assert.equal(ten.low % 5, 0);
  assert.equal(ten.high % 5, 0);
  assert.ok(ten.high > ten.low);
});

test("a range never includes 0 and is never a single number", () => {
  for (let position = 2; position <= 40; position++) {
    for (const avg of [0.3, 1, 2, 5, 6, 8, 12]) {
      for (const real of [[], [avg], Array(10).fill(avg)]) {
        const r = estimate({ position, realServiceMinutes: real, seedAverageMinutes: avg });
        assert.equal(r.state, "range");
        assert.ok(r.low >= 1, JSON.stringify({ position, avg, r }));
        assert.ok(r.high > r.low, JSON.stringify({ position, avg, r }));
      }
    }
  }
});

test("width never exceeds 15 minutes at large positions", () => {
  for (let position = 2; position <= 60; position++) {
    for (const real of [[], [7], Array(10).fill(7)]) {
      const r = estimate({ position, realServiceMinutes: real, seedAverageMinutes: 7 });
      assert.ok(r.high - r.low <= 15, JSON.stringify({ position, r }));
    }
  }
});

test("thin data gives a wider range than full data (small queue)", () => {
  const thin = estimate({ position: 3, realServiceMinutes: [], seedAverageMinutes: 6 });
  const full = estimate({ position: 3, realServiceMinutes: Array(10).fill(6), seedAverageMinutes: 6 });
  assert.ok(thin.high - thin.low >= full.high - full.low);
});

test("only the last 10 real durations count", () => {
  const old = Array(20).fill(20).concat(Array(10).fill(2));
  const r = estimate({ position: 2, realServiceMinutes: old, seedAverageMinutes: null });
  assert.deepEqual(r, { state: "range", low: 3, high: 5 });
});

test("invalid input never produces NaN or Infinity", () => {
  const bad = [
    { position: 0 }, { position: -3 }, { position: 2.5 }, { position: NaN },
    { position: "3", realServiceMinutes: [5] },
    { position: 3, realServiceMinutes: [NaN, -1, 0, Infinity, "x"], seedAverageMinutes: NaN },
    { position: 3, realServiceMinutes: null, seedAverageMinutes: -2 },
    { position: Infinity, seedAverageMinutes: 6 },
  ];
  for (const b of bad) {
    const r = estimate(b);
    assert.deepEqual(r, { state: "unavailable" }, JSON.stringify(b));
  }
  assert.doesNotThrow(() => estimate());
});

test("junk entries in real data are ignored, valid ones still used", () => {
  const r = estimate({ position: 2, realServiceMinutes: [NaN, 4, -1, 4], seedAverageMinutes: null });
  assert.equal(r.state, "range");
  assert.ok(Number.isFinite(r.low) && Number.isFinite(r.high));
});
