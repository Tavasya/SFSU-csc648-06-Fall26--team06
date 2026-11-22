// Tests for Explore All Events search and filters (R2.1, R2.2, R2.6)
// in lib/events/search.js, used by components/gatoraid/EventSearch.js.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_FILTERS,
  availabilityFor,
  dateInPacificTime,
  eventLocations,
  filterEvents,
  hasActiveFilters,
} from "../lib/events/search.js";

const CATEGORIES = [
  { id: "cat-tech", name: "Technology" },
  { id: "cat-career", name: "Career" },
  { id: "cat-arts", name: "Arts" },
];
const EVENTS = [
  {
    id: "hack",
    title: "AI Hack Night",
    description: "Build a chatbot with classmates.",
    category_ids: ["cat-tech"],
    locations: { building_name: "Thornton Hall" },
    // Wed Nov 4, 2026, 6-9 PM campus time
    start_date_time: "2026-11-05T02:00:00Z",
    end_date_time: "2026-11-05T05:00:00Z",
  },
  {
    id: "fair",
    title: "Fall Career Fair",
    description: "Meet employers hiring interns.",
    category_ids: ["cat-career", "cat-tech"],
    locations: { building_name: "Cesar Chavez Student Center" },
    // Wed Nov 4, 2026, 10-11 AM campus time
    start_date_time: "2026-11-04T18:00:00Z",
    end_date_time: "2026-11-04T19:00:00Z",
  },
  {
    id: "gallery",
    title: "Student Art Show",
    description: "Paintings and sculpture.",
    category_ids: ["cat-arts"],
    locations: { building_name: "Fine Arts Building" },
    // Fri Nov 6, 2026, noon-2 PM campus time
    start_date_time: "2026-11-06T20:00:00Z",
    end_date_time: "2026-11-06T22:00:00Z",
  },
  { id: "tba", title: "Location TBA meetup", category_ids: [], start_date_time: "2026-11-07T20:00:00Z", end_date_time: "2026-11-07T21:00:00Z" },
];
const ids = (events) => events.map((event) => event.id);
const CLASS = { class_name: "CSC 648", meeting_days: ["Wed"], start_time: "09:30", end_time: "10:45" };

test("with no filters, every event is listed (browse without preferences)", () => {
  assert.deepEqual(ids(filterEvents(EVENTS, CATEGORIES)), ["hack", "fair", "gallery", "tba"]);
  assert.deepEqual(ids(filterEvents(EVENTS, CATEGORIES, EMPTY_FILTERS)), ["hack", "fair", "gallery", "tba"]);
});

test("keyword search matches title, description, building and category, ignoring case and spaces", () => {
  const search = (query) => ids(filterEvents(EVENTS, CATEGORIES, { ...EMPTY_FILTERS, query }));
  assert.deepEqual(search("  hack "), ["hack"]);
  assert.deepEqual(search("INTERNS"), ["fair"]);
  assert.deepEqual(search("fine arts"), ["gallery"]);
  assert.deepEqual(search("technology"), ["hack", "fair"]);
  assert.deepEqual(search("quantum"), []);
});

test("category, date and location filters", () => {
  const only = (filters) => ids(filterEvents(EVENTS, CATEGORIES, { ...EMPTY_FILTERS, ...filters }));
  assert.deepEqual(only({ category: "Career" }), ["fair"]);
  assert.deepEqual(only({ category: "Technology" }), ["hack", "fair"]);
  // The 6 PM Hack Night is Nov 5 in UTC but Nov 4 on campus.
  assert.deepEqual(only({ date: "2026-11-04" }), ["hack", "fair"]);
  assert.deepEqual(only({ date: "2026-11-05" }), []);
  assert.deepEqual(only({ location: "Thornton Hall" }), ["hack"]);
});

test("filters combine, and no match returns an empty list for the empty state", () => {
  const filters = { ...EMPTY_FILTERS, query: "night", category: "Technology", date: "2026-11-04", location: "Thornton Hall" };
  assert.deepEqual(ids(filterEvents(EVENTS, CATEGORIES, filters)), ["hack"]);
  assert.deepEqual(ids(filterEvents(EVENTS, CATEGORIES, { ...filters, location: "Fine Arts Building" })), []);
  assert.deepEqual(filterEvents([], CATEGORIES, filters), []);
});

test("accessibility filter: wheelchair, ASL, or both", () => {
  const events = [
    { id: "ramp", wheelchair_accessible: true, asl_available: false },
    { id: "asl", wheelchair_accessible: false, asl_available: true },
    { id: "both", wheelchair_accessible: true, asl_available: true },
    { id: "none" },
  ];
  const only = (access) => ids(filterEvents(events, CATEGORIES, { ...EMPTY_FILTERS, access }));
  assert.deepEqual(only(""), ["ramp", "asl", "both", "none"]);
  assert.deepEqual(only("wheelchair"), ["ramp", "both"]);
  assert.deepEqual(only("asl"), ["asl", "both"]);
  assert.deepEqual(only("both"), ["both"]);
});

test("events the user hosts are hidden unless 'Show my events' is on", () => {
  const events = [{ id: "theirs" }, { id: "mine", hosted_by_you: true }];
  assert.deepEqual(ids(filterEvents(events, CATEGORIES)), ["theirs"]);
  assert.deepEqual(ids(filterEvents(events, CATEGORIES, { ...EMPTY_FILTERS, showMine: true })), ["theirs", "mine"]);
});

test("'Fits my schedule' keeps only events without a class conflict once the schedule is ready", () => {
  const fits = { ...EMPTY_FILTERS, scheduleFilter: "available" };
  assert.deepEqual(ids(filterEvents(EVENTS, CATEGORIES, fits, { schedule: [CLASS], scheduleStatus: "ready" })), ["hack", "gallery", "tba"]);
  // Until the schedule has loaded, availability is unknown, so nothing "fits".
  assert.deepEqual(filterEvents(EVENTS, CATEGORIES, fits, { schedule: [CLASS], scheduleStatus: "loading" }), []);
});

test("availabilityFor reports conflicts only when the schedule is ready", () => {
  assert.equal(availabilityFor(EVENTS[1], [CLASS], "ready").status, "conflict");
  assert.equal(availabilityFor(EVENTS[0], [CLASS], "ready").status, "available");
  assert.deepEqual(availabilityFor(EVENTS[1], [CLASS], "unused"), { status: "unknown", conflicts: [] });
});

test("eventLocations lists each building once, A-Z, skipping events without one", () => {
  assert.deepEqual(eventLocations([...EVENTS, EVENTS[0]]), [
    "Cesar Chavez Student Center",
    "Fine Arts Building",
    "Thornton Hall",
  ]);
  assert.deepEqual(eventLocations([]), []);
});

test("dateInPacificTime converts to the campus calendar day", () => {
  assert.equal(dateInPacificTime("2026-11-05T02:00:00Z"), "2026-11-04");
  assert.equal(dateInPacificTime("2026-07-01T06:59:00Z"), "2026-06-30");
  assert.equal(dateInPacificTime("2026-07-01T07:00:00Z"), "2026-07-01");
});

test("hasActiveFilters enables Clear filters only when something is set", () => {
  assert.equal(hasActiveFilters(EMPTY_FILTERS), false);
  for (const change of [{ query: "x" }, { category: "Arts" }, { date: "2026-11-04" }, { location: "Thornton Hall" }, { access: "asl" }, { scheduleFilter: "available" }]) {
    assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, ...change }), true, JSON.stringify(change));
  }
  // "Show my events" is a view toggle, not a filter Clear resets.
  assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, showMine: true }), false);
});
