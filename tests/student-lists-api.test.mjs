// R5.1 Save and Manage Events and R3.4 RSVP lists:
// GET /api/users/me/saved-events and GET /api/users/me/rsvps return only the
// signed-in student's own saved events and RSVPs, newest first.
// R5.3 Recommended for You: GET /api/events/for-you also returns the
// student's own matching events, marked hosted_by_you.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDb, request } from "./helpers/harness.mjs";

const saved = await import("../app/api/users/me/saved-events/route.js");
const rsvps = await import("../app/api/users/me/rsvps/route.js");
const forYou = await import("../app/api/events/for-you/route.js");

function campus() {
  return createDb({
    user: { id: "me" },
    tables: {
      saved_events: [
        { user_id: "me", saved_at: "2026-11-01", events: { id: "a", title: "Older save" } },
        { user_id: "me", saved_at: "2026-11-05", events: { id: "b", title: "Newer save" } },
        { user_id: "me", saved_at: "2026-11-06", events: null },
        { user_id: "someone-else", saved_at: "2026-11-07", events: { id: "c" } },
      ],
      event_rsvps: [
        { user_id: "me", status: "attending", updated_at: "2026-11-02", events: { id: "a" } },
        { user_id: "me", status: "interested", updated_at: "2026-11-04", events: { id: "b" } },
        { user_id: "someone-else", status: "attending", updated_at: "2026-11-09", events: { id: "c" } },
      ],
      categories: [{ id: "c1", name: "Technology" }],
    },
  });
}

test("saved events: only mine, newest first, with when I saved them; deleted events are skipped", async () => {
  campus();
  const body = await (await saved.GET(request())).json();
  assert.deepEqual(body.events, [
    { id: "b", title: "Newer save", saved_at: "2026-11-05" },
    { id: "a", title: "Older save", saved_at: "2026-11-01" },
  ]);
  assert.deepEqual(body.categories, [{ id: "c1", name: "Technology" }]);
});

test("RSVPs: only mine, most recently updated first", async () => {
  campus();
  const body = await (await rsvps.GET(request())).json();
  assert.deepEqual(body.rsvps.map((r) => [r.events.id, r.status]), [["b", "interested"], ["a", "attending"]]);
});

test("both lists need sign-in and report load failures", async () => {
  const db = campus();
  db.user = null;
  assert.equal((await saved.GET(request())).status, 401);
  assert.equal((await rsvps.GET(request())).status, 401);
  db.user = { id: "me" };
  db.fail = { saved_events: ["read"], event_rsvps: ["read"] };
  assert.equal((await saved.GET(request())).status, 503);
  assert.equal((await rsvps.GET(request())).status, 503);
});

test("R5.3 Recommended for You lists matches from others, plus my own matching events marked as mine", async () => {
  const future = "2099-01-01T00:00:00Z";
  const event = (id, host_id, category_ids, extra = {}) => ({
    id, host_id, category_ids, publication_status: "published", status: "active",
    start_date_time: "2098-12-31T18:00:00Z", end_date_time: future, ...extra,
  });
  const db = createDb({
    user: { id: "me" },
    tables: {
      categories: [{ id: "tech", name: "Technology" }, { id: "art", name: "Arts" }],
      student_preferences: [{ user_id: "me", category_ids: ["tech"] }],
      events: [
        event("theirs", "host-2", ["tech"]),
        event("mine", "me", ["tech", "art"]),
        event("my-art", "me", ["art"]),
        event("my-draft", "me", ["tech"], { publication_status: "draft" }),
        event("my-cancelled", "me", ["tech"], { status: "cancelled" }),
        event("my-ended", "me", ["tech"], { end_date_time: "2000-01-01T00:00:00Z" }),
      ],
    },
  });
  const body = await (await forYou.GET(request())).json();
  assert.deepEqual(body.events.map((e) => [e.id, e.recommendation_reasons]), [["theirs", ["Technology"]]]);
  assert.deepEqual(body.own_events.map((e) => [e.id, e.hosted_by_you]), [["mine", true]]);

  db.tables.student_preferences = [];
  const empty = await (await forYou.GET(request())).json();
  assert.deepEqual([empty.events, empty.own_events, empty.category_ids], [[], [], []]);
});
