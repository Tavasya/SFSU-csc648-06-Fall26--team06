// Tests for the student calendar helpers (lib/calendar/week.js).
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  classBlocks,
  eventBlocks,
  formatMinutes,
  layoutDay,
  mergeStudentEvents,
  toPacific,
  scrollHour,
  weekDays,
  weekLabel,
  weekStart,
} from "../lib/calendar/week.js";

// An event shaped like the joined events in GET /api/users/me/saved-events
// and GET /api/users/me/rsvps.
function event(id, start, end, extra = {}) {
  return {
    id,
    title: "Event " + id,
    start_date_time: start,
    end_date_time: end,
    status: "active",
    locations: { building_name: "Cesar Chavez Student Center" },
    ...extra,
  };
}
const careerFair = event("e1", "2026-10-29T18:00:00Z", "2026-10-29T21:00:00Z"); // Thu 11 AM – 2 PM Pacific

test("toPacific converts to campus time on both sides of the DST change", () => {
  assert.deepEqual(toPacific("2026-10-30T21:30:00Z"), { day: "2026-10-30", minutes: 14 * 60 + 30 }); // PDT, UTC-7
  assert.deepEqual(toPacific("2026-11-02T21:30:00Z"), { day: "2026-11-02", minutes: 13 * 60 + 30 }); // PST, UTC-8
  assert.deepEqual(toPacific("2026-10-30T05:00:00Z"), { day: "2026-10-29", minutes: 22 * 60 }); // still the day before
});

test("weekStart goes back to Monday, and Sunday belongs to the week before", () => {
  assert.equal(weekStart("2026-10-30"), "2026-10-26"); // Friday
  assert.equal(weekStart("2026-10-26"), "2026-10-26"); // Monday
  assert.equal(weekStart("2026-11-01"), "2026-10-26"); // Sunday
  assert.equal(weekStart("2026-11-02"), "2026-11-02");
});

test("addDays and weekDays cross months and the DST change", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-11-02", -7), "2026-10-26");
  const days = weekDays("2026-10-26");
  assert.equal(days.length, 7);
  assert.deepEqual(days[0], { key: "2026-10-26", name: "Mon", date: 26 });
  assert.deepEqual(days[6], { key: "2026-11-01", name: "Sun", date: 1 });
});

test("weekLabel shortens the range when it can", () => {
  assert.equal(weekLabel("2026-10-05"), "Oct 5 – 11, 2026");
  assert.equal(weekLabel("2026-10-26"), "Oct 26 – Nov 1, 2026");
  assert.equal(weekLabel("2026-12-28"), "Dec 28, 2026 – Jan 3, 2027");
});

test("formatMinutes writes 12-hour times", () => {
  assert.equal(formatMinutes(0), "12 AM");
  assert.equal(formatMinutes(9 * 60), "9 AM");
  assert.equal(formatMinutes(12 * 60 + 30), "12:30 PM");
  assert.equal(formatMinutes(18 * 60 + 5), "6:05 PM");
});

test("mergeStudentEvents shows a saved and RSVP'd event once, as RSVP'd", () => {
  const merged = mergeStudentEvents([careerFair], [{ status: "attending", events: careerFair }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].kind, "rsvp");
  assert.equal(merged[0].rsvpStatus, "attending");
});

test("mergeStudentEvents hides Not Attending RSVPs unless the event is saved", () => {
  const other = event("e2", "2026-10-30T18:00:00Z", "2026-10-30T19:00:00Z");
  const merged = mergeStudentEvents(
    [careerFair],
    [
      { status: "not_attending", events: careerFair },
      { status: "not_attending", events: other },
      { status: "interested", events: null }, // event no longer visible
    ],
  );
  assert.deepEqual(merged.map((m) => [m.event.id, m.kind]), [["e1", "saved"]]);
});

test("eventBlocks places events in Pacific time", () => {
  const [block] = eventBlocks(mergeStudentEvents([careerFair], []));
  assert.equal(block.day, "2026-10-29");
  assert.equal(block.start, 11 * 60);
  assert.equal(block.end, 14 * 60);
  assert.equal(block.kind, "saved");
  assert.equal(block.place, "Cesar Chavez Student Center");
  assert.equal(block.timeLabel, "11 AM – 2 PM");
  assert.equal(block.cancelled, false);
});

test("eventBlocks splits an event that runs past midnight", () => {
  const lateNight = event("e3", "2026-10-31T06:00:00Z", "2026-10-31T09:00:00Z"); // Fri 11 PM – Sat 2 AM
  const blocks = eventBlocks(mergeStudentEvents([lateNight], []));
  assert.deepEqual(
    blocks.map((b) => [b.day, b.start, b.end]),
    [
      ["2026-10-30", 23 * 60, 24 * 60],
      ["2026-10-31", 0, 2 * 60],
    ],
  );
  assert.equal(blocks[0].eventId, "e3");
  assert.notEqual(blocks[0].id, blocks[1].id); // unique React keys
});

test("eventBlocks marks cancelled events", () => {
  const cancelled = event("e4", "2026-10-29T18:00:00Z", "2026-10-29T19:00:00Z", { status: "cancelled" });
  assert.equal(eventBlocks(mergeStudentEvents([cancelled], []))[0].cancelled, true);
});

test("classBlocks repeats a class on each of its meeting days", () => {
  const days = weekDays("2026-10-26");
  const blocks = classBlocks(
    [{ name: "CSC 648", days: "Mon, Wed", startTime: "14:00", endTime: "15:15" }],
    days,
  );
  assert.deepEqual(
    blocks.map((b) => [b.day, b.start, b.end, b.kind, b.title]),
    [
      ["2026-10-26", 14 * 60, 15 * 60 + 15, "class", "CSC 648"],
      ["2026-10-28", 14 * 60, 15 * 60 + 15, "class", "CSC 648"],
    ],
  );
});

test("classBlocks skips entries the scanner could not read", () => {
  const days = weekDays("2026-10-26");
  const blocks = classBlocks(
    [
      { name: "No times", days: "Tue", startTime: "", endTime: "" },
      { name: "Backwards", days: "Tue", startTime: "15:00", endTime: "14:00" },
      { name: "Bad hour", days: "Tue", startTime: "25:00", endTime: "26:00" },
      { name: "No days", days: "", startTime: "10:00", endTime: "11:00" },
    ],
    days,
  );
  assert.deepEqual(blocks, []);
});

test("layoutDay puts overlapping blocks side by side", () => {
  const placed = layoutDay([
    { id: "a", start: 600, end: 720 }, // 10 – 12
    { id: "b", start: 660, end: 780 }, // 11 – 1, overlaps a
    { id: "c", start: 730, end: 800 }, // reuses a's lane after it ends
    { id: "d", start: 900, end: 960 }, // on its own
  ]);
  const byId = Object.fromEntries(placed.map((b) => [b.id, [b.lane, b.lanes]]));
  assert.deepEqual(byId, { a: [0, 2], b: [1, 2], c: [0, 2], d: [0, 1] });
});

test("scrollHour opens an hour before now, else at 9 AM or the earliest block", () => {
  assert.equal(scrollHour([], 8 * 60 + 15), 7);
  assert.equal(scrollHour([], 20), 0);
  assert.equal(scrollHour([]), 9);
  assert.equal(scrollHour([{ start: 7 * 60 + 30, end: 8 * 60 }]), 7);
  assert.equal(scrollHour([{ start: 21 * 60, end: 22 * 60 + 30 }]), 9);
});
