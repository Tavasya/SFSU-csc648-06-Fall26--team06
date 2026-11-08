import { respond } from "@/lib/events/api";
import { studentContext, recommendations, checked } from "@/lib/student/api";
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
