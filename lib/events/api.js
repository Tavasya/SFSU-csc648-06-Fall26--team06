import { createClient } from "@/lib/supabase/server";
import { validateEvent } from "./validation";
import { validRequestOrigin } from "./request-origin";
export class ApiError extends Error {
  constructor(message, status = 400, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
export async function hostContext(request) {
  if (request.method !== "GET") {
    if (!validRequestOrigin(request))
      throw new ApiError("Invalid request origin.", 403);
  }
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new ApiError("Sign in to manage your events.", 401);
  return { db, user };
}
export async function ownedEvent(db, user, id) {
  const { data, error } = await db
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("host_id", user.id)
    .maybeSingle();
  if (error || !data) throw new ApiError("Event not found.", 404);
  return data;
}
export async function payload(db, user, input) {
  const { errors, data } = validateEvent(input);
  if (Object.keys(errors).length)
    throw new ApiError("Please check the highlighted fields.", 422, errors);
  const [{ data: location, error: le }, { data: categories, error: ce }] =
    await Promise.all([
      db
        .from("locations")
        .select("id")
        .eq("id", data.location_id)
        .maybeSingle(),
      db.from("categories").select("id").in("id", data.category_ids),
    ]);
  if (le || ce) throw new ApiError("Could not validate event options.", 503);
  if (!location || categories.length !== data.category_ids.length)
    throw new ApiError("Choose valid locations and categories.", 422);
  if (data.cover_path) {
    if (
      !data.cover_path.startsWith(user.id + "/") ||
      data.cover_path.includes("..")
    )
      throw new ApiError("Invalid cover image.", 422);
    const { error } = await db.storage
      .from("event-covers")
      .createSignedUrl(data.cover_path, 60);
    if (error)
      throw new ApiError("Cover image is not available. Upload it again.", 422);
  }
  return { ...data, updated_at: new Date().toISOString() };
}
export function respond(fn) {
  return async (...args) => {
    try {
      return Response.json(await fn(...args), {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (e) {
      if (!(e instanceof ApiError)) console.error("Event API:", e);
      return Response.json(
        {
          error:
            e instanceof ApiError
              ? e.message
              : "Could not complete the request. Please try again.",
          fields: e.fields,
        },
        { status: e.status || 500 },
      );
    }
  };
}
