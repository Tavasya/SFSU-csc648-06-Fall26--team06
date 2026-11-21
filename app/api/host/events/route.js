/**
 * Public interfaces supporting R4.1.
 * @module app/api/host/events/route
 */
import { hostContext, payload, respond, ApiError } from "@/lib/events/api";
import { withEngagement } from "@/lib/events/engagement";
/**
 * Return only the authenticated organizer's events with aggregate engagement counts.
 * @function GET
 * @memberof module:app/api/host/events/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export const GET = respond(async (request) => {
  const { db, user } = await hostContext(request);
  const { data, error } = await db
    .from("events")
    .select("*, locations(building_name)")
    .eq("host_id", user.id)
    .order("start_date_time");
  if (error) throw new ApiError("Could not load events.", 503);
  return { events: await withEngagement(db, data) };
});
/**
 * Validate input and create a private draft owned by the authenticated organizer.
 * @function POST
 * @memberof module:app/api/host/events/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export const POST = respond(async (request) => {
  const { db, user } = await hostContext(request);
  const values = await payload(db, user, await request.json());
  const { data, error } = await db
    .from("events")
    .insert({ ...values, host_id: user.id })
    .select()
    .single();
  if (error) throw new ApiError("Could not save your draft.", 503);
  return { event: data };
});
