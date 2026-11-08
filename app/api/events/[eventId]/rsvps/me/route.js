import { respond, ApiError } from "@/lib/events/api";
import { studentContext, publishedEvent, checked, body, assertNotOwner } from "@/lib/student/api";
import { RSVP_STATUSES, canAttend } from "@/lib/student/validation";
import { FULL_MESSAGE, isFull, loadAttendance } from "@/lib/events/attendance";

// Attending count and capacity, so the buttons can show "RSVP capacity has been reached".
async function capacityInfo(db, event) {
  const attending = (await loadAttendance(db, [event.id])).get(event.id) ?? null;
  return { attending, capacity: event.capacity ?? null, full: isFull(event.capacity, attending) };
}
export const GET = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  const rsvp = checked(await db.from("event_rsvps").select("status, updated_at")
    .eq("user_id", user.id).eq("event_id", event.id).maybeSingle());
  return { rsvp, ...(await capacityInfo(db, event)) };
});
export const PUT = respond(async (request, context) => {
  const { db, user } = await studentContext(request);
  const event = await publishedEvent(db, context);
  assertNotOwner(event, user);
  const { status } = await body(request);
  if (!RSVP_STATUSES.includes(status)) throw new ApiError("Choose a valid RSVP status.", 422);
  if (status === "attending" && !canAttend(event))
    throw new ApiError("This event is cancelled or completed and cannot accept attending RSVPs.", 409);
  if (status === "attending") {
    // Someone already attending can keep their spot; nobody new once it's full.
    const current = checked(await db.from("event_rsvps").select("status")
      .eq("user_id", user.id).eq("event_id", event.id).maybeSingle());
    if (current?.status !== "attending" && (await capacityInfo(db, event)).full)
      throw new ApiError(FULL_MESSAGE, 409);
  }
  const result = await db.from("event_rsvps").upsert({
    user_id: user.id, event_id: event.id, status, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,event_id" }).select("status, updated_at").single();
  // The database's capacity rule (rsvp_capacity trigger) has the final say.
  if (result.error?.message?.includes("capacity has been reached")) throw new ApiError(FULL_MESSAGE, 409);
  const rsvp = checked(result);
  return { rsvp, ...(await capacityInfo(db, event)) };
});
