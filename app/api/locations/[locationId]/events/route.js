/*
 * app/api/locations/[locationId]/events/route.js  —  GET /api/locations/:locationId/events
 *
 * PURPOSE:
 * Returns the upcoming events at one location, including events in the
 * rooms/venues inside it, soonest first. Which events count as "upcoming"
 * (published, active, not ended) comes from upcomingEvents() in
 * lib/map/page-data.js, the same rule the Campus Map uses.
 *
 * Response: 200 { events: [...] } (an empty list is still a 200),
 * 404 { error } for an unknown or invalid location id, or 503 { error } if the
 * database is unavailable. Read-only and public: drafts are never returned.
 */

import { createClient } from "@/lib/supabase/server";
import { upcomingEvents } from "@/lib/map/page-data";
export async function GET(request, { params }) {
  const db = await createClient();
  const { locationId } = await params;
  const [{ data: location, error }, { data: venues, error: ve }] =
    await Promise.all([
      db.from("locations").select("id").eq("id", locationId).maybeSingle(),
      db.from("locations").select("id").eq("parent_id", locationId),
    ]);
  if (error || !location)
    return Response.json({ error: "Location not found." }, { status: 404 });
  if (ve)
    return Response.json({ error: "Could not load events." }, { status: 503 });
  // A building's events include the events in the rooms inside it.
  const { data, error: ee } = await upcomingEvents(
    db,
    "*, locations(building_name)",
    [locationId, ...venues.map((v) => v.id)],
  );
  return Response.json(
    ee ? { error: "Could not load events." } : { events: data },
    { status: ee ? 503 : 200 },
  );
}
