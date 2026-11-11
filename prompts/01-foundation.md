You are building the foundation of a clinic wait-time app. Read these files
in the repo first and treat them as the source of truth: "Product
Requirement.md", "Technical Spec.md", "Acceptance Test.md".

CONSTRAINTS
- Zero cost, exercise project. Security is out of scope.
- No framework, no build step, no npm dependencies. Plain ES modules that
  run in the browser and in Node 20+.
- Tests use Node's built-in runner (`node --test`). No test libraries.
- Do not create HTML pages or touch Firebase in this step.

BUILD
1. js/forecast.js: pure functions, no I/O, no Date.now() inside (the
   current time is a parameter).
   estimate({ position, realServiceMinutes, seedAverageMinutes })
   - position: 1 = next in line.
   - realServiceMinutes: array of the most recent real service durations
     (minutes); use at most the last 10.
   - seedAverageMinutes: number or null (average from the seed for this
     time of day).
   Returns one of:
     { state: "next" }                              when position === 1
     { state: "range", low, high }                  otherwise
     { state: "unavailable" }                       when there is neither
                                                    real data nor a seed
   "next" is shown until staff mark the patient as being served; it does
   not turn into an estimate.
   Rules:
   - Weight w = min(realCount, 10) / 10.
     avg = w * realAverage + (1 - w) * seedAverage (use whichever exists
     if the other is missing).
   - centre = position * avg.
   - half-width = centre * (0.15 + 0.15 * (1 - w)): thin data gives a
     wider range.
   - The range is never wider than 15 minutes: if it is, shrink it
     symmetrically around the centre to 15 (before rounding).
   - Rounding step depends on the centre: if centre < 10 minutes, round
     low and high to the nearest 1 minute; otherwise to the nearest 5
     minutes.
   - low is never below 1. Zero is only ever shown through the "next"
     state (position === 1), never as a range.
   - After rounding, if high <= low, set high = low + step, so a range is
     never a single number such as "3-3".
   - Never return NaN or Infinity; invalid input returns "unavailable".
2. js/seed.js: deterministic generator of ~14 days of fake service
   events, clinic hours 08:00-18:00, using a small seeded PRNG (e.g.
   mulberry32) with a fixed seed. Average duration 6-8 minutes, varying by
   hour (slower mid-morning, faster late afternoon), with some noise. Each
   event: { servedAt (ISO string), durationMinutes, source: "seed" }.
   Also export seedAverageForHour(events, hour).
3. js/firebase-config.js: placeholder config object with clearly marked
   TODO values. Nothing else.
4. test/forecast.test.js and test/seed.test.js covering:
   - Acceptance test 2 numbers: position 5, 6-minute average -> range
     centred near 30, width <= 15.
   - Faster real service times lower the range (2-minute services after a
     6-minute seed).
   - Acceptance test 11: no real data and no seed -> "unavailable".
   - Acceptance test 12: position 1 -> "next", never "0-0".
   - Small values: position 2 with a 2-minute average gives a range like
     "3-5", never containing 0. Position 2 with a 0.5-minute average gives
     low >= 1 and high > low.
   - Step boundary: centres of 9 and 10 minutes use steps of 1 and 5
     respectively.
   - A range never includes 0 unless the state is "next".
   - Range width cap at large positions; no NaN on empty arrays, zero,
     negative or missing inputs.
   - Seed: same output on two runs, ~14 days, average between 6 and 8,
     every event has source "seed".
5. package.json with only {"type": "module"} and a "test" script.

DONE WHEN
- `npm test` passes with zero failures. Show me the output.
- List every assumption you made that the spec did not state.
- Do not add features beyond this list.
