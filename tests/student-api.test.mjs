import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Exercise the real route handlers with an in-memory Supabase boundary.
// Database RLS still needs the live two-account check documented in student-features.
const root = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/lib/supabase/server") return { url: "mock:supabase", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(new URL(`${specifier.slice(2)}.js`, root).href, context);
    if (specifier.startsWith(".") && !specifier.endsWith(".js") && context.parentURL?.includes("/lib/"))
      return next(`${specifier}.js`, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === "mock:supabase") return {
      format: "module", source: "export async function createClient() { return globalThis.studentTestDb; }", shortCircuit: true,
    };
    return next(url, context);
  },
});
const saved = await import("../app/api/events/[eventId]/saved/route.js");
const rsvp = await import("../app/api/events/[eventId]/rsvps/me/route.js");
const interests = await import("../app/api/users/me/interests/route.js");
const recommended = await import("../app/api/events/for-you/route.js");
const id = "123e4567-e89b-42d3-a456-426614174001";
const category = "123e4567-e89b-42d3-a456-426614174002";
const context = { params: Promise.resolve({ eventId: id }) };

function database() {
  const tables = {
    events: [{ id, category_ids: [category], publication_status: "published", status: "active", end_date_time: "2099-01-01T00:00:00Z" }],
    categories: [{ id: category, name: "Technology" }],
    student_preferences: [], saved_events: [], event_rsvps: [],
  };
  const db = {
    user: { id: "student-one" }, tables,
    auth: { getUser: async () => ({ data: { user: db.user } }) },
    from(table) {
      const filters = [];
      let operation = "read", value, options, single = false;
      const query = {
        select() { return this; },
        eq(key, target) { filters.push((row) => row[key] === target); return this; },
        gt(key, target) { filters.push((row) => row[key] > target); return this; },
        in(key, targets) { filters.push((row) => targets.includes(row[key])); return this; },
        overlaps(key, targets) { filters.push((row) => row[key].some((item) => targets.includes(item))); return this; },
        order() { return this; },
        maybeSingle() { single = true; return this; },
        single() { single = true; return this; },
        upsert(input, opts) { operation = "upsert"; value = input; options = opts; return this; },
        delete() { operation = "delete"; return this; },
        then(resolve, reject) {
          try {
            if (operation === "upsert") {
              const existing = tables[table].find((row) => row.user_id === value.user_id && row.event_id === value.event_id);
              if (!existing) tables[table].push({ ...value });
              else if (!options?.ignoreDuplicates) Object.assign(existing, value);
              return Promise.resolve({ data: single ? { ...value } : null }).then(resolve, reject);
            }
            const rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
            if (operation === "delete") tables[table] = tables[table].filter((row) => !rows.includes(row));
            return Promise.resolve({ data: single ? rows[0] || null : rows }).then(resolve, reject);
          } catch (error) { return Promise.reject(error).then(resolve, reject); }
        },
      };
      return query;
    },
  };
  globalThis.studentTestDb = db;
  return db;
}
function request(method = "GET", input, origin = "http://localhost") {
  return new Request("http://localhost/api/test", {
    method, headers: { Origin: origin, "Content-Type": "application/json" },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
}
test("student endpoints reject anonymous users and foreign mutation origins", async () => {
  const db = database();
  db.user = null;
  assert.equal((await interests.GET(request())).status, 401);
  assert.equal((await saved.PUT(request("PUT"), context)).status, 401);
  db.user = { id: "student-one" };
  assert.equal((await rsvp.PUT(request("PUT", { status: "attending" }, "https://other.example"), context)).status, 403);
});
test("repeat saves and RSVPs persist one row, independently and per authenticated user", async () => {
  const db = database();
  for (let i = 0; i < 2; i++) {
    assert.equal((await saved.PUT(request("PUT"), context)).status, 200);
    assert.equal((await rsvp.PUT(request("PUT", { status: "attending" }), context)).status, 200);
  }
  assert.equal(db.tables.saved_events.length, 1);
  assert.equal(db.tables.event_rsvps.length, 1);
  assert.equal((await (await rsvp.GET(request(), context)).json()).rsvp.status, "attending");
  await saved.DELETE(request("DELETE"), context);
  assert.equal(db.tables.saved_events.length, 0);
  assert.equal(db.tables.event_rsvps[0].status, "attending");
  await saved.PUT(request("PUT"), context);
  await rsvp.PUT(request("PUT", { status: "not_attending" }), context);
  assert.equal(db.tables.saved_events.length, 1);
  db.user = { id: "student-two" };
  assert.equal((await (await saved.GET(request(), context)).json()).saved, false);
  assert.equal((await (await rsvp.GET(request(), context)).json()).rsvp, null);
});
test("cancelled events reject attending but allow withdrawing; drafts are inaccessible", async () => {
  const db = database();
  db.tables.events[0].status = "cancelled";
  assert.equal((await rsvp.PUT(request("PUT", { status: "attending" }), context)).status, 409);
  assert.equal((await rsvp.PUT(request("PUT", { status: "not_attending" }), context)).status, 200);
  assert.equal((await rsvp.PUT(request("PUT", { status: "invalid" }), context)).status, 422);
  db.tables.events[0].publication_status = "draft";
  assert.equal((await saved.PUT(request("PUT"), context)).status, 404);
});
test("preferences replace atomically and recommendations exclude unmatched, ended and cancelled events", async () => {
  const db = database();
  assert.equal((await interests.PUT(request("PUT", { category_ids: ["invalid"] }))).status, 422);
  assert.equal((await interests.PUT(request("PUT", { category_ids: [category, category] }))).status, 200);
  assert.deepEqual(db.tables.student_preferences[0].category_ids, [category]);
  const original = db.tables.events[0];
  db.tables.events.push(
    { ...original, id: "unmatched", category_ids: [] },
    { ...original, id: "ended", end_date_time: "2000-01-01T00:00:00Z" },
    { ...original, id: "cancelled", status: "cancelled" },
    { ...original, id: "draft", publication_status: "draft" },
  );
  const result = await (await recommended.GET(request())).json();
  assert.deepEqual(result.events.map((event) => event.id), [id]);
  assert.deepEqual(result.events[0].recommendation_reasons, ["Technology"]);
  await interests.PUT(request("PUT", { category_ids: [] }));
  assert.deepEqual((await (await recommended.GET(request())).json()).events, []);
});
