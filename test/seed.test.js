import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSeed, seedAverageForHour } from "../js/seed.js";

test("same output on two runs", () => {
  assert.deepEqual(generateSeed(), generateSeed());
});

test("covers about 14 days", () => {
  const days = new Set(generateSeed().map((e) => e.servedAt.slice(0, 10)));
  assert.equal(days.size, 14);
});

test("overall average is between 6 and 8 minutes", () => {
  const ev = generateSeed();
  const avg = ev.reduce((s, e) => s + e.durationMinutes, 0) / ev.length;
  assert.ok(avg >= 6 && avg <= 8, String(avg));
});

test("every event is marked seed, within clinic hours, with a valid duration", () => {
  for (const e of generateSeed()) {
    assert.equal(e.source, "seed");
    const hour = Number(e.servedAt.slice(11, 13));
    assert.ok(hour >= 8 && hour < 18, e.servedAt);
    assert.ok(Number.isFinite(e.durationMinutes) && e.durationMinutes >= 2);
  }
});

test("averages vary by hour: mid-morning slower than late afternoon", () => {
  const ev = generateSeed();
  assert.ok(seedAverageForHour(ev, 10) > seedAverageForHour(ev, 17));
});

test("seedAverageForHour returns null when nothing matches", () => {
  assert.equal(seedAverageForHour(generateSeed(), 3), null);
  assert.equal(seedAverageForHour([], 9), null);
});
