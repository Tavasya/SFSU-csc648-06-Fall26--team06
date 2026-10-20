/*
 * components/map/EventPlacePreview.js
 *
 * PURPOSE:
 * Shows where an event is, on the event detail page
 * (components/gatoraid/EventDetails.js, "Location" section):
 *  - a small 2D campus map zoomed in on the event's building, highlighted
 *    (rooms like "Jack Adams Hall" highlight their building)
 *  - an "Open in campus map" link that opens /map on that building with this
 *    event already open in the side panel
 *  - the 3D room scan card when the building has a scanned room
 *
 * Renders nothing for locations that aren't on the map and have no scans.
 */

"use client";

import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import MapView, { campusFrom } from "@/components/map/Map";
import RoomScansCard from "@/components/rooms/RoomScansCard";
import { buildLocationLookup, placeForLocation } from "@/lib/map/events";
import { NO_PLACES } from "@/lib/map/places";
import "@/components/map/map.css";

export default function EventPlacePreview({
  buildingName, // the event's Supabase locations.building_name
  eventId = null,
  rooms = [], // scanned rooms in the event's building: [{ id, name, scanDate }]
  places = NO_PLACES, // the map's places, from toCampusPlaces (lib/map/places.js)
}) {
  const place = placeForLocation(buildingName, buildLocationLookup(places));
  if (!place && rooms.length === 0) return null;

  // Rooms (venues) are highlighted through their parent building.
  const placeId = place?.venueId ?? place?.mapId;
  const mapHref = `/map?place=${placeId}${eventId ? `&event=${eventId}` : ""}`;

  return (
    <div className="campus-map mt-4 space-y-4">
      {place && (
        <div>
          <MapView
            compact
            campus={campusFrom(places)}
            initialFocusId={placeId}
            selectedId={placeId}
            onSelect={() => {}}
          />
          <Link
            href={mapHref}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#604398] hover:text-[#503581] hover:underline"
          >
            <MapIcon size={15} aria-hidden="true" />
            Open in campus map
          </Link>
        </div>
      )}
      <RoomScansCard rooms={rooms} viewerClassName="h-56 sm:h-64" />
    </div>
  );
}
