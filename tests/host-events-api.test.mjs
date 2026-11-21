// Tests for Event Management (R4.1 create, R4.3 view/edit, R4.4 delete,
// publish) through lib/events/api.js and the /api/host/events route handlers.
// Supabase is replaced by an in-memory database, like student-api.test.mjs.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const root = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/lib/supabase/server") return { url: "mock:host-supabase", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(new URL(`${specifier.slice(2)}.js`, root).href, context);
    if (specifier.startsWith(".") && !specifier.endsWith(".js") && context.parentURL?.includes("/lib/"))
      return next(`${specifier}.js`, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === "mock:host-supabase") return {
      format: "module", source: "export async function createClient() { return globalThis.hostTestDb; }", shortCircuit: true,
    };
    return next(url, context);
  },
});
const { ApiError, respond, payload } = await import("../lib/events/api.js");
const list = await import("../app/api/host/events/route.js");
const one = await import("../app/api/host/events/[eventId]/route.js");
const publish = await import("../app/api/host/events/[eventId]/publish/route.js");

const HOST = "host-one";
const OTHER = "host-two";
const LOCATION = "123e4567-e89b-42d3-a456-426614174000";
const CATEGORY = "123e4567-e89b-42d3-a456-426614174001";
const MINE = "123e4567-e89b-42d3-a456-426614174010";
const THEIRS = "123e4567-e89b-42d3-a456-426614174011";
const VALID = {
  title: "Campus workshop",
  description: "Build a project with other students.",
  start_date_time: "2026-12-01T18:00:00Z",
  end_date_time: "2026-12-01T20:00:00Z",
  location_id: LOCATION,
  category_ids: [CATEGORY],
  audience: "All students",
  capacity: 20,
};

function database() {
  const tables = {
    events: [
      { ...VALID, id: MINE, host_id: HOST, publication_status: "draft", cover_path: `${HOST}/cover.png` },
      { ...VALID, id: THEIRS, host_id: OTHER, publication_status: "draft", title: "Someone else's event" },
    ],
    locations: [{ id: LOCATION }],
    categories: [{ id: CATEGORY }],
  };
  const db = {
    user: { id: HOST }, tables, fail: {}, removed: [],
    auth: { getUser: async () => ({ data: { user: db.user }, error: null }) },
    rpc: async (name, args) => ({ data: args.event_ids.map((event_id) => ({ event_id, saves: 2, attending: 1, interested: 0 })), error: null }),
    storage: {
      from: () => ({
        createSignedUrl: async () => (db.fail.storage ? { error: { message: "missing" } } : { data: { signedUrl: "https://x" }, error: null }),
        remove: async (paths) => { db.removed.push(...paths); return { error: null }; },
      }),
    },
    from(table) {
      const filters = [];
      let operation = "read", value, single = false;
      return {
        select() { return this; },
        eq(key, target) { filters.push((row) => row[key] === target); return this; },
        in(key, targets) { filters.push((row) => targets.includes(row[key])); return this; },
        order() { return this; },
        maybeSingle() { single = true; return this; },
        single() { single = true; return this; },
        insert(input) { operation = "insert"; value = input; return this; },
        update(input) { operation = "update"; value = input; return this; },
        delete() { operation = "delete"; return this; },
        then(resolve, reject) {
          if (db.fail[table]?.includes(operation)) return Promise.resolve({ data: null, error: { message: "down" } }).then(resolve, reject);
          let rows;
          if (operation === "insert") {
            rows = [{ id: `new-${tables[table].length}`, ...value }];
            tables[table].push(rows[0]);
          } else {
            rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
            if (operation === "update") rows.forEach((row) => Object.assign(row, value));
            if (operation === "delete") tables[table] = tables[table].filter((row) => !rows.includes(row));
          }
          return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(resolve, reject);
        },
      };
    },
  };
  globalThis.hostTestDb = db;
  return db;
}
function request(method = "GET", input, origin = "http://localhost") {
  return new Request("http://localhost/api/host/events", {
    method, headers: { Origin: origin, "Content-Type": "application/json" },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
}
const params = (eventId) => ({ params: Promise.resolve({ eventId }) });

test("host endpoints require sign-in and reject cross-site changes", async () => {
  const db = database();
  db.user = null;
  const res = await list.GET(request());
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, "Sign in to manage your events.");
  db.user = { id: HOST };
  assert.equal((await list.POST(request("POST", VALID, "https://evil.example"))).status, 403);
  assert.equal(db.tables.events.length, 2);
});

test("My Events lists only the host's own events, with engagement counts", async () => {
  database();
  const res = await list.GET(request());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "private, no-store");
  const { events } = await res.json();
  assert.deepEqual(events.map((event) => event.id), [MINE]);
  assert.deepEqual(events[0].engagement, { saves: 2, attending: 1, interested: 0 });
});

test("creating an event saves a draft owned by the signed-in host", async () => {
  const db = database();
  const res = await list.POST(request("POST", { ...VALID, host_id: OTHER, publication_status: "published" }));
  assert.equal(res.status, 200);
  const { event } = await res.json();
  assert.equal(event.host_id, HOST);
  assert.equal(event.publication_status, undefined, "new events start as drafts (database default)");
  assert.equal(event.title, "Campus workshop");
  assert.ok(event.updated_at);
  assert.equal(db.tables.events.length, 3);
});

