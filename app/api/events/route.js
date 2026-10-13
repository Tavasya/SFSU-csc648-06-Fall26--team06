import { createClient } from "@/lib/supabase/server";
export async function GET() {
  const db = await createClient();
  const { data, error } = await db
    .from("events")
    .select("*, locations(building_name)")
    .eq("publication_status", "published")
    .eq("status", "active")
    .order("start_date_time");
  return Response.json(
    error ? { error: "Could not load events." } : { events: data },
    { status: error ? 503 : 200 },
  );
}
