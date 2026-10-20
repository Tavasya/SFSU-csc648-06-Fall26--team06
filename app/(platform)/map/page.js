/*
 * app/(platform)/map/page.js  —  the /map route (Map page)
 *
 * A Server Component: it runs on the server for every request, loads the
 * events, and sends finished HTML + data to the browser. All the clicking,
 * filtering and zooming happens in <MapExplorer> (a Client Component).
 *
 * Where the data comes from:
 *  - the map's buildings, outdoor spaces and rooms: the Supabase "locations" table
 *  - /map           real published events from Supabase (lib/map/page-data.js)
 *  - /map?sample=1  the hardcoded demo events (lib/map/sample-events.js)
 *
 * Links can open the map on a place and event, e.g. from the event page:
 *  - /map?place=ccsc               selects the Cesar Chavez Student Center
 *  - /map?place=ccsc&event=<id>    ...and opens that event in the side panel
 *
 * If Supabase can't be reached, the page still draws the campus shapes with a
 * short "couldn't load events" notice instead of crashing.
 */

import MapExplorer from "@/components/map/MapExplorer";
import { createClient } from "@/lib/supabase/server";
import { loadCampusPlaces, loadMapEvents } from "@/lib/map/page-data";
import { isMapPlace } from "@/lib/map/events";
import { NO_PLACES } from "@/lib/map/places";
import { SAMPLE_EVENTS, SAMPLE_SCANS } from "@/lib/map/sample-events";

export const metadata = {
  title: "Campus Map | GatorAid",
  description: "Find where events are happening at San Francisco State University.",
};

export default async function MapPage({ searchParams }) {
  const { sample, place, event } = await searchParams;
  const isSample = sample === "1";

  // Load first. Only the loading is inside try/catch (rendering errors are
  // handled by Next.js error pages, not by try/catch).
  // The sample events only need the places; real events come with them.
  let data = null;
  try {
    data = isSample
      ? { places: await loadCampusPlaces(await createClient()), events: SAMPLE_EVENTS, scans: SAMPLE_SCANS }
      : await loadMapEvents();
  } catch (error) {
    console.error(error);
  }

  const places = data?.places ?? NO_PLACES;
  // Ignore unknown places so a bad link still opens the full map.
  const start = isMapPlace(place, places) ? { initialPlaceId: place, initialEventId: event ?? null } : {};

  if (!data) return <MapExplorer places={places} loadError {...start} />;
  return (
    <MapExplorer
      places={places}
      events={data.events}
      unmatched={data.unmatched}
      scans={data.scans}
      isSample={isSample}
      {...start}
    />
  );
}
