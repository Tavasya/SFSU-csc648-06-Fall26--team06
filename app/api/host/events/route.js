import { hostContext, payload, respond, ApiError } from "@/lib/events/api";
export const GET = respond(async (request) => {
  const { db, user } = await hostContext(request);
  const { data, error } = await db
    .from("events")
    .select("*, locations(building_name)")
    .eq("host_id", user.id)
    .order("start_date_time");
  if (error) throw new ApiError("Could not load events.", 503);
  return { events: data };
});
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
