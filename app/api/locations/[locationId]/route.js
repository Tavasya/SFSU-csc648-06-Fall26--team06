/*
 * app/api/locations/[locationId]/route.js  —  GET /api/locations/:locationId
 *
 * PURPOSE:
 * Returns one location and the rooms/venues inside it (the rows whose
 * parent_id points to it), e.g. the Cesar Chavez Student Center with
 * Jack Adams Hall, the Bookstore and the Copy Center.
 *
 * Response: 200 { location, venues: [...] }, 404 { error } for an unknown or
 * invalid id, or 503 { error } if the database is unavailable.
 * Read-only and public: no sign-in needed.
 */

import { createClient } from "@/lib/supabase/server";
export async function GET(request, { params }) {
  const db = await createClient();
  const { locationId } = await params;
  const [{ data: location, error }, { data: venues, error: ve }] =
    await Promise.all([
      db.from("locations").select("*").eq("id", locationId).maybeSingle(),
      db
        .from("locations")
        .select("*")
        .eq("parent_id", locationId)
        .order("building_name"),
    ]);
  if (error || !location)
    return Response.json({ error: "Location not found." }, { status: 404 });
  if (ve)
    return Response.json(
      { error: "Could not load this location's rooms." },
      { status: 503 },
    );
  return Response.json({ location, venues });
}
