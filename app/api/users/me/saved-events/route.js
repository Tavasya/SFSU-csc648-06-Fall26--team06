import { respond } from "@/lib/events/api";
import { studentContext, checked } from "@/lib/student/api";
export const GET = respond(async (request) => {
  const { db, user } = await studentContext(request);
  const rows = checked(await db.from("saved_events").select("saved_at, events(*, locations(building_name))")
    .eq("user_id", user.id).order("saved_at", { ascending: false }));
  const categories = checked(await db.from("categories").select("id, name").order("name"));
  return { events: rows.filter((row) => row.events).map((row) => ({ ...row.events, saved_at: row.saved_at })), categories };
});
