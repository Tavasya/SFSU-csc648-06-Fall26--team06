/**
 * Public interfaces supporting R5.6.
 * @module app/api/events/for-you/route
 */
import { respond } from "@/lib/events/api";
import { studentContext, recommendations, checked } from "@/lib/student/api";
/**
 * Return interest-based recommendations and schedule-fit information for the current student.
 * @function GET
 * @memberof module:app/api/events/for-you/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
export const GET = respond(async (request) => {
  const { db, user } = await studentContext(request);
  const result = await recommendations(db, user);
  // The student's own upcoming events that match their interests, for the
  // "Show my events" chip (hidden by default). Same interest rule as the list.
  if (!result.category_ids.length) return { ...result, own_events: [] };
  const own = checked(await db.from("events").select("*, locations(building_name)")
    .eq("host_id", user.id).eq("publication_status", "published").eq("status", "active")
    .gt("end_date_time", new Date().toISOString())
    .overlaps("category_ids", result.category_ids).order("start_date_time"));
  return { ...result, own_events: own.map((event) => ({ ...event, hosted_by_you: true })) };
});
