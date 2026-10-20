/*
 * app/api/locations/route.js  —  GET /api/locations
 *
 * PURPOSE:
 * Returns every campus location from the Supabase "locations" table, A-Z:
 * buildings, outdoor spaces and the rooms/venues inside buildings, including
 * the Campus Map columns (map_id, map_label, map_category, parent_id, osm_ids).
 *
 * Response: 200 { locations: [...] }, or 503 { error } if the database is unavailable.
 * Read-only and public: no sign-in needed (locations are reference data).
 */

import { createClient } from "@/lib/supabase/server";
export async function GET() {
  const db = await createClient();
  const { data, error } = await db
    .from("locations")
    .select("*")
    .order("building_name");
  return Response.json(
    error ? { error: "Could not load locations." } : { locations: data },
    { status: error ? 503 : 200 },
  );
}
