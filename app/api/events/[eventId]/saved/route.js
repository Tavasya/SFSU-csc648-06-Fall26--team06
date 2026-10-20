import { respond, ApiError } from "@/lib/events/api";
import { studentContext, publishedEvent, checked } from "@/lib/student/api";
import { isUuid } from "@/lib/student/validation";
export const GET = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  const saved = checked(await db.from("saved_events").select("event_id")
    .eq("user_id", user.id).eq("event_id", event.id).maybeSingle());
  return { saved: Boolean(saved) };
});
export const PUT = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  checked(await db.from("saved_events").upsert({ user_id: user.id, event_id: event.id },
    { onConflict: "user_id,event_id", ignoreDuplicates: true }));
  return { saved: true };
});
export const DELETE = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const { eventId } = await context.params;
  if (!isUuid(eventId)) throw new ApiError("Event not found.", 404);
  checked(await db.from("saved_events").delete().eq("user_id", user.id).eq("event_id", eventId));
  return { saved: false };
});
