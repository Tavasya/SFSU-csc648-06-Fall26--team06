/**
 * Public interfaces supporting R2.1.
 * @module app/api/events/route
 */
import { createClient } from "@/lib/supabase/server";
/**
 * Return published active events ordered by start time; return 503 on a database error.
 * @function GET
 * @memberof module:app/api/events/route
 * @static
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export async function GET() {
  const db = await createClient();
  const { data, error } = await db
    .from("events")
    .select("*, locations(building_name)")
    .eq("publication_status", "published")
    .eq("status", "active")
    .order("start_date_time");
  return Response.json(
    error ? { error: "Could not load events." } : { events: data },
    { status: error ? 503 : 200 },
  );
}
