/**
 * Public interfaces supporting R4.1.
 * @module lib/events/page-data
 */
import { createClient } from "@/lib/supabase/server";
/**
 * Load the server-side session and derive optional organizer display information.
 * @function pageContext
 * @memberof module:lib/events/page-data
 * @static
 * @returns {Promise<Object>} The session client, optional user and derived host as { db, user, host }.
 */
export async function pageContext() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const host = user
    ? {
        user_id: user.id,
        display_name:
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "Campus organizer",
      }
    : null;
  return { db, user, host };
}
/**
 * Load available categories and campus locations for event forms; throw on query failure.
 * @function options
 * @memberof module:lib/events/page-data
 * @static
 * @param {Object} db - Session-scoped database client.
 * @returns {Promise<Object>} Available { categories, locations } records.
 */
export async function options(db) {
  const [{ data: categories, error: ce }, { data: locations, error: le }] =
    await Promise.all([
      db.from("categories").select("*").order("name"),
      db.from("locations").select("*").order("building_name"),
    ]);
  if (ce || le) throw new Error("Could not load event options.");
  return { categories, locations };
}
