// Public read APIs behind browsing, details, the Campus Map and 3D rooms:
//  R2.1 / R2.6  GET /api/events                      (list, error state)
//  R3.1         GET /api/events/[eventId]            (details, not found)
//  R6.1 / R6.2  GET /api/locations, /[id], /[id]/events and lib/map/page-data.js
//  R7.1 / R7.4  GET /api/rooms/[roomId]/info and /3d-model
// Supabase is an in-memory fake (tests/helpers/harness.mjs).
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDb, params, quietly } from "./helpers/harness.mjs";
import { LOCATION_CATEGORIES, LOCATION_ROWS } from "./fixtures/locations.mjs";

const events = await import("../app/api/events/route.js");
const eventById = await import("../app/api/events/[eventId]/route.js");
const locations = await import("../app/api/locations/route.js");
const location = await import("../app/api/locations/[locationId]/route.js");
const locationEvents = await import("../app/api/locations/[locationId]/events/route.js");
const roomInfo = await import("../app/api/rooms/[roomId]/info/route.js");
const roomModel = await import("../app/api/rooms/[roomId]/3d-model/route.js");
const mapData = await import("../lib/map/page-data.js");

const FUTURE = "2099-01-01T00:00:00Z";
const PAST = "2000-01-01T00:00:00Z";
const row = (id, extra = {}) => ({
  id, title: `Event ${id}`, publication_status: "published", status: "active",
  start_date_time: "2098-12-31T18:00:00Z", end_date_time: FUTURE, category_ids: ["c1"], host_id: "host-1", ...extra,
});
function campus() {
  return createDb({
    tables: {
      events: [
        row("a", { location_id: "loc-ccsc", location: { building_name: "Cesar Chavez Student Center" } }),
        row("b", { location_id: "loc-jack", location: { building_name: "Jack Adams Hall" }, start_date_time: "2098-12-30T18:00:00Z", cover_path: "host-1/b.png" }),
        row("draft", { publication_status: "draft", location_id: "loc-ccsc" }),
        row("cancelled", { status: "cancelled", location_id: "loc-ccsc" }),
        row("ended", { end_date_time: PAST, location_id: "loc-ccsc" }),
        row("elsewhere", { location_id: "loc-downtown", location: { building_name: "Downtown Campus" } }),
      ],
      locations: LOCATION_ROWS.map((r) => ({ ...r })),
      location_categories: LOCATION_CATEGORIES.map((c, i) => ({ ...c, sort_order: i })),
      categories: [{ id: "c1", name: "Technology" }],
      hosts: [{ user_id: "host-1", display_name: "Robotics Club" }],
      rooms: [
        { id: "r1", room_name: "Jack Adams Hall", has_3d_view: true, scan_date: "2026-10-01", model_view_path: "jack.spz", location: { building_name: "Jack Adams Hall" } },
        { id: "r2", room_name: "Burk 101", has_3d_view: true, model_view_path: "burk.glb", location: { building_name: "Burk Hall" } },
        { id: "r3", room_name: "No scan", has_3d_view: false, model_view_path: null },
      ],
    },
    rpc: { event_attendance: ({ event_ids }) => event_ids.map((event_id) => ({ event_id, attending: 1 })) },
    files: { "rooms/burk.glb": "GLB-BYTES" },
  });
}

test("R2.1 GET /api/events lists published, active events for anyone", async () => {
  campus();
  const res = await events.GET();
  assert.equal(res.status, 200);
  const ids = (await res.json()).events.map((e) => e.id);
  assert.ok(ids.includes("a") && ids.includes("b"));
  assert.ok(!ids.includes("draft") && !ids.includes("cancelled"));
});

test("R2.6 GET /api/events reports a load failure so the page can offer a retry", async () => {
  campus().fail.events = ["read"];
  const res = await events.GET();
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: "Could not load events." });
});

test("R3.1 GET /api/events/[id] returns a published event, and 404 for drafts or unknown ids", async () => {
  campus();
  const ok = await eventById.GET(new Request("http://localhost"), params({ eventId: "a" }));
  assert.equal((await ok.json()).event.title, "Event a");
  for (const eventId of ["draft", "missing"]) {
    const res = await eventById.GET(new Request("http://localhost"), params({ eventId }));
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Event not found." });
  }
});

test("R6.1 GET /api/locations lists campus locations A-Z, or 503", async () => {
  const db = campus();
  const names = (await (await locations.GET()).json()).locations.map((l) => l.building_name);
  assert.deepEqual(names, [...names].sort());
  db.fail.locations = ["read"];
  assert.equal((await locations.GET()).status, 503);
});

test("R6.1 GET /api/locations/[id] returns a building with its rooms (venues)", async () => {
  const db = campus();
  const body = await (await location.GET(null, params({ locationId: "loc-ccsc" }))).json();
  assert.equal(body.location.building_name, "Cesar Chavez Student Center");
  assert.deepEqual(body.venues.map((v) => v.building_name), ["Bookstore", "Jack Adams Hall"]);
  assert.equal((await location.GET(null, params({ locationId: "nope" }))).status, 404);
  db.fail = { locations: ["read"] };
  assert.equal((await location.GET(null, params({ locationId: "loc-ccsc" }))).status, 404);
});

