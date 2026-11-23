// R3 Detailed Content View: event details (R3.1), location and map link
// (R3.2), event status (R3.6), accessibility and capacity, in
// lib/events/details.js, lib/events/accessibility.js and lib/events/attendance.js.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PHASE_LABELS, backLink, capacityText, contactHref, eventPhase, hostLabel, locationLine, mapHref,
} from "../lib/events/details.js";
import { accessibilityFeatures, accessibilityText } from "../lib/events/accessibility.js";
import { FULL_MESSAGE, isFull, loadAttendance } from "../lib/events/attendance.js";

const EVENT = {
  id: "e1", title: "Trivia Night", status: "active", contact_email: "club@sfsu.edu",
  start_date_time: "2026-11-10T02:00:00Z", end_date_time: "2026-11-10T04:00:00Z",
};

test("R3.6 eventPhase: upcoming, ongoing, completed, and cancelled always wins", () => {
  assert.equal(eventPhase(EVENT, new Date("2026-11-09T00:00:00Z")), "upcoming");
  assert.equal(eventPhase(EVENT, new Date("2026-11-10T02:00:00Z")), "ongoing");
  assert.equal(eventPhase(EVENT, new Date("2026-11-10T03:59:00Z")), "ongoing");
  assert.equal(eventPhase(EVENT, new Date("2026-11-10T04:00:00Z")), "completed");
  assert.equal(eventPhase({ ...EVENT, status: "cancelled" }, new Date("2026-11-09T00:00:00Z")), "cancelled");
  assert.equal(eventPhase({ ...EVENT, status: "cancelled" }, new Date("2026-12-01T00:00:00Z")), "cancelled");
  assert.equal(eventPhase({ ...EVENT, status: "completed" }, new Date("2026-11-09T00:00:00Z")), "completed");
  assert.equal(typeof eventPhase(EVENT), "string");
});

test("R3.6 every phase has a label", () => {
  assert.deepEqual(PHASE_LABELS, { upcoming: "Upcoming", ongoing: "Happening now", completed: "Completed", cancelled: "Cancelled" });
});

test("R3.1 organizer name, contact link and capacity", () => {
  assert.equal(hostLabel("Robotics Club"), "Robotics Club");
  assert.equal(hostLabel(undefined), "GatorAid organizer");
  assert.equal(contactHref(EVENT), "mailto:club@sfsu.edu?subject=Question%20about%20Trivia%20Night");
  assert.equal(contactHref({ ...EVENT, contact_email: "" }), null);
  assert.equal(capacityText(40), "40 attendee capacity");
  assert.equal(capacityText(null), "Open capacity");
});

test("R3.2 location line and the Campus Map link that highlights the place", () => {
  assert.equal(locationLine({ building_name: "Thornton Hall" }, "TH 329"), "Thornton Hall, TH 329");
  assert.equal(locationLine({ building_name: "Thornton Hall" }), "Thornton Hall");
  assert.equal(locationLine(undefined), "Location TBA");
  assert.equal(mapHref("thornton", "e1"), "/map?place=thornton&event=e1");
  assert.equal(mapHref("cesar chavez"), "/map?place=cesar%20chavez");
  assert.equal(mapHref(null), "/map");
});

test("Back link returns to events, the host's events, or Allison", () => {
  assert.deepEqual(backLink(), { href: "/events", label: "Back to events" });
  assert.deepEqual(backLink({ preview: true }), { href: "/host/events", label: "Back to your events" });
  assert.deepEqual(backLink({ from: "assistant" }), { href: "/assistant", label: "Back to chat with Allison" });
});

test("R3.1 accessibility details", () => {
  assert.deepEqual(accessibilityFeatures({ wheelchair: true, asl: true }), ["Wheelchair accessible", "ASL interpretation"]);
  assert.equal(accessibilityText({ wheelchair: true }), "Wheelchair accessible");
  assert.equal(accessibilityText({}), "No accessibility features listed");
});

test("R3.4 capacity: an event is full only when capacity and count are known", async () => {
  assert.equal(isFull(10, 10), true);
  assert.equal(isFull(10, 9), false);
  assert.equal(isFull(null, 50), false);
  assert.equal(isFull(10, null), false);
  assert.equal(FULL_MESSAGE, "RSVP capacity has been reached.");

  const db = { rpc: async (name, { event_ids }) => ({ data: event_ids.map((id) => ({ event_id: id, attending: "3" })), error: null }) };
  assert.deepEqual([...(await loadAttendance(db, ["a", "b"]))], [["a", 3], ["b", 3]]);
  assert.equal((await loadAttendance(db, [])).size, 0);
  assert.equal((await loadAttendance({ rpc: async () => ({ error: { message: "missing" } }) }, ["a"])).size, 0);
  assert.equal((await loadAttendance({ rpc: async () => { throw new Error("offline"); } }, ["a"])).size, 0);
});
