import { ApiError, respond } from "@/lib/events/api";
import { checked, publishedEvent, studentContext } from "@/lib/student/api";
import { canMarkAttended } from "@/lib/student/validation";

export const GET = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  const row = checked(await db.from("attended_events").select("event_id").eq("user_id", user.id).eq("event_id", event.id).maybeSingle());
  return { attended: Boolean(row) };
});

export const PUT = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  if (!canMarkAttended(event))
    throw new ApiError("Only past, non-cancelled events can be marked attended.", 422);
  checked(await db.from("attended_events").upsert({ user_id: user.id, event_id: event.id }, { onConflict: "user_id,event_id", ignoreDuplicates: true }));
  return { attended: true };
});

export const DELETE = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  checked(await db.from("attended_events").delete().eq("user_id", user.id).eq("event_id", event.id));
  return { attended: false };
});