test("R6.2 GET /api/locations/[id]/events includes events in the building's rooms, upcoming only", async () => {
  const db = campus();
  const body = await (await locationEvents.GET(null, params({ locationId: "loc-ccsc" }))).json();
  assert.deepEqual(body.events.map((e) => e.id).sort(), ["a", "b"]);
  assert.equal((await locationEvents.GET(null, params({ locationId: "nope" }))).status, 404);
  db.fail.events = ["read"];
  assert.equal((await locationEvents.GET(null, params({ locationId: "loc-ccsc" }))).status, 503);
});

test("R6.1 / R6.2 loadMapEvents builds places, matched events, unmatched events and 3D scans", async () => {
  campus();
  const map = await mapData.loadMapEvents();
  assert.ok(map.places.buildings.length > 0);
  assert.deepEqual(map.events.map((e) => e.id).sort(), ["a", "b"]);
  assert.deepEqual(map.unmatched.map((e) => e.id), ["elsewhere"]);
  assert.deepEqual(Object.keys(map.scans).sort(), ["bh", "ccsc"]);
  assert.equal(map.signedIn, false);
  const b = map.events.find((e) => e.id === "b");
  assert.equal(b.coverUrl, "https://files.test/event-covers/host-1/b.png");
});

test("R6.2 map data keeps working when optional extras (hosts, covers, rooms, attendance) fail", async () => {
  const db = campus();
  db.fail = { hosts: ["read"], rooms: ["read"], storage: true, rpc: ["event_attendance"] };
  const map = await quietly(() => mapData.loadMapEvents());
  assert.equal(map.events.length, 2);
  assert.deepEqual(map.scans, {});
  db.fail = { events: ["read"] };
  await assert.rejects(mapData.loadMapEvents(), /Could not load campus map events/);
  db.fail = { locations: ["read"] };
  await assert.rejects(mapData.loadCampusPlaces(db), /Could not load campus map places/);
});

test("loadHostNames maps host ids to names, skipping the query when there are none", async () => {
  const db = campus();
  assert.deepEqual([...(await mapData.loadHostNames(db, [{ host_id: "host-1" }, { host_id: "host-1" }]))], [["host-1", "Robotics Club"]]);
  assert.equal((await mapData.loadHostNames(db, [{}])).size, 0);
});

test("R7.4 GET /api/rooms/[id]/info describes a scanned room", async () => {
  campus();
  const res = await roomInfo.GET(null, params({ roomId: "r1" }));
  assert.deepEqual(await res.json(), { room_name: "Jack Adams Hall", scan_date: "2026-10-01", model_view_path: "jack.spz" });
  assert.equal((await roomInfo.GET(null, params({ roomId: "missing" }))).status, 404);
  globalThis.__testDb = null;
  assert.equal((await roomInfo.GET(null, params({ roomId: "r1" }))).status, 500);
});

test("R7.1 GET /api/rooms/[id]/3d-model streams the GLB scan, or explains why it can't", async () => {
  campus();
  const ok = await roomModel.GET(null, params({ roomId: "r2" }));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("Content-Type"), "model/gltf-binary");
  assert.equal(await ok.text(), "GLB-BYTES");
  const errorOf = async (roomId) => {
    const res = await roomModel.GET(null, params({ roomId }));
    return [res.status, (await res.json()).error];
  };
  assert.deepEqual(await errorOf("missing"), [404, "room not found"]);
  assert.deepEqual(await errorOf("r3"), [404, "room has no 3D model"]);
  assert.deepEqual(await errorOf("r1"), [404, "GLB file not found"]);
  globalThis.__testDb = null;
  assert.equal((await roomModel.GET(null, params({ roomId: "r2" }))).status, 500);
});

test("R4.1 / R3.1 event form options and the signed-in host's display name", async () => {
  const { options, pageContext } = await import("../lib/events/page-data.js");
  const db = campus();
  const loaded = await options(db);
  assert.deepEqual(loaded.categories, [{ id: "c1", name: "Technology" }]);
  assert.equal(loaded.locations.length, LOCATION_ROWS.length);
  db.fail.categories = ["read"];
  await assert.rejects(options(db), /Could not load event options/);

  db.user = null;
  assert.equal((await pageContext()).host, null);
  db.user = { id: "u1", email: "gator@sfsu.edu", user_metadata: {} };
  assert.deepEqual((await pageContext()).host, { user_id: "u1", display_name: "gator" });
  db.user = { id: "u1", email: "gator@sfsu.edu", user_metadata: { display_name: "Gator Club" } };
  assert.equal((await pageContext()).host.display_name, "Gator Club");
  db.user = { id: "u1" };
  assert.equal((await pageContext()).host.display_name, "Campus organizer");
});
