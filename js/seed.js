// Deterministic fake service history (the app's initial "seed").
// Times are clinic-local clock time written without a zone, e.g.
// "2026-11-03T09:15:00", so the hour is never shifted by time zones.

const SEED = 20260101;
const DAYS = 14;
const OPEN_HOUR = 8;
const CLOSE_HOUR = 18;
const PATIENTS_PER_HOUR = 5;
// Average service minutes by hour: slower mid-morning, faster late afternoon.
const HOUR_MEAN = { 8: 6.5, 9: 7.5, 10: 8, 11: 7.5, 12: 7, 13: 7, 14: 6.5, 15: 6.5, 16: 6, 17: 6 };

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n) => String(n).padStart(2, "0");

/** @param {string} endDate last day of the history, "YYYY-MM-DD" */
export function generateSeed(endDate = "2026-11-10") {
  const rand = mulberry32(SEED);
  const [y, m, d] = endDate.split("-").map(Number);
  const events = [];
  for (let back = DAYS - 1; back >= 0; back--) {
    const day = new Date(Date.UTC(y, m - 1, d - back));
    const date = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
    for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
      for (let i = 0; i < PATIENTS_PER_HOUR; i++) {
        const minute = Math.min(59, i * 12 + Math.floor(rand() * 10));
        const noise = (rand() - 0.5) * 3; // +/- 1.5 minutes
        const durationMinutes = Math.max(2, Math.round((HOUR_MEAN[hour] + noise) * 10) / 10);
        events.push({
          servedAt: `${date}T${pad(hour)}:${pad(minute)}:00`,
          durationMinutes,
          source: "seed",
        });
      }
    }
  }
  return events;
}

/** Average duration of events served in the given clock hour, or null. */
export function seedAverageForHour(events, hour) {
  const mine = (events || []).filter((e) => Number(e.servedAt.slice(11, 13)) === hour);
  if (mine.length === 0) return null;
  return mine.reduce((sum, e) => sum + e.durationMinutes, 0) / mine.length;
}
