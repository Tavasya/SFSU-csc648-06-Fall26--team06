import { createClient } from "@/lib/supabase/server";
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
export async function options(db) {
  const [{ data: categories, error: ce }, { data: locations, error: le }] =
    await Promise.all([
      db.from("categories").select("*").order("name"),
      db.from("locations").select("*").order("building_name"),
    ]);
  if (ce || le) throw new Error("Could not load event options.");
  return { categories, locations };
}
