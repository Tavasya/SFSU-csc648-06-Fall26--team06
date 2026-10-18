// Checks that the Map's hand-written data (lib/map/buildings.js) and
// the generated shapes (lib/map/geometry.js) stay in sync. If someone adds a
// building or room and forgets a piece, these tests say exactly what's missing.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILDINGS, PLACES, VENUES } from "../lib/map/buildings.js";
import geometry from "../lib/map/geometry.js";
import { SAMPLE_EVENTS, SAMPLE_SCANS } from "../lib/map/sample-events.js";

const shapeIds = new Set([...geometry.buildings, ...geometry.places].map((s) => s.id));
const mapIds = new Set([...BUILDINGS, ...PLACES].map((b) => b.id));

test("every building and outdoor space has a shape on the map", () => {
  const missing = [...mapIds].filter((id) => !shapeIds.has(id));
  assert.deepEqual(missing, [], "Run scripts/map/build-map.mjs after adding to buildings.js");
});

test("ids are unique across buildings, outdoor spaces and rooms", () => {
  const ids = [...BUILDINGS, ...PLACES, ...VENUES].map((x) => x.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(duplicates, []);
});

test("Supabase location names are unique, so each one matches a single place", () => {
  const names = [...BUILDINGS, ...PLACES, ...VENUES].map((x) => x.locationName).filter(Boolean);
  const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
  assert.deepEqual(duplicates, []);
});

test("every room's parent building exists on the map", () => {
  const orphans = VENUES.filter((v) => !mapIds.has(v.parentId)).map((v) => v.id);
  assert.deepEqual(orphans, []);
  for (const v of VENUES) assert.ok(["inside", "at"].includes(v.relation), `${v.id} has relation "${v.relation}"`);
});

test("sample events point to real map places and rooms", () => {
  const venueIds = new Set(VENUES.map((v) => v.id));
  for (const event of SAMPLE_EVENTS) {
    assert.ok(mapIds.has(event.mapId), `${event.id} has unknown mapId "${event.mapId}"`);
    if (event.venueId) assert.ok(venueIds.has(event.venueId), `${event.id} has unknown venueId "${event.venueId}"`);
    assert.ok(event.endDate >= event.date, `${event.id} ends before it starts`);
  }
  for (const [id, rooms] of Object.entries(SAMPLE_SCANS)) {
    assert.ok(mapIds.has(id), `SAMPLE_SCANS has unknown id "${id}"`);
    for (const room of rooms) assert.equal(room.id, null, "sample rooms must not point at real scans");
  }
});
