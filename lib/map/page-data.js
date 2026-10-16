/*
 * lib/map/page-data.js
 *
 * PURPOSE: 
 * Loads and prepares event data from Supabase for the Interactive 2D Campus Map.
 * This file acts as the bridge between our database and the map UI: it retrieves 
 * real events, connects them to map locations, and formats their data so the page can display it.
 * 
 */

import { createClient } from "@/lib/supabase/server";
import { BUILDINGS, PLACES, VENUES } from "@/lib/map/buildings";

const TIME_ZONE = "America/Los_Angeles";

// Builds a lookup table once so that each event can find its location on the map.
// The key is the database's building_name. The value tells the UI which map shape to select.
// For the rooms, the value tells the UI which venue it belongs to. 
// BUILDINGS and PLACES map directly to their own shapes. 
// VENUES instead point to their parent building because a room is not represented
// by a seperate shape on the 2D map. 
const MAP_LOOKUP = new Map([
  ...[...BUILDINGS, ...PLACES]
    .filter((b) => b.locationName)
    .map((b) => [b.locationName, { mapId: b.id, venueId: null }]),
  ...VENUES.map((v) => [v.locationName, { mapId: v.parentId, venueId: v.id }]),
]);

// Ensures a consistent date format (YYYY-MM-DD) is used for event dates. 
const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Formats start and end times for display in Pacific time. 
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

export async function loadMapEvents() {
  const db = await createClient();

  // Fetch events and category names at the same time with Promise.all
  const [eventsResult, categoriesResult] = await Promise.all([
    db
      .from("events")
      .select(
        "id, title, start_date_time, end_date_time, room_number, category_ids, location:locations(building_name, has_3d_view)",
      )
      .eq("publication_status", "published")
      .eq("status", "active")
      .gte("end_date_time", new Date().toISOString())
      .order("start_date_time"),
    db.from("categories").select("id, name"),
  ]);

  if (eventsResult.error || categoriesResult.error) {
    throw new Error("Could not load campus map events.");
  }

  // Create a lookup table that connects each category ID to its name.
  // Events store category IDs (ex: [1,3]), but the map needs readable category names (ex: ["Career", "Networking"]) to display as tags
  const categoryNames = new Map(categoriesResult.data.map((c) => [c.id, c.name]));

  const events = [];
  const unmatched = [];

  // Processes each event from Supabase and converts it into the format the campus map needs. 
  // This includes formatting dates/times, converting category IDs into readable tags, 
  // and finding the corresponding map location. 
  for (const row of eventsResult.data) {
    const buildingName = row.location?.building_name ?? null;
    const place = MAP_LOOKUP.get(buildingName);
    const start = new Date(row.start_date_time);
    const end = new Date(row.end_date_time);

    const event = {
      id: row.id,
      title: row.title,
      date: dateFormat.format(start),
      endDate: dateFormat.format(end),
      startTime: timeFormat.format(start),
      endTime: timeFormat.format(end),
      tags: (row.category_ids ?? []).map((id) => categoryNames.get(id)).filter(Boolean),
      rsvpCount: null, // no RSVP table yet
      roomNumber: row.room_number || "",
      locationName: buildingName,
      has3D: Boolean(row.location?.has_3d_view),
      mapId: place?.mapId ?? null,
      venueId: place?.venueId ?? null,
    };
    // Put each event into its appropriate list. Events with a matching map location go into 'events'. 
    // Those without a match go into 'unmatched' so they can be identified rather than silently excluded.
    (place ? events : unmatched).push(event);
  }

  // Return both lists so that the page can use mapped events and handle locations that have not yet been added to the map.
  return { events, unmatched };
}
