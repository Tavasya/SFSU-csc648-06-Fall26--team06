// R4.4 Cancel Events: POST /api/host/events/[eventId]/cancel. Only the host
// can cancel their own published, active event, after confirming and giving a
// reason; the event keeps its details and is marked cancelled.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDb, params, request } from "./helpers/harness.mjs";

const { POST } = await import("../app/api/host/events/[eventId]/cancel/route.js");
const HOST = { id: "host-1" };
const REASON = "The speaker is sick, sorry everyone!";

function campus() {
  return createDb({
    user: HOST,
    tables: {
      events: [
        { id: "live", host_id: "host-1", title: "Workshop", publication_status: "published", status: "active" },
        { id: "draft", host_id: "host-1", publication_status: "draft", status: "active" },
        { id: "done", host_id: "host-1", publication_status: "published", status: "completed" },
        { id: "gone", host_id: "host-1", publication_status: "published", status: "cancelled" },
        { id: "theirs", host_id: "host-2", publication_status: "published", status: "active" },
      ],
    },
  });
}
const cancel = async (eventId, body = { confirm: true, cancellation_message: REASON }, origin) => {
  const res = await POST(request("POST", body, origin && { origin }), params({ eventId }));
  return { status: res.status, ...(await res.json()) };
};

test("the host's published event is cancelled, keeping its details", async () => {
  const db = campus();
  const result = await cancel("live", { confirm: true, cancellation_message: `  ${REASON}  ` });
  assert.equal(result.status, 200);
  assert.equal(result.cancelled, true);
  const row = db.tables.events.find((e) => e.id === "live");
  assert.equal(row.status, "cancelled");
  assert.equal(row.title, "Workshop");
  assert.equal(row.cancellation_message, REASON);
  assert.equal(row.cancelled_by, "host-1");
  assert.ok(Date.parse(row.cancelled_at));
});

test("cancelling needs sign-in, the same site, and the event's owner", async () => {
  const db = campus();
  db.user = null;
  assert.equal((await cancel("live")).status, 401);
  db.user = HOST;
  assert.equal((await cancel("live", undefined, "https://evil.example")).status, 403);
  assert.equal((await cancel("theirs")).status, 404);
  assert.equal(db.tables.events.find((e) => e.id === "theirs").status, "active");
});

test("the host must confirm and give a 10-1000 character reason", async () => {
  campus();
  assert.deepEqual(await cancel("live", { cancellation_message: REASON }), { status: 400, error: "Please confirm event cancellation." });
  assert.equal((await cancel("live", { confirm: true, cancellation_message: "short" })).status, 422);
  assert.equal((await cancel("live", { confirm: true, cancellation_message: "x".repeat(1001) })).status, 422);
  assert.equal((await cancel("live", { confirm: true })).status, 422);
});

test("drafts, completed and already-cancelled events can't be cancelled", async () => {
  campus();
  assert.match((await cancel("draft")).error, /Only published events/);
  assert.match((await cancel("done")).error, /Completed events cannot be cancelled/);
  assert.match((await cancel("gone")).error, /already been cancelled/);
});

test("a database failure or a concurrent change is reported", async () => {
  const db = campus();
  db.fail.events = ["update"];
  assert.deepEqual(await cancel("live"), { status: 503, error: "Could not cancel the event." });
  db.fail = {};
  const original = db.from.bind(db);
  let reads = 0;
  db.from = (table) => {
    const query = original(table);
    if (table === "events" && ++reads === 2) db.tables.events.find((e) => e.id === "live").status = "completed";
    return query;
  };
  assert.equal((await cancel("live")).status, 409);
});
