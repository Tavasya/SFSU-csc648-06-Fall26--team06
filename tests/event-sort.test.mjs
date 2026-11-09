// Tests for the Explore and For you sort orders (lib/events/sort.js).
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { sortEvents, sortNote } from "../lib/events/sort.js";

const events = [
  { id: "b", title: "bake sale", start_date_time: "2026-11-10T18:00:00Z", admission_type: "paid", category_ids: ["food"], created_at: "2026-11-01T00:00:00Z" },
  { id: "a", title: "Art walk", start_date_time: "2026-11-12T18:00:00Z", admission_type: "free", category_ids: ["art", "social"], created_at: "2026-11-05T00:00:00Z" },
  { id: "c", title: "Career fair", start_date_time: "2026-11-09T18:00:00Z", admission_type: "free", category_ids: ["career"], created_at: "2026-10-20T00:00:00Z" },
];
const ids = (list) => list.map((event) => event.id).join("");

test("sorts by date both ways", () => {
  assert.equal(ids(sortEvents(events, "soonest")), "cba");
  assert.equal(ids(sortEvents(events, "latest")), "abc");
});

test("sorts titles A to Z and back, ignoring case", () => {
  assert.equal(ids(sortEvents(events, "az")), "abc");
  assert.equal(ids(sortEvents(events, "za")), "cba");
});

test("cost sorts put free or paid first, then the soonest", () => {
  assert.equal(ids(sortEvents(events, "free")), "cab");
  assert.equal(ids(sortEvents(events, "paid")), "bca");
});

test("recently added puts the newest event first", () => {
  assert.equal(ids(sortEvents(events, "newest")), "abc");
});

test("best match puts events sharing the most interests first", () => {
  assert.equal(ids(sortEvents(events, "match", { interestIds: ["art", "social", "career"] })), "acb");
});

test("fits your schedule first keeps the rest by date", () => {
  assert.equal(ids(sortEvents(events, "fits", { fits: (event) => event.id === "a" })), "acb");
});

test("does not change the list it was given", () => {
  const copy = [...events];
  sortEvents(events, "az");
  assert.deepEqual(events, copy);
});

test("sortNote explains a cost sort when every event costs the same", () => {
  const free = events.filter((event) => event.admission_type === "free");
  assert.match(sortNote(free, "paid"), /^All of these events are free/);
  assert.equal(sortNote(events, "paid"), null);
});

test("sortNote explains schedule and interest sorts that can't reorder", () => {
  assert.match(sortNote(events, "fits"), /^None of these events fit your schedule/);
  assert.match(sortNote(events, "fits", { fits: () => true }), /^All of these events/);
  assert.match(sortNote(events, "match", { interestIds: ["sports"] }), /match your interests equally/);
  assert.equal(sortNote(events, "match", { interestIds: ["art"] }), null);
});

test("sortNote stays quiet for orders that always apply", () => {
  for (const sort of ["soonest", "latest", "az", "za", "newest"]) {
    assert.equal(sortNote(events, sort), null);
  }
});
