// Tests for choosing the 3D viewer from a room's scan file (lib/rooms/model.js)
// and for the splat viewer's starting camera (lib/rooms/splat-view.js).
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { isSplatModel, roomModelUrl, roomViewHref } from "../lib/rooms/model.js";
import { startView } from "../lib/rooms/splat-view.js";

test("only .spz files are splats; .glb and missing files stay on Unity", () => {
  assert.equal(isSplatModel("leake_street_arches.spz"), true);
  assert.equal(isSplatModel("Scans/Gallery.SPZ"), true);
  assert.equal(isSplatModel("science_213.glb"), false);
  assert.equal(isSplatModel("cesar_rigoberta_menchu_hall_f1.glb"), false);
  assert.equal(isSplatModel(null), false);
  assert.equal(isSplatModel(undefined), false);
});

test("roomModelUrl links to the public rooms bucket", () => {
  assert.equal(
    roomModelUrl("https://abc.supabase.co/", "leake_street_arches.spz"),
    "https://abc.supabase.co/storage/v1/object/public/rooms/leake_street_arches.spz",
  );
  assert.equal(
    roomModelUrl("https://abc.supabase.co", "fine arts/gallery #1.spz"),
    "https://abc.supabase.co/storage/v1/object/public/rooms/fine%20arts/gallery%20%231.spz",
  );
  assert.equal(roomModelUrl("", "a.spz"), null);
  assert.equal(roomModelUrl("https://abc.supabase.co", null), null);
});

test("Full 3D view goes to the splat page for .spz and the Unity page otherwise", () => {
  assert.equal(roomViewHref({ id: 3, modelPath: "leake_street_arches.spz" }), "/rooms/3/splat");
  assert.equal(roomViewHref({ id: 2, modelPath: "science_213.glb" }), "/rooms/2/3d");
  assert.equal(roomViewHref({ id: 1 }), "/rooms/1/3d"); // older data without modelPath
});

test("startView starts at one end of a diagonal hallway, looking along it", () => {
  // A 20 x 2 hallway running diagonally (45 degrees) in x/z, floor to ceiling y 0..3.
  const points = [];
  for (let t = -10; t <= 10; t += 0.5)
    for (let w = -1; w <= 1; w += 0.5)
      for (const y of [0, 1.5, 3]) points.push([(t - w) / Math.SQRT2, y, (t + w) / Math.SQRT2]);

  const view = startView(points);
  const [px, py, pz] = view.position;
  const [tx, , tz] = view.target;
  // Looking along the hallway: the view direction is (about) the diagonal.
  const len = Math.hypot(tx - px, tz - pz);
  assert.ok(Math.abs(Math.abs((tx - px) / len) - Math.SQRT1_2) < 0.01);
  assert.ok(Math.abs(Math.abs((tz - pz) / len) - Math.SQRT1_2) < 0.01);
  // Inside the hallway: near its center line and before its end.
  assert.ok(Math.abs(px - pz) / Math.SQRT2 < 0.5);
  assert.ok(Math.hypot(px, pz) < 10);
  assert.equal(py, 1.5); // middle height
  assert.equal(startView([]), null);
});
