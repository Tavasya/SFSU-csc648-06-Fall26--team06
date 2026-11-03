import { test } from "node:test";
import assert from "node:assert/strict";
import { eventConflictsWithSchedule, normalizeSchedule } from "../lib/student/schedule.js";

test("schedule entries normalize day names and reject incomplete or invalid meetings", () => {
  assert.deepEqual(normalizeSchedule([{
    name: "CSC 648",
    days: "Thursday, Mon",
    startTime: "14:00",
    endTime: "15:15",
  }]), [{
    name: "CSC 648",
    days: "Mon, Thu",
    startTime: "14:00",
    endTime: "15:15",
  }]);
  assert.deepEqual(normalizeSchedule([]), []);
  for (const invalid of [
    [{ name: "", days: "Mon", startTime: "09:00", endTime: "10:00" }],
    [{ name: "CSC 648", days: "Funday", startTime: "09:00", endTime: "10:00" }],
    [{ name: "CSC 648", days: "Mon", startTime: "09:00", endTime: "09:00" }],
    Array(101).fill({ name: "CSC 648", days: "Mon", startTime: "09:00", endTime: "10:00" }),
  ]) assert.throws(() => normalizeSchedule(invalid));
});

test("event conflicts use Pacific local date/time and include partial overlaps", () => {
  const classes = [{
    name: "CSC 648",
    days: "Tue, Thu",
    startTime: "10:00",
    endTime: "11:15",
  }];
  assert.equal(eventConflictsWithSchedule({
    start_date_time: "2026-11-03T18:45:00Z",
    end_date_time: "2026-11-03T19:30:00Z",
  }, classes), true);
  assert.equal(eventConflictsWithSchedule({
    start_date_time: "2026-11-03T19:15:00Z",
    end_date_time: "2026-11-03T20:00:00Z",
  }, classes), false);
  assert.equal(eventConflictsWithSchedule({
    start_date_time: "2026-11-04T18:45:00Z",
    end_date_time: "2026-11-04T19:30:00Z",
  }, classes), false);
});
