#!/usr/bin/env node
/*
 * Generates lib/map/geometry.js from OpenStreetMap data for the SFSU campus map.
 * Run from the repository root:
 *
 *   node scripts/map/build-map.mjs .cache/sfsu.osm
 *
 * This file contains map shapes, roads, paths, labels, and building
 * coordinates used by the interactive campus map.
 * Map data © OpenStreetMap contributors, licensed under the ODbL.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILDINGS, PLACES, NOT_BUILDINGS } from "../../lib/map/buildings.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/map/build-map.mjs <file.osm>");
  process.exit(1);
}

// Main campus frame
const FRAME = { south: 37.7193, north: 37.7297, west: -122.4858, east: -122.4744 };
const CAMPUS_BOUNDARY = "w28965902";

// ---------- Parse OSM XML ----------

const xml = fs.readFileSync(input, "utf8");
const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const readTags = (body) => {
  const tags = {};
  for (const m of body.matchAll(/<tag k="([^"]*)" v="([^"]*)"\s*\/>/g)) tags[decode(m[1])] = decode(m[2]);
  return tags;
};

const nodes = new Map();
for (const m of xml.matchAll(/<node id="(\d+)"[^>]*?lat="([-\d.]+)" lon="([-\d.]+)"/g)) {
  nodes.set(m[1], [Number(m[3]), Number(m[2])]); // [lon, lat]
}
const ways = new Map();
for (const m of xml.matchAll(/<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
  const refs = [...m[2].matchAll(/<nd ref="(\d+)"\/>/g)].map((n) => n[1]);
  ways.set(m[1], { refs, tags: readTags(m[2]) });
}
const relations = new Map();
for (const m of xml.matchAll(/<relation id="(\d+)"[^>]*>([\s\S]*?)<\/relation>/g)) {
  const members = [...m[2].matchAll(/<member type="(\w+)" ref="(\d+)" role="([^"]*)"\/>/g)]
    .map((x) => ({ type: x[1], ref: x[2], role: x[3] }));
  relations.set(m[1], { members, tags: readTags(m[2]) });
}

// ---------- Geometry helpers ----------

// Equirectangular projection in metres; fine for a 1 km area.
const LAT0 = (FRAME.north + FRAME.south) / 2;
const MX = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const MY = 110574;
const project = ([lon, lat]) => [(lon - FRAME.west) * MX, (FRAME.north - lat) * MY];
const WIDTH = Math.round((FRAME.east - FRAME.west) * MX);
const HEIGHT = Math.round((FRAME.north - FRAME.south) * MY);

const wayCoords = (id) => {
  const w = ways.get(id);
  if (!w) return null;
  const pts = w.refs.map((r) => nodes.get(r));
  return pts.every(Boolean) ? pts : null;
};

// Joins the outer (or inner) members of a multipolygon into closed rings.
function joinRings(segments) {
  const rings = [];
  const pending = segments.filter((s) => s && s.length > 1).map((s) => [...s]);
  while (pending.length) {
    let ring = pending.shift();
    let grew = true;
    while (ring[0] !== ring[ring.length - 1] && grew) {
      grew = false;
      for (let i = 0; i < pending.length; i++) {
        const s = pending[i];
        const end = ring[ring.length - 1];
        if (s[0] === end) ring = ring.concat(s.slice(1));
        else if (s[s.length - 1] === end) ring = ring.concat(s.slice(0, -1).reverse());
        else continue;
        pending.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}

// Returns the outer and inner rings for an OSM node, way, or relation
// { outer: [[lon,lat]...][], inner: [...] } for "w123" / "r123".
function areaRings(ref) {
  const id = ref.slice(1);
  // "n123" = a single OSM point (e.g. a plaque). Drawn as a 14 m circle so it
  // can still be clicked like any other place.
  if (ref[0] === "n") {
    const node = nodes.get(id);
    if (!node) return null;
    const [lon, lat] = node;
    const ring = Array.from({ length: 21 }, (_, i) => {
      const a = (i / 20) * 2 * Math.PI;
      return [lon + (14 * Math.cos(a)) / MX, lat + (14 * Math.sin(a)) / MY];
    });
    return { outer: [ring], inner: [] };
  }
  if (ref[0] === "w") {
    const c = wayCoords(id);
    return c ? { outer: [c], inner: [] } : null;
  }
  const rel = relations.get(id);
  if (!rel) return null;
  const pick = (role) =>
    joinRings(rel.members.filter((m) => m.type === "way" && (m.role || "outer") === role)
      .map((m) => wayCoords(m.ref)));
  return { outer: pick("outer"), inner: pick("inner") };
}

// Simplify a path using Douglas-Peucker algorithm.
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// Convert GPS coordinates into an SVG path.
const fmt = (n) => (Math.round(n * 10) / 10).toString();
function toPath(lonlats, tol, closed) {
  const projected = lonlats.map(project);
  // A closed ring starts and ends on the same point, so simplify it in two halves.
  const mid = Math.floor(projected.length / 2);
  let pts = closed
    ? [...simplify(projected.slice(0, mid + 1), tol).slice(0, -1), ...simplify(projected.slice(mid), tol)]
    : simplify(projected, tol);
  if (closed && pts.length < 4) return "";
  if (!closed && pts.length < 2) return "";
  if (closed) pts = pts.slice(0, -1);
  return "M" + pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L") + (closed ? "Z" : "");
}
const ringsToPath = (r, tol) =>
  r ? [...r.outer, ...r.inner].map((ring) => toPath(ring, tol, true)).join("") : "";

const inFrame = ([lon, lat], pad = 0) =>
  lon >= FRAME.west - pad && lon <= FRAME.east + pad && lat >= FRAME.south - pad && lat <= FRAME.north + pad;
const touchesFrame = (pts) => pts && pts.some((p) => inFrame(p, 0.0004));

// Calculate an area-weighted centroid of the outer rings. 
function centroid(ringList) {
  let A = 0, cx = 0, cy = 0;
  for (const ring of ringList) {
    if (ring.length < 3) continue;
    const [ox, oy] = ring[0];
    let a = 0, rx = 0, ry = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      const ax = x1 - ox, ay = y1 - oy, bx = x2 - ox, by = y2 - oy;
      const f = ax * by - bx * ay;
      a += f; rx += (ax + bx) * f; ry += (ay + by) * f;
    }
    if (!a) continue;
    const w = Math.abs(a);
    A += w; cx += (ox + rx / (3 * a)) * w; cy += (oy + ry / (3 * a)) * w;
  }
  if (!A) return ringList[0][0];
  return [cx / A, cy / A];
}

// A label/coordinate point guaranteed to be inside the shape: the centroid if
// it is inside, otherwise the inside grid point closest to it (the centroid of
// a U- or L-shaped building can fall outside the building).
function labelPoint(ringList) {
  const c = centroid(ringList);
  const inside = (p) => ringList.some((r) => pointInRing(p, r));
  if (inside(c)) return c;
  const pts = ringList.flat();
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let best = c, bestD = Infinity;
  for (let i = 1; i < 40; i++) {
    for (let j = 1; j < 40; j++) {
      const p = [x0 + ((x1 - x0) * i) / 40, y0 + ((y1 - y0) * j) / 40];
      const d = ((p[0] - c[0]) * MX) ** 2 + ((p[1] - c[1]) * MY) ** 2; // metres²
      if (d < bestD && inside(p)) { best = p; bestD = d; }
    }
  }
  return best;
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------- Classify features into layers ----------

const boundary = areaRings(CAMPUS_BOUNDARY).outer[0];
const claimed = new Set([...NOT_BUILDINGS, ...[...BUILDINGS, ...PLACES].flatMap((b) => b.osm)]);

// Every element that is an area: ways that close and multipolygon relations.
const areas = [];
for (const [id, w] of ways) if (w.refs.length > 3 && w.refs[0] === w.refs[w.refs.length - 1]) areas.push(["w" + id, w.tags]);
for (const [id, r] of relations) if (r.tags.type === "multipolygon") areas.push(["r" + id, r.tags]);

const GREEN = (t) =>
  ["grass", "meadow", "village_green", "recreation_ground", "allotments"].includes(t.landuse) ||
  ["garden", "park", "common", "dog_park", "playground"].includes(t.leisure) ||
  ["wood", "heath", "grassland", "scrub"].includes(t.natural) || t.leisure === "golf_course";
const SPORT = (t) => ["pitch", "track", "stadium", "sports_centre"].includes(t.leisure);
const PLAZA = (t) => (t.highway === "pedestrian" && t.area === "yes") || t.place === "square";
const SKIP_BUILDING = new Set(["carport", "roof", "staircase"]);

const layer = { campus: "", green: [], sport: [], plaza: [], water: [], context: [], offCampus: [] };
layer.campus = toPath(boundary, 1, true);

for (const [ref, tags] of areas) {
  if (claimed.has(ref) || ref === CAMPUS_BOUNDARY) continue;
  const r = areaRings(ref);
  if (!r || !r.outer.length || !r.outer.some(touchesFrame)) continue;
  const c = centroid(r.outer);
  const onCampus = pointInRing(c, boundary);
  if (tags.building && !tags["building:part"]) {
    if (SKIP_BUILDING.has(tags.building) || !inFrame(c)) continue;
    (onCampus ? layer.context : layer.offCampus).push(ringsToPath(r, 0.5));
  } else if (tags.natural === "water") layer.water.push(ringsToPath(r, 1.5));
  // Off-campus parks, school fields and golf course are left out to keep focus.
  else if (!onCampus) continue;
  else if (SPORT(tags)) layer.sport.push(ringsToPath(r, 1));
  else if (PLAZA(tags)) layer.plaza.push(ringsToPath(r, 1));
  else if (GREEN(tags)) layer.green.push(ringsToPath(r, 1.2));
}

// Linear features. Sidewalks, crossings, indoor corridors, parking aisles and
// driveways are dropped to keep the map readable.
const ROAD_CLASS = {
  trunk: "major", trunk_link: "major", primary: "major", secondary: "major", secondary_link: "major",
  tertiary: "street", tertiary_link: "street", residential: "street", unclassified: "street",
  service: "service",
  footway: "path", path: "path", pedestrian: "path", cycleway: "path", steps: "path",
};
const lines = { major: [], street: [], service: [], path: [] };
const streetSegments = new Map(); // name -> [{ pts }]
for (const [id, w] of ways) {
  const t = w.tags;
  const cls = ROAD_CLASS[t.highway];
  if (!cls || t.area === "yes" || t.indoor === "yes") continue;
  if (["sidewalk", "crossing"].includes(t.footway)) continue;
  if (["parking_aisle", "driveway", "drive-through"].includes(t.service)) continue;
  if (t.tunnel === "yes" || (t.level && Number(t.level) < 0)) continue;
  const c = wayCoords(id);
  if (!touchesFrame(c)) continue;
  const d = toPath(c, cls === "path" ? 0.8 : 1, false);
  if (d) lines[cls].push(d);
  if (t.name && (cls === "major" || cls === "street")) {
    if (!streetSegments.has(t.name)) streetSegments.set(t.name, []);
    streetSegments.get(t.name).push(c.map(project));
  }
}

// Street labels: placed on the longest in-frame run of each named street.
const LABELLED_STREETS = ["19th Avenue", "Holloway Avenue", "Lake Merced Boulevard", "Font Boulevard", "State Drive", "Buckingham Way", "Winston Drive", "North State Drive"];
const labels = [];
for (const name of LABELLED_STREETS) {
  const segs = streetSegments.get(name);
  if (!segs) continue;
  let best = null;
  for (const pts of segs) {
    const inside = pts.filter(([x, y]) => x > 40 && x < WIDTH - 40 && y > 40 && y < HEIGHT - 40);
    let len = 0;
    for (let i = 1; i < inside.length; i++) len += Math.hypot(inside[i][0] - inside[i - 1][0], inside[i][1] - inside[i - 1][1]);
    if (inside.length > 1 && (!best || len > best.len)) best = { len, pts: inside };
  }
  if (!best || best.len < 120) continue;
  // Midpoint along the run, angle of the local segment.
  let acc = 0, half = best.len / 2;
  for (let i = 1; i < best.pts.length; i++) {
    const [x1, y1] = best.pts[i - 1], [x2, y2] = best.pts[i];
    const seg = Math.hypot(x2 - x1, y2 - y1);
    if (acc + seg >= half) {
      const k = (half - acc) / seg;
      let angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
      labels.push({ text: name.replace("Avenue", "Ave").replace("Boulevard", "Blvd").replace("Drive", "Dr"), x: +fmt(x1 + (x2 - x1) * k), y: +fmt(y1 + (y2 - y1) * k), angle: Math.round(angle) });
      break;
    }
    acc += seg;
  }
}

// ---------- Interactive features ----------

const missing = [];
function buildFeature(item) {
  const rings = item.osm.map((ref) => {
    const r = areaRings(ref);
    if (!r || !r.outer.length) missing.push(`${item.id}: ${ref}`);
    return r;
  }).filter(Boolean);
  if (!rings.length) return null;
  const outer = rings.flatMap((r) => r.outer);
  const [lon, lat] = labelPoint(outer); 
  const [x, y] = project([lon, lat]);
  return {
    id: item.id,
    d: rings.map((r) => ringsToPath(r, 0.5)).join(""),
    latitude: +lat.toFixed(6),
    longitude: +lon.toFixed(6),
    labelX: +fmt(x),
    labelY: +fmt(y),
  };
}
const buildings = BUILDINGS.map(buildFeature).filter(Boolean);
const places = PLACES.map(buildFeature).filter(Boolean);

const join = (arr) => arr.filter(Boolean).join("");
const geometry = {
  attribution: "© OpenStreetMap contributors (ODbL)",
  source: "https://www.openstreetmap.org/copyright",
  generatedAt: new Date().toISOString().slice(0, 10),
  frame: FRAME,
  width: WIDTH,
  height: HEIGHT,
  layers: {
    campus: layer.campus,
    green: join(layer.green),
    sport: join(layer.sport),
    plaza: join(layer.plaza),
    water: join(layer.water),
    roadsMajor: join(lines.major),
    roadsStreet: join(lines.street),
    roadsService: join(lines.service),
    paths: join(lines.path),
    contextBuildings: join(layer.context),
    offCampusBuildings: join(layer.offCampus),
  },
  labels,
  places,
  buildings,
};

const banner = `/*
 * GENERATED by scripts/map/build-map.mjs. Do not edit manually.
 * Contains the shapes, labels, and coordinates used by the campus map.
 * Map data © OpenStreetMap contributors, licensed under the ODbL.
 */`;
fs.mkdirSync(path.join(ROOT, "lib/map"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "lib/map/geometry.js"),
  `${banner}\n\nconst geometry = ${JSON.stringify(geometry)};\n\nexport default geometry;\n\n`,
);

console.log(`Frame ${WIDTH} x ${HEIGHT} m`);
console.log(`Buildings: ${buildings.length}/${BUILDINGS.length} linked, ${layer.context.length} other campus, ${layer.offCampus.length} off campus`);
console.log(`Places: ${places.length}/${PLACES.length}; street labels: ${labels.map((l) => l.text).join(", ")}`);
console.log(`geometry.js ${(JSON.stringify(geometry).length / 1024).toFixed(0)} KB`);
if (missing.length) console.warn("Missing OSM elements:", missing.join("; "));
