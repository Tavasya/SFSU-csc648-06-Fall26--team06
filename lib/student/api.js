import { createClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/events/api";
import { validRequestOrigin } from "@/lib/events/request-origin";
import { isUuid, recommendationReasons } from "./validation";
import { normalizeSchedule } from "./schedule";

export async function studentContext(request) {
  if (request.method !== "GET" && !validRequestOrigin(request))
    throw new ApiError("Invalid request origin.", 403);
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new ApiError("Sign in to use your student account.", 401);
  return { db, user };
}

export function checked(result) {
  if (result.error) throw new ApiError("Could not load or save your data. Please try again.", 503);
  return result.data;
}

export function assertNotOwner(event, user) {
  // Hosts already have My Events; keep their events out of their student actions.
  if (event.host_id === user.id)
    throw new ApiError("You cannot save or RSVP to your own event.", 403);
}

export function savedSchedule(value) {
  try {
    return normalizeSchedule(value || []);
  } catch {
    throw new ApiError("Your saved schedule is invalid. Update it from your profile.", 503);
  }
}

export async function body(request) {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new ApiError("Send a valid JSON object.", 400);
  }
}

export async function publishedEvent(db, context) {
  const { eventId } = await context.params;
  if (!isUuid(eventId)) throw new ApiError("Event not found.", 404);
  const event = checked(await db.from("events").select("*").eq("id", eventId)
    .eq("publication_status", "published").maybeSingle());
  if (!event) throw new ApiError("Event not found.", 404);
  return event;
}

export async function preferences(db, user) {
  const [all, selected] = await Promise.all([
    db.from("categories").select("id, name").order("name"),
    db.from("student_preferences").select("category_ids, class_schedule").eq("user_id", user.id).maybeSingle(),
  ]);
  const saved = checked(selected);
  return {
    categories: checked(all),
    category_ids: saved?.category_ids || [],
    classes: savedSchedule(saved?.class_schedule),
  };
}

export async function recommendations(db, user) {
  const prefs = await preferences(db, user);
  // Start with all upcoming events; the page applies the student's chosen recommendation mode.
  const events = checked(await db.from("events").select("*, locations(building_name)")
    .eq("publication_status", "published").eq("status", "active")
    .neq("host_id", user.id)
    .gt("end_date_time", new Date().toISOString())
    .order("start_date_time"));
  return { ...prefs, events: events.map((event) => ({
    ...event, recommendation_reasons: recommendationReasons(event, prefs.categories, prefs.category_ids),
  })) };
}
