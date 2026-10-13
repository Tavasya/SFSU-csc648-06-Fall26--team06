import { createClient } from "@/lib/supabase/server";
export async function GET(request, { params }) {
  const db = await createClient();
  const { data, error } = await db
    .from("events")
    .select("*, locations(building_name)")
    .eq("id", (await params).eventId)
    .eq("publication_status", "published")
    .maybeSingle();
  return Response.json(
    error || !data ? { error: "Event not found." } : { event: data },
    { status: error || !data ? 404 : 200 },
  );
}
