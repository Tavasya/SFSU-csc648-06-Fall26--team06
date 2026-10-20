// Tests for the host's saves and RSVP counts (lib/events/engagement.js),
// shown on the My Events dashboard and returned by GET /api/host/events.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { attachEngagement, engagementTotals, withEngagement } from "../lib/events/engagement.js";

const events = [{ id: "a", title: "Career Fair" }, { id: "b", title: "Open Mic" }];

test("attachEngagement adds each event's counts, and zeros when nobody responded", () => {
  const result = attachEngagement(events, [
    { event_id: "a", saves: 4, attending: 10, interested: 2 },
  ]);
  assert.deepEqual(result[0].engagement, { saves: 4, attending: 10, interested: 2 });
  assert.deepEqual(result[1].engagement, { saves: 0, attending: 0, interested: 0 });
  assert.equal(result[0].title, "Career Fair"); // the event itself is unchanged
});

test("attachEngagement turns counts sent as text into numbers", () => {
  const [event] = attachEngagement(events.slice(0, 1), [
    { event_id: "a", saves: "3", attending: "7", interested: "1" },
  ]);
  assert.deepEqual(event.engagement, { saves: 3, attending: 7, interested: 1 });
});

test("when the counts couldn't be loaded, engagement is null instead of a wrong 0", () => {
  const result = attachEngagement(events, null);
  assert.deepEqual(result.map((e) => e.engagement), [null, null]);
  assert.equal(engagementTotals(result), null);
});

test("engagementTotals adds up all events", () => {
  const result = attachEngagement(events, [
    { event_id: "a", saves: 4, attending: 10, interested: 2 },
    { event_id: "b", saves: 1, attending: 5, interested: 3 },
  ]);
  assert.deepEqual(engagementTotals(result), { saves: 5, attending: 15, interested: 5 });
  assert.deepEqual(engagementTotals([]), { saves: 0, attending: 0, interested: 0 });
});

test("withEngagement asks the database for these event ids only", async () => {
  let call;
  const db = {
    rpc: async (name, args) => {
      call = { name, args };
      return { data: [{ event_id: "b", saves: 2, attending: 1, interested: 0 }], error: null };
    },
  };
  const result = await withEngagement(db, events);
  assert.deepEqual(call, { name: "event_engagement", args: { event_ids: ["a", "b"] } });
  assert.deepEqual(result[1].engagement, { saves: 2, attending: 1, interested: 0 });
});

test("withEngagement keeps the events when the database call fails", async () => {
  const db = { rpc: async () => ({ data: null, error: { message: "function not found" } }) };
  const original = console.warn;
  console.warn = () => {};
  try {
    const result = await withEngagement(db, events);
    assert.deepEqual(result.map((e) => [e.id, e.engagement]), [["a", null], ["b", null]]);
  } finally {
    console.warn = original;
  }
});

test("withEngagement skips the database when there are no events", async () => {
  const db = { rpc: async () => assert.fail("should not be called") };
  assert.deepEqual(await withEngagement(db, []), []);
});
