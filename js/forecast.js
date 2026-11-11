// Wait-time forecast. Pure functions: no I/O, no clock access.

const MAX_SAMPLES = 10;
const MAX_WIDTH = 15; // minutes
const SMALL_CENTRE = 10; // below this centre, round to 1 min; else to 5

const isPositive = (n) => typeof n === "number" && Number.isFinite(n) && n > 0;

/**
 * @param {object} input
 * @param {number} input.position            1 = next in line
 * @param {number[]} input.realServiceMinutes recent real service durations
 * @param {number|null} input.seedAverageMinutes average from the seed
 * @returns {{state:"next"}|{state:"range",low:number,high:number}|{state:"unavailable"}}
 */
export function estimate({ position, realServiceMinutes, seedAverageMinutes } = {}) {
  if (!Number.isInteger(position) || position < 1) return { state: "unavailable" };
  // "next" stays until staff mark the patient as being served.
  if (position === 1) return { state: "next" };

  const real = (Array.isArray(realServiceMinutes) ? realServiceMinutes : [])
    .filter(isPositive)
    .slice(-MAX_SAMPLES);
  const seed = isPositive(seedAverageMinutes) ? seedAverageMinutes : null;
  if (real.length === 0 && seed === null) return { state: "unavailable" };

  const w = Math.min(real.length, MAX_SAMPLES) / MAX_SAMPLES;
  const realAvg = real.length ? real.reduce((a, b) => a + b, 0) / real.length : null;
  let avg;
  if (realAvg === null) avg = seed;
  else if (seed === null) avg = realAvg;
  else avg = w * realAvg + (1 - w) * seed;

  const centre = position * avg;
  let halfWidth = centre * (0.15 + 0.15 * (1 - w));
  let capped = false;
  if (halfWidth * 2 > MAX_WIDTH) {
    halfWidth = MAX_WIDTH / 2;
    capped = true;
  }
  const rawLow = centre - halfWidth;
  const rawHigh = centre + halfWidth;
  const step = centre < SMALL_CENTRE ? 1 : 5;

  let low = Math.round(rawLow / step) * step;
  let high = Math.round(rawHigh / step) * step;
  // Nearest rounding can push the width past the cap: round inwards instead.
  if (capped && high - low > MAX_WIDTH) {
    low = Math.ceil(rawLow / step) * step;
    high = Math.floor(rawHigh / step) * step;
  }
  low = Math.max(1, low);
  if (high <= low) high = low + step;

  if (!Number.isFinite(low) || !Number.isFinite(high)) return { state: "unavailable" };
  return { state: "range", low, high };
}
