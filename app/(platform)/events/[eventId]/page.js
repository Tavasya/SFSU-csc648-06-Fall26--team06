import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { options } from "@/lib/events/page-data";
import EventDetails from "@/components/gatoraid/EventDetails";
import { loadRoomScans } from "@/lib/map/page-data";
import { placeForLocation } from "@/lib/map/events";
export default async function Page({ params }) {
  const db = await createClient();
  const { data: event, error } = await db
    .from("events")
    .select("*")
    .eq("id", (await params).eventId)
    .eq("publication_status", "published")
    .maybeSingle();
  if (error || !event) notFound();
  const { categories, locations } = await options(db);
  const location = locations.find((l) => l.id === event.location_id);
  // Scanned 3D rooms in the event's building, for the Location section preview
  const scans = await loadRoomScans(db);
  const place = placeForLocation(location?.building_name);
  const rooms = (place && scans[place.mapId]) || [];
  let coverUrl = null;
  if (event.cover_path) {
    const { data } = await db.storage
      .from("event-covers")
      .createSignedUrl(event.cover_path, 3600);
    coverUrl = data?.signedUrl;
  }
  return (
    <EventDetails
      event={event}
      categories={categories}
      location={location}
      coverUrl={coverUrl}
      rooms={rooms}
    />
  );
}
