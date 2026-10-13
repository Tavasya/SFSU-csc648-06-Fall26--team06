import {
  hostContext,
  payload,
  ownedEvent,
  respond,
  ApiError,
} from "@/lib/events/api";
export const GET = respond(async (request, { params }) => {
  const { db, user } = await hostContext(request);
  return { event: await ownedEvent(db, user, (await params).eventId) };
});
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
export const DELETE = respond(async (request, { params }) => {
  const { db, user } = await hostContext(request);
  const { eventId } = await params;
  const event = await ownedEvent(db, user, eventId);
  const { error } = await db
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("host_id", user.id);
  if (error) throw new ApiError("Could not delete the event.", 503);
  if (event.cover_path)
    await db.storage.from("event-covers").remove([event.cover_path]);
  return { deleted: true };
});