test("invalid events are rejected with field errors and nothing is saved", async () => {
  const db = database();
  const res = await list.POST(request("POST", { ...VALID, title: "", end_date_time: "2026-11-01T00:00:00Z" }));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.error, "Please check the highlighted fields.");
  assert.ok(body.fields.title);
  assert.ok(body.fields.end_date_time);
  assert.equal(db.tables.events.length, 2);
});

test("unknown locations or categories are rejected", async () => {
  database();
  const missingLocation = await list.POST(request("POST", { ...VALID, location_id: "123e4567-e89b-42d3-a456-426614174099" }));
  assert.equal(missingLocation.status, 422);
  assert.equal((await missingLocation.json()).error, "Choose valid locations and categories.");
  const missingCategory = await list.POST(request("POST", { ...VALID, category_ids: [CATEGORY, "123e4567-e89b-42d3-a456-426614174098"] }));
  assert.equal(missingCategory.status, 422);
});

test("cover images must be the host's own upload and still exist", async () => {
  const db = database();
  const foreign = await list.POST(request("POST", { ...VALID, cover_path: `${OTHER}/cover.png` }));
  assert.equal((await foreign.json()).error, "Invalid cover image.");
  const traversal = await list.POST(request("POST", { ...VALID, cover_path: `${HOST}/../${OTHER}/cover.png` }));
  assert.equal(traversal.status, 422);
  db.fail.storage = true;
  const gone = await list.POST(request("POST", { ...VALID, cover_path: `${HOST}/cover.png` }));
  assert.equal((await gone.json()).error, "Cover image is not available. Upload it again.");
  db.fail.storage = false;
  assert.equal((await list.POST(request("POST", { ...VALID, cover_path: `${HOST}/cover.png` }))).status, 200);
});

test("hosts can view and edit their own events but not another host's", async () => {
  const db = database();
  const view = await one.GET(request(), params(MINE));
  assert.equal((await view.json()).event.id, MINE);
  assert.equal((await one.GET(request(), params(THEIRS))).status, 404);

  const edit = await one.PATCH(request("PATCH", { ...VALID, title: "Renamed workshop" }), params(MINE));
  assert.equal(edit.status, 200);
  assert.equal((await edit.json()).event.title, "Renamed workshop");

  const blocked = await one.PATCH(request("PATCH", { ...VALID, title: "Hijacked" }), params(THEIRS));
  assert.equal(blocked.status, 404);
  assert.equal(db.tables.events.find((event) => event.id === THEIRS).title, "Someone else's event");
});

test("publishing re-validates the stored draft and marks it published", async () => {
  const db = database();
  const res = await publish.POST(request("POST"), params(MINE));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).event.publication_status, "published");
  assert.equal((await publish.POST(request("POST"), params(THEIRS))).status, 404);

  db.tables.events.find((event) => event.id === MINE).description = "short";
  assert.equal((await publish.POST(request("POST"), params(MINE))).status, 422);
});

test("deleting removes the host's event and its cover image only", async () => {
  const db = database();
  assert.equal((await one.DELETE(request("DELETE"), params(THEIRS))).status, 404);
  const res = await one.DELETE(request("DELETE"), params(MINE));
  assert.deepEqual(await res.json(), { deleted: true });
  assert.deepEqual(db.tables.events.map((event) => event.id), [THEIRS]);
  assert.deepEqual(db.removed, [`${HOST}/cover.png`]);
});

test("database failures return 503 with a clear message", async () => {
  const db = database();
  db.fail.events = ["read"];
  assert.equal((await (await list.GET(request())).json()).error, "Could not load events.");
  db.fail.events = ["insert"];
  assert.equal((await (await list.POST(request("POST", VALID))).json()).error, "Could not save your draft.");
  db.fail.events = ["update"];
  assert.equal((await one.PATCH(request("PATCH", VALID), params(MINE))).status, 503);
  assert.equal((await (await publish.POST(request("POST"), params(MINE))).json()).error, "Could not publish the event.");
  db.fail.events = ["delete"];
  assert.equal((await (await one.DELETE(request("DELETE"), params(MINE))).json()).error, "Could not delete the event.");
  db.fail = { locations: ["read"] };
  assert.equal((await list.POST(request("POST", VALID))).status, 503);
});

test("respond hides unexpected errors behind a generic 500", async (t) => {
  t.mock.method(console, "error", () => {});
  const crash = respond(async () => { throw new Error("secret stack detail"); });
  const res = await crash();
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "Could not complete the request. Please try again." });

  const known = respond(async () => { throw new ApiError("Nope.", 409, { title: "Taken" }); });
  const body = await (await known()).json();
  assert.deepEqual(body, { error: "Nope.", fields: { title: "Taken" } });
});

test("payload strips client-only fields and stamps updated_at", async () => {
  const db = database();
  const values = await payload(db, { id: HOST }, { ...VALID, host_id: OTHER, id: "spoofed" });
  assert.equal(values.host_id, undefined);
  assert.equal(values.id, undefined);
  assert.ok(Date.parse(values.updated_at));
});
