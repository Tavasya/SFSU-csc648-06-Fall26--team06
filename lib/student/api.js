import { createClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/events/api";
import { validRequestOrigin } from "@/lib/events/request-origin";
import { isUuid, recommendationReasons } from "./validation";

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
    db.from("student_preferences").select("category_ids").eq("user_id", user.id).maybeSingle(),
  ]);
  return { categories: checked(all), category_ids: checked(selected)?.category_ids || [] };
}

export async function recommendations(db, user) {
  const prefs = await preferences(db, user);
  if (!prefs.category_ids.length) return { ...prefs, events: [] };
  const events = checked(await db.from("events").select("*, locations(building_name)")
    .eq("publication_status", "published").eq("status", "active")
    .gt("end_date_time", new Date().toISOString())
    .overlaps("category_ids", prefs.category_ids).order("start_date_time"));
  return { ...prefs, events: events.map((event) => ({
    ...event, recommendation_reasons: recommendationReasons(event, prefs.categories, prefs.category_ids),
  })) };
}
