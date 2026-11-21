/**
 * Public interfaces supporting R3.1.
 * @module app/api/events/eventId/route
 */
import { createClient } from "@/lib/supabase/server";
/**
 * Return a published event by ID or a 404 error when it cannot be found.
 * @function GET
 * @memberof module:app/api/events/eventId/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @param {Object} options - Grouped function options.
 * @param {Promise<Object>} options.params - Promise resolving the dynamic route parameters.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export async function GET(request, { params }) {
  const db = await createClient();
  const { data, error } = await db
    .from("events")
    .select("*, locations(building_name)")
    .eq("id", (await params).eventId)
    .eq("publication_status", "published")
    .maybeSingle();
  return Response.json(
    error || !data ? { error: "Event not found." } : { event: data },
    { status: error || !data ? 404 : 200 },
  );
}
