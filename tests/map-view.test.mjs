// R6.5 Map Navigation: pan and zoom limits for the 2D Campus Map
// (lib/map/view.js), and R6.6 / R7.3 links between the map and 3D views
// (lib/rooms/model.js).
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_ZOOM, clampView, fullView, keyPan, zoomAround, zoomLevel } from "../lib/map/view.js";
import { mapReturnHref, roomViewHref, viewerErrorMessage } from "../lib/rooms/model.js";

// A 1000 x 600 map shown in a card twice as wide as it is tall (aspect 0.5).
const W = 1000, H = 600, A = 0.5;
const clamp = (v) => clampView(v, A, W, H);

test("fullView shows the whole campus, centered", () => {
  assert.deepEqual(fullView(A, W, H), { x: -100, y: 0, w: 1200, h: 600 });
  assert.deepEqual(fullView(0.6, W, H), { x: 0, y: 0, w: 1000, h: 600 });
  assert.equal(zoomLevel(fullView(A, W, H), A, W, H), 1);
});

test("zoom stays between the whole campus and MAX_ZOOM", () => {
  assert.equal(clamp({ x: 0, y: 0, w: 5000 }).w, 1200, "can't zoom out past the whole campus");
  assert.equal(clamp({ x: 0, y: 0, w: 10 }).w, W / MAX_ZOOM, "can't zoom in past 6x");
  assert.equal(zoomLevel(clamp({ x: 0, y: 0, w: 1 }), A, W, H), 1200 / (W / MAX_ZOOM));
});

test("panning can't move the campus out of view", () => {
  assert.deepEqual(clamp({ x: -500, y: -500, w: 400 }), { w: 400, h: 200, x: 0, y: 0 });
  assert.deepEqual(clamp({ x: 5000, y: 5000, w: 400 }), { w: 400, h: 200, x: 600, y: 400 });
  assert.deepEqual(clamp({ x: 100, y: 100, w: 400 }), { w: 400, h: 200, x: 100, y: 100 });
});

test("zooming keeps the point under the cursor in place", () => {
  const start = { x: 0, y: 0, w: 1000, h: 500 };
  const zoomed = zoomAround(start, 0.5, 500, 250, clamp);
  assert.deepEqual(zoomed, { w: 500, h: 250, x: 250, y: 125 });
  const cornerZoom = zoomAround(start, 0.5, 0, 0, clamp);
  assert.deepEqual([cornerZoom.x, cornerZoom.y], [0, 0]);
  assert.equal(zoomAround(zoomed, 100, 500, 250, clamp).w, 1200, "zooming out stops at the whole campus");
});

test("arrow keys pan by a tenth of the view; other keys do nothing", () => {
  assert.deepEqual(keyPan("ArrowLeft", 400), [-40, 0]);
  assert.deepEqual(keyPan("ArrowRight", 400), [40, 0]);
  assert.deepEqual(keyPan("ArrowUp", 400), [0, -40]);
  assert.deepEqual(keyPan("ArrowDown", 400), [0, 40]);
  assert.equal(keyPan("Enter", 400), null);
});

test("R6.6 / R7.1 a map room opens the right 3D viewer", () => {
  assert.equal(roomViewHref({ id: "r1", modelPath: "scan.spz" }), "/rooms/r1/splat");
  assert.equal(roomViewHref({ id: "r2", modelPath: "scan.glb" }), "/rooms/r2/3d");
});

test("R7.3 'Back to map' returns to the room's building, or the whole map", () => {
  assert.equal(mapReturnHref({ mapId: "ccsc" }), "/map?place=ccsc");
  assert.equal(mapReturnHref({ map_id: "jack adams" }), "/map?place=jack%20adams");
  assert.equal(mapReturnHref({}), "/map");
  assert.equal(mapReturnHref(null), "/map");
});

test("R7.3 a 3D scan that fails to load explains what to do next", () => {
  assert.match(viewerErrorMessage(404), /isn't available.*Campus Map/);
  assert.match(viewerErrorMessage(500), /couldn't load.*try again.*Campus Map/);
  assert.match(viewerErrorMessage(), /couldn't load/);
});
