// Tests for the Map's event helpers (lib/map/events.js).
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLocationLookup,
  buildScanIndex,
  formatLongDate,
  formatWhen,
  groupEventsByVenue,
  inRange,
  toMapEvent,
} from "../lib/map/events.js";

const lookup = buildLocationLookup();
const categoryNames = new Map([
  ["cat-career", "Career"],
  ["cat-social", "Social"],
]);

// A row shaped like the Supabase "events" query in lib/map/page-data.js
const row = {
  id: "event-1",
  title: "Career Fair",
  start_date_time: "2026-10-22T18:30:00Z", // 11:30 AM Pacific
  end_date_time: "2026-10-22T22:30:00Z", // 3:30 PM Pacific
  room_number: "",
  category_ids: ["cat-career", "cat-deleted"],
  description: "Meet employers.",
  audience: "Undergraduate",
  admission_type: "free",
  capacity: 300,
  rsvp_required: true,
  wheelchair_accessible: true,
  asl_available: false,
  contact_email: "careers@example.edu",
  cover_path: null,
  location: { building_name: "Jack Adams Hall", description: "Second floor of the Student Center" },
};

test("lookup sends buildings to their own shape and rooms to their parent building", () => {
  assert.deepEqual(lookup.get("Cesar Chavez Student Center"), { mapId: "ccsc", venueId: null });
  assert.deepEqual(lookup.get("Quad"), { mapId: "quad", venueId: null });
  assert.deepEqual(lookup.get("Jack Adams Hall"), { mapId: "ccsc", venueId: "jack-adams" });
  assert.equal(lookup.get("Not a real building"), undefined);
});

test("toMapEvent formats times in Pacific time and turns category ids into names", () => {
  const { event, matched } = toMapEvent(row, { categoryNames, lookup });
  assert.equal(matched, true);
  assert.equal(event.date, "2026-10-22");
  assert.equal(event.endDate, "2026-10-22");
  assert.equal(event.startTime, "11:30 AM");
  assert.equal(event.endTime, "3:30 PM");
  assert.deepEqual(event.tags, ["Career"]); // unknown category ids are dropped
  assert.equal(event.mapId, "ccsc");
  assert.equal(event.venueId, "jack-adams");
  assert.equal(event.rsvpCount, null); // no RSVP table yet
});

test("toMapEvent keeps the detail fields for the side panel", () => {
  const { event } = toMapEvent(row, { categoryNames, lookup });
  assert.equal(event.description, "Meet employers.");
  assert.equal(event.locationDescription, "Second floor of the Student Center");
  assert.equal(event.audience, "Undergraduate");
  assert.equal(event.admissionType, "free");
  assert.equal(event.capacity, 300);
  assert.equal(event.rsvpRequired, true);
  assert.equal(event.wheelchairAccessible, true);
  assert.equal(event.contactEmail, "careers@example.edu");
  assert.equal(event.coverUrl, null);
});

test("toMapEvent uses a signed cover URL when the event has a cover", () => {
  const coverUrls = new Map([["host-1/cover.png", "https://example.supabase.co/signed/cover.png"]]);
  const { event } = toMapEvent({ ...row, cover_path: "host-1/cover.png" }, { categoryNames, lookup, coverUrls });
  assert.equal(event.coverUrl, "https://example.supabase.co/signed/cover.png");
});

test("toMapEvent marks events at unknown locations as unmatched", () => {
  const { event, matched } = toMapEvent(
    { ...row, location: { building_name: "Downtown Campus" } },
    { categoryNames, lookup },
  );
  assert.equal(matched, false);
  assert.equal(event.mapId, null);
  assert.equal(event.locationName, "Downtown Campus");
});

test("toMapEvent fills safe defaults for missing optional fields", () => {
  const { event } = toMapEvent(
    { ...row, audience: "", admission_type: null, category_ids: null, location: null },
    { categoryNames, lookup },
  );
  assert.equal(event.audience, "All students");
  assert.equal(event.admissionType, "free");
  assert.deepEqual(event.tags, []);
  assert.equal(event.locationName, null);
});

test("an event that crosses midnight Pacific gets the next day as its end date", () => {
  const { event } = toMapEvent(
    { ...row, start_date_time: "2026-10-23T05:00:00Z", end_date_time: "2026-10-23T08:00:00Z" },
    { categoryNames, lookup },
  );
  assert.equal(event.date, "2026-10-22"); // 10 PM Pacific
  assert.equal(event.endDate, "2026-10-23"); // 1 AM Pacific
});

test("buildScanIndex lists scanned rooms under their building", () => {
  const scans = buildScanIndex(
    [{ building_name: "Jack Adams Hall" }, { building_name: "Quad" }, { building_name: "Unknown" }],
    lookup,
  );
  assert.deepEqual(scans, { ccsc: ["Jack Adams Hall"], quad: ["Quad"] });
  assert.deepEqual(buildScanIndex([], lookup), {});
  assert.deepEqual(buildScanIndex(null, lookup), {});
});

// Thursday, October 15, 2026 (local time); that week's Sunday is October 18.
const today = new Date(2026, 9, 15, 9, 0);
const on = (date, endDate = date) => ({ date, endDate });

test("inRange hides events that have already ended", () => {
  assert.equal(inRange(on("2026-10-14"), "all", today), false);
  assert.equal(inRange(on("2026-10-15"), "all", today), true);
});

test("inRange 'today' includes multi-day events that started earlier", () => {
  assert.equal(inRange(on("2026-10-15"), "today", today), true);
  assert.equal(inRange(on("2026-10-10", "2026-10-20"), "today", today), true);
  assert.equal(inRange(on("2026-10-16"), "today", today), false);
});

test("inRange 'week' runs through Sunday", () => {
  assert.equal(inRange(on("2026-10-18"), "week", today), true);
  assert.equal(inRange(on("2026-10-19"), "week", today), false);
  // On a Sunday, "this week" is just that day.
  const sunday = new Date(2026, 9, 18, 9, 0);
  assert.equal(inRange(on("2026-10-18"), "week", sunday), true);
  assert.equal(inRange(on("2026-10-19"), "week", sunday), false);
});

test("groupEventsByVenue puts named rooms first (A-Z) and the rest last", () => {
  const groups = groupEventsByVenue([
    { id: "a", venueId: null },
    { id: "b", venueId: "jack-adams" },
    { id: "c", venueId: "bookstore" },
    { id: "d", venueId: "bookstore" },
  ]);
  assert.deepEqual(
    groups.map((g) => [g.label, g.events.map((e) => e.id)]),
    [
      ["Bookstore", ["c", "d"]],
      ["Jack Adams Hall", ["b"]],
      ["Elsewhere in this building", ["a"]],
    ],
  );
});

test("formatWhen shows one day, or both days for multi-day events", () => {
  const oneDay = { date: "2026-10-22", endDate: "2026-10-22", startTime: "4:00 PM", endTime: "6:00 PM" };
  assert.equal(formatWhen(oneDay), "Thu, Oct 22 · 4:00 PM – 6:00 PM");
  assert.equal(
    formatWhen({ ...oneDay, endDate: "2026-10-28" }),
    "Thu, Oct 22, 4:00 PM – Wed, Oct 28, 6:00 PM",
  );
});

test("formatLongDate matches the full event page wording", () => {
  assert.equal(formatLongDate({ date: "2026-10-22", endDate: "2026-10-22" }), "Thursday, October 22, 2026");
  assert.equal(
    formatLongDate({ date: "2026-10-22", endDate: "2026-10-28" }),
    "Thursday, October 22 – Wednesday, October 28, 2026",
  );
});
