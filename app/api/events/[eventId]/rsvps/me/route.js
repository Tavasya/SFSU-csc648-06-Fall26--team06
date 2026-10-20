import { respond, ApiError } from "@/lib/events/api";
import { studentContext, publishedEvent, checked, body } from "@/lib/student/api";
import { RSVP_STATUSES, canAttend } from "@/lib/student/validation";
export const GET = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  const rsvp = checked(await db.from("event_rsvps").select("status, updated_at")
    .eq("user_id", user.id).eq("event_id", event.id).maybeSingle());
  return { rsvp };
});
export const PUT = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  const { status } = await body(request);
  if (!RSVP_STATUSES.includes(status)) throw new ApiError("Choose a valid RSVP status.", 422);
  if (status === "attending" && !canAttend(event))
    throw new ApiError("This event is cancelled or completed and cannot accept attending RSVPs.", 409);
  const rsvp = checked(await db.from("event_rsvps").upsert({
    user_id: user.id, event_id: event.id, status, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,event_id" }).select("status, updated_at").single());
  return { rsvp };
});
