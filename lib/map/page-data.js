/*
 * lib/map/page-data.js
 *
 * PURPOSE:
 * Loads and prepares event data from Supabase for the Interactive 2D Campus Map.
 * This file acts as the bridge between our database and the map UI: it retrieves
 * real events, connects them to map locations, and formats their data so the page can display it.
 * The formatting itself lives in lib/map/events.js so it can be tested on its own.
 *
 */

import { createClient } from "@/lib/supabase/server";
import { buildLocationLookup, buildScanIndex, toMapEvent } from "@/lib/map/events";
import { PLACE_COLUMNS, toCampusPlaces } from "@/lib/map/places";

// The buildings, outdoor spaces and venues on the map, from the "locations"
// table, and their groups (Academic, Dining, ...) from "location_categories":
// { buildings, places, venues, categories } (see lib/map/places.js).
export async function loadCampusPlaces(db) {
  const [locationsResult, categoriesResult] = await Promise.all([
    db.from("locations").select(PLACE_COLUMNS).not("map_id", "is", null),
    db.from("location_categories").select("id, label").order("sort_order"),
  ]);
  if (locationsResult.error) throw new Error("Could not load campus map places.");
  // The groups are optional: without them the "Find a place" menu groups by
  // buildings, outdoor spaces and rooms instead.
  return toCampusPlaces(locationsResult.data, categoriesResult.data ?? []);
}

// Event columns the map needs: the list view uses the first line,
// the event detail view in the side panel uses the rest.
const EVENT_COLUMNS = [
  "id, title, start_date_time, end_date_time, room_number, category_ids",
  "description, audience, admission_type, capacity, rsvp_required",
  "wheelchair_accessible, asl_available, contact_email, cover_path",
  "location:locations(building_name, description)",
].join(", ");

// Cover images are private files in the "event-covers" storage bucket.
// A signed URL is a temporary link (1 hour) the browser can load.
// Covers are optional, so if this fails the events simply show no cover.
async function loadCoverUrls(db, rows) {
  const paths = rows.map((row) => row.cover_path).filter(Boolean);
  if (paths.length === 0) return new Map();
  const { data, error } = await db.storage.from("event-covers").createSignedUrls(paths, 3600);
  if (error) return new Map();
  return new Map(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

// Scanned 3D rooms per map building ({ [mapId]: [{ id, name, scanDate, venueId }] }),
// from the "rooms" table. rooms.location_id links each room to its building.
// If that link doesn't exist yet (or the query fails), there are simply no
// 3D rooms: the map and event pages keep working without them.
//  - lookup: result of buildLocationLookup(), so each room finds its map building
export async function loadRoomScans(db, lookup) {
  const { data, error } = await db
    .from("rooms")
    .select("id, room_name, scan_date, location:locations(building_name)")
    .eq("has_3d_view", true)
    .order("room_name");
  if (error) {
    console.warn("3D rooms unavailable:", error.message);
    return {};
  }
  return buildScanIndex(data, lookup);
}

// The events students can see: published, active and not ended yet, soonest first.
// One rule shared by the Campus Map (loadMapEvents below) and
// GET /api/locations/[locationId]/events, so they always agree.
//  - columns:     the events columns to select
//  - locationIds: only events at these locations (optional)
// Returns the Supabase query; `await` it for { data, error }.
export function upcomingEvents(db, columns, locationIds = null) {
  let query = db
    .from("events")
    .select(columns)
    .eq("publication_status", "published")
    .eq("status", "active")
    .gte("end_date_time", new Date().toISOString())
    .order("start_date_time");
  if (locationIds) query = query.in("location_id", locationIds);
  return query;
}

// Returns { places, events, unmatched, scans }.
export async function loadMapEvents() {
  const db = await createClient();
  const places = await loadCampusPlaces(db);

  // A lookup table so each event can find its location on the map.
  // The key is the database's building_name. The value tells the UI which map shape to select.
  // For the rooms, the value also tells the UI which venue it belongs to.
  const lookup = buildLocationLookup(places);

  // Fetch events, category names and 3D rooms at the same time with Promise.all
  const [eventsResult, categoriesResult, scans] = await Promise.all([
    upcomingEvents(db, EVENT_COLUMNS),
    db.from("categories").select("id, name"),
    loadRoomScans(db, lookup),
  ]);

  if (eventsResult.error || categoriesResult.error) {
    throw new Error("Could not load campus map events.");
  }

  // Create a lookup table that connects each category ID to its name.
  // Events store category IDs (ex: [1,3]), but the map needs readable category names (ex: ["Career", "Networking"]) to display as tags
  const categoryNames = new Map(categoriesResult.data.map((c) => [c.id, c.name]));
  const coverUrls = await loadCoverUrls(db, eventsResult.data);

  const events = [];
  const unmatched = [];

  // Converts each event from Supabase into the format the campus map needs, then puts it into the appropriate list.
  // Events with a matching map location go into 'events'.
  // Those without a match go into 'unmatched' so they can be identified rather than silently excluded.
  for (const row of eventsResult.data) {
    const { event, matched } = toMapEvent(row, { categoryNames, lookup, coverUrls });
    (matched ? events : unmatched).push(event);
  }

  // Return the lists so that the page can use mapped events and handle locations that have not yet been added to the map.
  return { places, events, unmatched, scans };
}
