/**
 * Public interfaces supporting R4.3.
 * @module app/api/host/events/eventId/publish/route
 */
import {
  hostContext,
  payload,
  ownedEvent,
  respond,
  ApiError,
} from "@/lib/events/api";
/**
 * Validate an owned draft and publish it for student discovery.
 * @function POST
 * @memberof module:app/api/host/events/eventId/publish/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @param {Object} options - Grouped function options.
 * @param {Promise<Object>} options.params - Promise resolving the dynamic route parameters.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export const POST = respond(async (request, { params }) => {
  const { db, user } = await hostContext(request);
  const { eventId } = await params;
  const event = await ownedEvent(db, user, eventId);
  await payload(db, user, event);
  const { data, error } = await db
    .from("events")
    .update({
      publication_status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("host_id", user.id)
    .select()
    .single();
  if (error) throw new ApiError("Could not publish the event.", 503);
  return { event: data };
});
