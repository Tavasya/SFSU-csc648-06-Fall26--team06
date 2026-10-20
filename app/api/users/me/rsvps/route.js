import { respond } from "@/lib/events/api";
import { studentContext, checked } from "@/lib/student/api";
export const GET = respond(async (request) => {
  const { db, user } = await studentContext(request);
  const rsvps = checked(await db.from("event_rsvps").select("status, updated_at, events(*, locations(building_name))")
    .eq("user_id", user.id).order("updated_at", { ascending: false }));
  return { rsvps };
});
