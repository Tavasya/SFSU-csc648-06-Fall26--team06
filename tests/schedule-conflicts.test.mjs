// Tests for schedule-aware event discovery (R9.4): comparing a student's
// confirmed classes with an event's time (lib/schedule/conflicts.js).
// Nov 4, 2026 is a Wednesday; campus time is PST (UTC-8) that week.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { getScheduleAvailability } from "../lib/schedule/conflicts.js";

// Wednesday 10:00-11:00 AM campus time.
const EVENT = {
  start_date_time: "2026-11-04T18:00:00Z",
  end_date_time: "2026-11-04T19:00:00Z",
};
const CSC648 = { class_name: "CSC 648", meeting_days: ["Mon", "Wed"], start_time: "09:30:00", end_time: "10:45:00" };
const MATH = { class_name: "MATH 324", meeting_days: ["Tue", "Thu"], start_time: "10:00", end_time: "11:15" };

test("no saved schedule means availability is unknown", () => {
  for (const classes of [[], null, undefined, "not a list"]) {
    assert.deepEqual(getScheduleAvailability(EVENT, classes), { status: "unknown", conflicts: [] });
  }
});

test("events with missing, invalid or reversed times are unknown", () => {
  const unknown = { status: "unknown", conflicts: [] };
  assert.deepEqual(getScheduleAvailability(null, [CSC648]), unknown);
  assert.deepEqual(getScheduleAvailability({ start_date_time: EVENT.start_date_time }, [CSC648]), unknown);
  assert.deepEqual(getScheduleAvailability({ start_date_time: "soon", end_date_time: "later" }, [CSC648]), unknown);
  assert.deepEqual(
    getScheduleAvailability({ start_date_time: EVENT.end_date_time, end_date_time: EVENT.start_date_time }, [CSC648]),
    unknown,
  );
});

test("an event that runs past midnight campus time is unknown", () => {
  const overnight = { start_date_time: "2026-11-05T07:00:00Z", end_date_time: "2026-11-05T09:00:00Z" };
  assert.equal(getScheduleAvailability(overnight, [CSC648]).status, "unknown");
});

test("an event overlapping a class on the same weekday is a conflict", () => {
  const result = getScheduleAvailability(EVENT, [CSC648, MATH]);
  assert.equal(result.status, "conflict");
  assert.deepEqual(result.conflicts, [CSC648]);
});

test("classes on other days, or that end or start exactly at the event edges, are available", () => {
  assert.equal(getScheduleAvailability(EVENT, [MATH]).status, "available");
  const endsAtStart = { ...CSC648, start_time: "09:00", end_time: "10:00" };
  const startsAtEnd = { ...CSC648, start_time: "11:00", end_time: "12:15" };
  assert.deepEqual(getScheduleAvailability(EVENT, [endsAtStart, startsAtEnd]), { status: "available", conflicts: [] });
});

test("accepts scanner-style entries with a days string and camelCase times", () => {
  const scanned = { name: "BIO 100", days: "Mon, Wed, Fri", startTime: "10:30", endTime: "11:20" };
  assert.deepEqual(getScheduleAvailability(EVENT, [scanned]).conflicts, [scanned]);
});

test("entries with unreadable days or times are skipped instead of reported as conflicts", () => {
  const entries = [
    { class_name: "No days", start_time: "10:00", end_time: "11:00" },
    { class_name: "Bad time", meeting_days: ["Wed"], start_time: "10am", end_time: "11:00" },
    { class_name: "Out of range", meeting_days: ["Wed"], start_time: "25:00", end_time: "26:00" },
    { class_name: "Not text", meeting_days: ["Wed"], start_time: 1000, end_time: 1100 },
  ];
  assert.deepEqual(getScheduleAvailability(EVENT, entries), { status: "available", conflicts: [] });
});

test("daylight saving is respected: the same class conflicts in October (PDT)", () => {
  // Wednesday Oct 28, 2026, 10:00-11:00 AM PDT (UTC-7).
  const october = { start_date_time: "2026-10-28T17:00:00Z", end_date_time: "2026-10-28T18:00:00Z" };
  assert.equal(getScheduleAvailability(october, [CSC648]).status, "conflict");
});
