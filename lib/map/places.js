/*
 * lib/map/places.js
 *
 * PURPOSE:
 * Turns rows from the Supabase "locations" table into the places the 2D
 * Campus Map can select (no React, no Supabase calls). Shared by the server
 * loaders (lib/map/page-data.js), the map components, the map build script
 * (scripts/map/build-map.mjs) and the tests.
 *
 * Every place on campus is one row in "locations":
 *  - buildings and outdoor spaces have their own shapes (osm_ids)
 *  - venues (rooms like Jack Adams Hall) have no shape and point to the
 *    building they are in (parent_id); selecting one highlights that building
 * The shapes themselves are in lib/map/geometry.js, keyed by map_id.
 *
 * Imports use relative paths (not "@/...") so Node can load this file directly.
 */

// The locations columns the map needs.
export const PLACE_COLUMNS =
  "id, building_name, building_code, location_kind, map_id, map_label, map_category, parent_id, osm_ids";

export const NO_PLACES = { buildings: [], places: [], venues: [], categories: [] };

const byName = (a, b) => a.name.localeCompare(b.name);

// Rows from "locations" -> { buildings, places, venues, categories }.
// Rows without a map_id aren't on the map and are left out.
//  - categories: rows from "location_categories" ([{ id, label }], in menu order)
export function toCampusPlaces(rows, categories = []) {
  const mapIds = new Map((rows ?? []).map((row) => [row.id, row.map_id]));
  const result = { buildings: [], places: [], venues: [], categories };

  for (const row of rows ?? []) {
    if (!row.map_id) continue;
    if (row.parent_id) {
      const parentId = mapIds.get(row.parent_id);
      if (!parentId) continue;
      result.venues.push({
        id: row.map_id,
        name: row.building_name,
        parentId,
        // "Nasser Family Plaza (at Gymnasium)" vs "Bookstore (inside Cesar Chavez Student Center)"
        relation: row.location_kind === "outdoor" ? "at" : "inside",
        locationName: row.building_name,
      });
    } else if (row.osm_ids?.length) {
      const place = {
        id: row.map_id,
        code: row.building_code ?? "",
        name: row.building_name,
        mapLabel: row.map_label || row.building_name,
        category: row.map_category ?? null,
        locationName: row.building_name,
        osm: row.osm_ids,
      };
      (row.location_kind === "outdoor" ? result.places : result.buildings).push(place);
    }
  }

  result.buildings.sort(byName);
  result.places.sort(byName);
  result.venues.sort(byName);
  return result;
}

// Lookups the map components use, built once from toCampusPlaces().
//  - shapes: Map of map_id -> { latitude, longitude, ... } from geometry.js
export function createCampus(campusPlaces = NO_PLACES, shapes = new Map()) {
  const { buildings, places, venues, categories = [] } = campusPlaces;
  // Buildings and outdoor spaces (the places with a shape), by map_id.
  const meta = new Map([...buildings, ...places].map((b) => [b.id, b]));
  // Venues by map_id, with the building they belong to.
  const venueMap = new Map(venues.map((v) => [v.id, v]));

  // The map shape to highlight for any id: a venue highlights its building.
  const mapIdFor = (id) => venueMap.get(id)?.parentId ?? id;

  // Map metadata + coordinates for one building, place or venue.
  // Venues come back with `isVenue: true` and their `parent` building.
  function getCampusFeature(id) {
    const venue = venueMap.get(id);
    if (venue) return { ...venue, isVenue: true, parent: getCampusFeature(venue.parentId) };
    const place = meta.get(id);
    const shape = shapes.get(id);
    if (!place || !shape) return null;
    return { ...place, isVenue: false, latitude: shape.latitude, longitude: shape.longitude };
  }

  // The "Find a place" dropdown. Venues include their building in the label
  // so users can tell where a room or facility is.
  const placeOption = (p) => ({ id: p.id, label: p.name });
  const venueOption = (v) => ({
    id: v.id,
    label: `${v.name} (${v.relation} ${meta.get(v.parentId)?.name ?? "campus"})`,
  });

  // Grouped by location category (Academic, Dining, Housing, ...). A venue sits
  // in its building's group, so "Jack Adams Hall" is under Student life.
  // Without categories, group by buildings, outdoor spaces and rooms.
  const categoryOf = (item) => item.category ?? meta.get(item.parentId)?.category ?? null;
  const byLabel = (a, b) => a.label.localeCompare(b.label);
  const optionGroups = categories.length
    ? [...categories, { id: null, label: "Other places" }]
        .map((c) => ({
          label: c.label,
          items: [
            ...[...buildings, ...places].filter((p) => categoryOf(p) === c.id).map(placeOption),
            ...venues.filter((v) => categoryOf(v) === c.id).map(venueOption),
          ].sort(byLabel),
        }))
        .filter((group) => group.items.length > 0)
    : [
        { label: "Buildings", items: buildings.map(placeOption) },
        { label: "Outdoor spaces", items: places.map(placeOption) },
        { label: "Rooms & venues", items: venues.map(venueOption) },
      ];

  return { places: campusPlaces, meta, venueMap, mapIdFor, getCampusFeature, optionGroups };
}
