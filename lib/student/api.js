/**
 * Public interfaces supporting R3.4, R5.3, R5.6, R8.5.
 * @module lib/student/api
 */
import { createClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/events/api";
import { validRequestOrigin } from "@/lib/events/request-origin";
import { isUuid, recommendationReasons } from "./validation";

/**
 * Require a signed-in student and validate the origin of mutation requests.
 * @function studentContext
 * @memberof module:lib/student/api
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @returns {Promise<Object>} The authenticated database client and student as { db, user }.
 */
export async function studentContext(request) {
  if (request.method !== "GET" && !validRequestOrigin(request))
    throw new ApiError("Invalid request origin.", 403);
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new ApiError("Sign in to use your student account.", 401);
  return { db, user };
}

/**
 * Extract successful query data or throw a service-unavailable API error.
 * @function checked
 * @memberof module:lib/student/api
 * @static
 * @param {Object} result - Database response containing data and error fields.
 * @returns {*} The successful query data.
 */
export function checked(result) {
  if (result.error) throw new ApiError("Could not load or save your data. Please try again.", 503);
  return result.data;
}

// Hosts can't save or RSVP to their own events. The database refuses it too
// (supabase/migrations/20261102000000_schedule_recommendations_and_self_rsvp_guards.sql);
// this gives them a clear message instead of a generic error.
/**
 * Reject saving or RSVPing to an event hosted by the current user.
 * @function assertNotOwner
 * @memberof module:lib/student/api
 * @static
 * @param {Object} event - Event record or display model used by this function.
 * @param {Object} user - Authenticated user from the server session.
 * @returns {void} No value when the event belongs to another organizer.
 */
export function assertNotOwner(event, user) {
  if (event.host_id === user.id)
    throw new ApiError("You can't save or RSVP to your own event.", 403);
}

/**
 * Read a JSON object from a request; reject invalid JSON, arrays and null.
 * @function body
 * @memberof module:lib/student/api
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @returns {Promise<Object>} The parsed JSON object.
 */
export async function body(request) {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new ApiError("Send a valid JSON object.", 400);
  }
}

/**
 * Validate the route event UUID and load a published event, throwing 404 when unavailable.
 * @function publishedEvent
 * @memberof module:lib/student/api
 * @static
 * @param {Object} db - Session-scoped database client.
 * @param {Object} context - Next.js route context with asynchronous params.
 * @param {Promise<Object>} context.params - Dynamic parameters including eventId.
 * @returns {Promise<Object>} The matching published event record.
 */
export async function publishedEvent(db, context) {
  const { eventId } = await context.params;
  if (!isUuid(eventId)) throw new ApiError("Event not found.", 404);
  const event = checked(await db.from("events").select("*").eq("id", eventId)
    .eq("publication_status", "published").maybeSingle());
  if (!event) throw new ApiError("Event not found.", 404);
  return event;
}

/**
 * Load available interest categories and the current student's selected IDs.
 * @function preferences
 * @memberof module:lib/student/api
 * @static
 * @param {Object} db - Session-scoped database client.
 * @param {Object} user - Authenticated user from the server session.
 * @returns {Promise<Object>} Available categories and selected category_ids.
 */
export async function preferences(db, user) {
  const [all, selected] = await Promise.all([
    db.from("categories").select("id, name").order("name"),
    db.from("student_preferences").select("category_ids").eq("user_id", user.id).maybeSingle(),
  ]);
  return { categories: checked(all), category_ids: checked(selected)?.category_ids || [] };
}

/**
 * Load active, unended events matching interests, excluding self-hosted events; return no events without interests.
 * @function recommendations
 * @memberof module:lib/student/api
 * @static
 * @param {Object} db - Session-scoped database client.
 * @param {Object} user - Authenticated user from the server session.
 * @returns {Promise<Object>} The preference fields and an events array with recommendation reasons.
 */
export async function recommendations(db, user) {
  const prefs = await preferences(db, user);
  if (!prefs.category_ids.length) return { ...prefs, events: [] };
  const events = checked(await db.from("events").select("*, locations(building_name)")
    .eq("publication_status", "published").eq("status", "active")
    .neq("host_id", user.id)
    .gt("end_date_time", new Date().toISOString())
    .overlaps("category_ids", prefs.category_ids).order("start_date_time"));
  return { ...prefs, events: events.map((event) => ({
    ...event, recommendation_reasons: recommendationReasons(event, prefs.categories, prefs.category_ids),
  })) };
}
