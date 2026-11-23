/**
 * Public interfaces supporting R3.4.
 * @module app/api/events/eventId/saved/route
 */
import { respond, ApiError } from "@/lib/events/api";
import { studentContext, publishedEvent, checked, assertNotOwner } from "@/lib/student/api";
import { isUuid } from "@/lib/student/validation";
/**
 * Return whether the current student has saved the published event.
 * @function GET
 * @memberof module:app/api/events/eventId/saved/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @param {Object} context - Next.js route context with asynchronous params.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export const GET = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  const saved = checked(await db.from("saved_events").select("event_id")
    .eq("user_id", user.id).eq("event_id", event.id).maybeSingle());
  return { saved: Boolean(saved) };
});
/**
 * Save a published event for the current student, rejecting self-hosted events.
 * @function PUT
 * @memberof module:app/api/events/eventId/saved/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @param {Object} context - Next.js route context with asynchronous params.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export const PUT = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  assertNotOwner(event, user);
  checked(await db.from("saved_events").upsert({ user_id: user.id, event_id: event.id },
    { onConflict: "user_id,event_id", ignoreDuplicates: true }));
  return { saved: true };
});
/**
 * Remove the current student's saved-event record.
 * @function DELETE
 * @memberof module:app/api/events/eventId/saved/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @param {Object} context - Next.js route context with asynchronous params.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export const DELETE = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const { eventId } = await context.params;
  if (!isUuid(eventId)) throw new ApiError("Event not found.", 404);
  checked(await db.from("saved_events").delete().eq("user_id", user.id).eq("event_id", eventId));
  return { saved: false };
});
