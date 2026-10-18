/*
 * app/(platform)/map/page.js  —  the /map route (Map page)
 *
 * A Server Component: it runs on the server for every request, loads the
 * events, and sends finished HTML + data to the browser. All the clicking,
 * filtering and zooming happens in <MapExplorer> (a Client Component).
 *
 * Where the events come from:
 *  - /map           real published events from Supabase (lib/map/page-data.js)
 *  - /map?sample=1  the hardcoded demo events (lib/map/sample-events.js)
 *
 * Links can open the map on a place and event, e.g. from the event page:
 *  - /map?place=ccsc               selects the Cesar Chavez Student Center
 *  - /map?place=ccsc&event=<id>    ...and opens that event in the side panel
 *
 * If Supabase can't be reached, the page still shows the map with a short
 * "couldn't load events" notice instead of crashing.
 */

import MapExplorer from "@/components/map/MapExplorer";
import { loadMapEvents } from "@/lib/map/page-data";
import { isMapPlace } from "@/lib/map/events";
import { SAMPLE_EVENTS, SAMPLE_SCANS } from "@/lib/map/sample-events";

export const metadata = {
  title: "Campus Map | GatorAid",
  description: "Find where events are happening at San Francisco State University.",
};

export default async function MapPage({ searchParams }) {
  const { sample, place, event } = await searchParams;
  // Ignore unknown places so a bad link still opens the full map.
  const start = isMapPlace(place) ? { initialPlaceId: place, initialEventId: event ?? null } : {};

  if (sample === "1") {
    return <MapExplorer events={SAMPLE_EVENTS} scans={SAMPLE_SCANS} isSample {...start} />;
  }

  // Load first. Only the loading is inside try/catch (rendering errors are
  // handled by Next.js error pages, not by try/catch).
  let data = null;
  try {
    data = await loadMapEvents();
  } catch (error) {
    console.error(error);
  }

  if (!data) return <MapExplorer loadError {...start} />;
  return <MapExplorer events={data.events} unmatched={data.unmatched} scans={data.scans} {...start} />;
}
