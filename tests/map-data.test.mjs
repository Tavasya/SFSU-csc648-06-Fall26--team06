// Tests for turning Supabase "locations" rows into Campus Map places
// (lib/map/places.js), and for the sample events matching the generated
// shapes (lib/map/geometry.js).
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import geometry from "../lib/map/geometry.js";
import { SAMPLE_EVENTS, SAMPLE_SCANS } from "../lib/map/sample-events.js";
import { createCampus, toCampusPlaces } from "../lib/map/places.js";
import { LOCATION_CATEGORIES, LOCATION_ROWS } from "./fixtures/locations.mjs";

const shapeIds = new Set([...geometry.buildings, ...geometry.places].map((s) => s.id));
const shapes = new Map([...geometry.buildings, ...geometry.places].map((s) => [s.id, s]));
const places = toCampusPlaces(LOCATION_ROWS);

test("rows become buildings, outdoor spaces and venues", () => {
  assert.deepEqual(places.buildings.map((b) => b.id), ["bh", "ccsc", "gym"]); // sorted by name
  assert.deepEqual(places.places.map((p) => p.id), ["quad"]);
  assert.deepEqual(places.venues.map((v) => v.id), ["bookstore", "jack-adams", "nasser-plaza"]);
});

test("a building keeps its code, label, category and OSM shapes", () => {
  assert.deepEqual(places.buildings.find((b) => b.id === "ccsc"), {
    id: "ccsc",
    code: "CCSC",
    name: "Cesar Chavez Student Center",
    mapLabel: "Student Center",
    category: "student-life",
    locationName: "Cesar Chavez Student Center",
    osm: ["r4793449"],
  });
  // No map_label: the label falls back to the name.
  assert.equal(places.buildings.find((b) => b.id === "bh").mapLabel, "Burk Hall");
});

test("venues point to their building's map_id, inside or at it", () => {
  const jack = places.venues.find((v) => v.id === "jack-adams");
  assert.equal(jack.parentId, "ccsc");
  assert.equal(jack.relation, "inside");
  assert.equal(places.venues.find((v) => v.id === "nasser-plaza").relation, "at");
});

test("rows without a map_id, or venues whose building is missing, are left out", () => {
  const all = [...places.buildings, ...places.places, ...places.venues].map((x) => x.locationName);
  assert.ok(!all.includes("Downtown Campus"));
  const orphan = toCampusPlaces([{ id: "x", building_name: "Lost Room", map_id: "lost", parent_id: "gone", osm_ids: [] }]);
  assert.deepEqual(orphan.venues, []);
  assert.deepEqual(toCampusPlaces(null), { buildings: [], places: [], venues: [], categories: [] });
});

test("createCampus finds features and highlights a venue's building", () => {
  const campus = createCampus(places, shapes);
  assert.equal(campus.mapIdFor("jack-adams"), "ccsc");
  assert.equal(campus.mapIdFor("ccsc"), "ccsc");
  const feature = campus.getCampusFeature("jack-adams");
  assert.equal(feature.isVenue, true);
  assert.equal(feature.parent.id, "ccsc");
  assert.equal(typeof feature.parent.latitude, "number");
  assert.equal(campus.getCampusFeature("not-a-place"), null);
});

test("the Find a place menu groups places by location category, in the table's order", () => {
  const { optionGroups } = createCampus(toCampusPlaces(LOCATION_ROWS, LOCATION_CATEGORIES), shapes);
  // Empty categories (Dining) are left out; venues sit in their building's group.
  assert.deepEqual(
    optionGroups.map((g) => [g.label, g.items.map((i) => i.id)]),
    [
      ["Academic", ["bh"]],
      ["Student life", ["bookstore", "ccsc", "jack-adams"]],
      ["Athletics & recreation", ["gym", "nasser-plaza"]],
      ["Outdoor space", ["quad"]],
    ],
  );
});

test("places without a category go under Other places", () => {
  const rows = [...LOCATION_ROWS, { id: "loc-x", building_name: "Mystery Hall", map_id: "mystery", osm_ids: ["w1"] }];
  const { optionGroups } = createCampus(toCampusPlaces(rows, LOCATION_CATEGORIES), shapes);
  assert.deepEqual(optionGroups.at(-1), { label: "Other places", items: [{ id: "mystery", label: "Mystery Hall" }] });
});

test("without categories, the Find a place menu labels venues with their building", () => {
  const { optionGroups } = createCampus(places, shapes);
  assert.deepEqual(optionGroups.map((g) => g.label), ["Buildings", "Outdoor spaces", "Rooms & venues"]);
  assert.ok(optionGroups[2].items.some((i) => i.label === "Jack Adams Hall (inside Cesar Chavez Student Center)"));
  assert.ok(optionGroups[2].items.some((i) => i.label === "Nasser Family Plaza (at Gymnasium)"));
});

test("sample events point to real map shapes", () => {
  for (const event of SAMPLE_EVENTS) {
    assert.ok(shapeIds.has(event.mapId), `${event.id} has unknown mapId "${event.mapId}"`);
    assert.ok(event.endDate >= event.date, `${event.id} ends before it starts`);
  }
  for (const [id, rooms] of Object.entries(SAMPLE_SCANS)) {
    assert.ok(shapeIds.has(id), `SAMPLE_SCANS has unknown id "${id}"`);
    for (const room of rooms) assert.equal(room.id, null, "sample rooms must not point at real scans");
  }
});
