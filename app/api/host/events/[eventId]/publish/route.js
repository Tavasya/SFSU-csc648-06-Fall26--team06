import {
  hostContext,
  payload,
  ownedEvent,
  respond,
  ApiError,
} from "@/lib/events/api";
export const POST = respond(async (request, { params }) => {
  const { db, user } = await hostContext(request);
  const { eventId } = await params;
  const event = await ownedEvent(db, user, eventId);
  await payload(db, user, event);
  const { data, error } = await db
    .from("events")
    .update({
      publication_status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("host_id", user.id)
    .select()
    .single();
  if (error) throw new ApiError("Could not publish the event.", 503);
  return { event: data };
});
