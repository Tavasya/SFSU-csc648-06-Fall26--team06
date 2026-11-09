import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { options } from "@/lib/events/page-data";
import EventDetails from "@/components/gatoraid/EventDetails";
import { loadHostNames, loadRoomScans } from "@/lib/map/page-data";
import { buildLocationLookup, placeForLocation } from "@/lib/map/events";
import { toCampusPlaces } from "@/lib/map/places";
export default async function Page({ params, searchParams }) {
  // ?from=assistant: opened from Allison's answers, so "Back" returns to the chat
  const from = (await searchParams)?.from === "assistant" ? "assistant" : null;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: event, error } = await db
    .from("events")
    .select("*")
    .eq("id", (await params).eventId)
    .eq("publication_status", "published")
    .maybeSingle();
  if (error || !event) notFound();
  const { categories, locations } = await options(db);
  const location = locations.find((l) => l.id === event.location_id);
  // The Campus Map places (every row of "locations" with a map_id), and the
  // scanned 3D rooms in the event's building, for the Location section preview
  const places = toCampusPlaces(locations);
  const lookup = buildLocationLookup(places);
  const [scans, hostNames] = await Promise.all([
    loadRoomScans(db, lookup),
    loadHostNames(db, [event]),
  ]);
  const place = placeForLocation(location?.building_name, lookup);
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
      hostName={hostNames.get(event.host_id)}
      isHost={Boolean(user) && user.id === event.host_id}
      rooms={rooms}
      places={places}
      from={from}
    />
  );
}
