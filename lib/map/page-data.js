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

// Builds a lookup table once so that each event can find its location on the map.
// The key is the database's building_name. The value tells the UI which map shape to select.
// For the rooms, the value also tells the UI which venue it belongs to.
const MAP_LOOKUP = buildLocationLookup();

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

export async function loadMapEvents() {
  const db = await createClient();

  // Fetch events, category names and 3D-scan locations at the same time with Promise.all
  const [eventsResult, categoriesResult, scansResult] = await Promise.all([
    db
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("publication_status", "published")
      .eq("status", "active")
      .gte("end_date_time", new Date().toISOString())
      .order("start_date_time"),
    db.from("categories").select("id, name"),
    db.from("locations").select("building_name").eq("has_3d_view", true),
  ]);

  if (eventsResult.error || categoriesResult.error || scansResult.error) {
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
    const { event, matched } = toMapEvent(row, { categoryNames, lookup: MAP_LOOKUP, coverUrls });
    (matched ? events : unmatched).push(event);
  }

  // Buildings with a 3D room scan ({ [mapId]: ["room name"] }), from locations.has_3d_view.
  // Empty until scans are uploaded and those locations are marked in Supabase.
  const scans = buildScanIndex(scansResult.data, MAP_LOOKUP);

  // Return the lists so that the page can use mapped events and handle locations that have not yet been added to the map.
  return { events, unmatched, scans };
}
