/**
 * Public interfaces supporting R4.3.
 * @module app/api/host/events/eventId/route
 */
import {
  hostContext,
  payload,
  ownedEvent,
  respond,
  ApiError,
} from "@/lib/events/api";
/**
 * Return an event only when it belongs to the authenticated organizer.
 * @function GET
 * @memberof module:app/api/host/events/eventId/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @param {Object} options - Grouped function options.
 * @param {Promise<Object>} options.params - Promise resolving the dynamic route parameters.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export const GET = respond(async (request, { params }) => {
  const { db, user } = await hostContext(request);
  return { event: await ownedEvent(db, user, (await params).eventId) };
});
/**
 * Validate and update an event owned by the authenticated organizer.
 * @function PATCH
 * @memberof module:app/api/host/events/eventId/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @param {Object} options - Grouped function options.
 * @param {Promise<Object>} options.params - Promise resolving the dynamic route parameters.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export const PATCH = respond(async (request, { params }) => {
  const { db, user } = await hostContext(request);
  const { eventId } = await params;
  await ownedEvent(db, user, eventId);
  const values = await payload(db, user, await request.json());
  const { data, error } = await db
    .from("events")
    .update(values)
    .eq("id", eventId)
    .eq("host_id", user.id)
    .select()
    .single();
  if (error) throw new ApiError("Could not save your changes.", 503);
  return { event: data };
});
/**
 * Delete an event owned by the authenticated organizer.
 * @function DELETE
 * @memberof module:app/api/host/events/eventId/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @param {Object} options - Grouped function options.
 * @param {Promise<Object>} options.params - Promise resolving the dynamic route parameters.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export const DELETE = respond(async (request, { params }) => {
  const { db, user } = await hostContext(request);
  const { eventId } = await params;

  const event = await ownedEvent(db, user, eventId);

  // Published events will be cancelled, not permanently deleted
  if (event.publication_status !== "draft") {
    throw new ApiError(
      "Published events cannot be deleted. Cancel the event instead.",
      409
    );
  }

  const { error } = await db
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("host_id", user.id)
    .eq("publication_status", "draft");

  if (error) {
    throw new ApiError("Could not delete the event.", 503);
  }

  if (event.cover_path) {
    await db.storage
      .from("event-covers")
      .remove([event.cover_path]);
  }

  return { deleted: true };
});
