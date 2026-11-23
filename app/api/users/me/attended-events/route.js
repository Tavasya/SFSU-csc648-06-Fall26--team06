import { respond } from "@/lib/events/api";
import { checked, studentContext } from "@/lib/student/api";

export const GET = respond(async (request) => {
  const { db, user } = await studentContext(request);
  const rows = checked(await db.from("attended_events").select("events(*, locations(building_name))")
    .eq("user_id", user.id).order("recorded_at", { ascending: false }));
  return { events: rows.map((row) => row.events).filter(Boolean) };
});
