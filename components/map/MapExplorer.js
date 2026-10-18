/*
 * components/map/MapExplorer.js
 *
 * PURPOSE:
 * The interactive part of the Map page (a Client Component, because
 * it reacts to clicks, filters and zooming in the browser).
 *
 *  - shows the "Map" header, the Today / This week / All upcoming
 *    chips, the category filter and the "Find a place" dropdown
 *  - filters events by date range and category
 *  - groups events by building (mapId) to decide which buildings get a pin
 *    on the map and a row in the side panel
 *  - keeps track of the selected building / outdoor space / room and tells
 *    the map to fly to it
 *  - keeps track of which event is open in the side panel's detail view
 *  - shows a notice if the events couldn't be loaded, and lists events
 *    whose location isn't on the map yet
 *
 * Props:
 *  - events:      [{ id, title, date, endDate, startTime, endTime, tags, rsvpCount,
 *                    roomNumber, mapId, venueId, ...detail fields }]
 *                  (built by toMapEvent in lib/map/events.js)
 *  - unmatched:   events whose location isn't on the map (same shape)
 *  - scans:       { [mapId]: [{ id, name, scanDate, venueId }] } buildings with a 3D room scan
 *  - initialPlaceId / initialEventId: open the map on a place (and event),
 *                  used by links like /map?place=ccsc&event=<id> from the event page
 *  - isSample:    true when showing lib/map/sample-events.js
 *  - loadError:   true when Supabase couldn't be reached
 */

"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import MapView, { getCampusFeature, OPTION_GROUPS } from "@/components/map/Map";
import MapSidePanel from "@/components/map/MapSidePanel";
import { inRange } from "@/lib/map/events";
import "@/components/map/map.css";

const RANGES = [
  { id: "all", label: "All upcoming", text: "coming up" },
  { id: "today", label: "Today", text: "today" },
  { id: "week", label: "This week", text: "this week" },
];

const chipClass = (active) =>
  `inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#604398] ${
    active
      ? "border-[#efce6b] bg-[#fff4d1] text-[#262332]"
      : "border-[#ebe7f0] bg-white text-[#51475f] hover:border-[#d9cfe8]"
  }`;

export default function MapExplorer({
  events = [],
  unmatched = [],
  scans = {},
  isSample = false,
  loadError = false,
  initialPlaceId = null,
  initialEventId = null,
}) {
  const mapRef = useRef(null);
  const [today] = useState(() => new Date());
  const [range, setRange] = useState("all");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState(initialPlaceId);
  // The event open in the side panel's detail view (null = show the list).
  const [openEventId, setOpenEventId] = useState(initialEventId);

  const allTags = useMemo(
    () => [...new Set(events.flatMap((e) => e.tags ?? []))].sort(),
    [events],
  );

// Filter events by date range and category, then group them by events per building (mapId).
  const filtered = useMemo(() => {
    const byBuilding = new Map();
    for (const e of events) {
      if (!inRange(e, range, today)) continue;
      if (category !== "all" && !(e.tags ?? []).includes(category)) continue;
      if (!byBuilding.has(e.mapId)) byBuilding.set(e.mapId, []);
      byBuilding.get(e.mapId).push(e);
    }
    return byBuilding;
  }, [events, range, category, today]);

  // Buildings that get a pin on the map and a row in the side panel.
  const buildingsWithEvents = [...filtered.entries()]
    .map(([mapId, list]) => {
      const feature = getCampusFeature(mapId);
      return {
        id: mapId,
        name: feature?.name ?? mapId,
        label: feature?.mapLabel ?? mapId,
        count: list.length,
        has3D: Boolean(scans[mapId]),
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // What the side panel shows for the current selection (building, outdoor
  // space or a room inside a building).
  const selection = useMemo(() => {
    if (!selectedId) return null;
    const feature = getCampusFeature(selectedId);
    if (!feature) return null;
    const building = feature.isVenue ? feature.parent : feature;
    const buildingEvents = filtered.get(building?.id) ?? [];
    return {
      id: selectedId,
      name: feature.name,
      venue: feature.isVenue ? feature : null,
      parent: feature.isVenue ? building : null,
      scannedRooms: scans[building?.id] ?? [],
      events: feature.isVenue
        ? buildingEvents.filter((e) => e.venueId === selectedId)
        : buildingEvents,
    };
  }, [selectedId, filtered, scans]);

  // The open event, if it's still part of the selection. If a filter hides
  // it, the side panel goes back to the list on its own.
  const openEvent = selection?.events.find((e) => e.id === openEventId) ?? null;

  // Clicking a shape on the map selects it and closes any open event.
  function selectFromMap(id) {
    setSelectedId(id);
    setOpenEventId(null);
  }

  // From the list, the finder or an "inside X" link: select and fly there.
  function focusPlace(id) {
    setSelectedId(id);
    setOpenEventId(null);
    mapRef.current?.flyTo(id);
  }

  function backToFullMap() {
    setSelectedId(null);
    setOpenEventId(null);
    mapRef.current?.reset();
  }

  const rangeText = RANGES.find((r) => r.id === range).text;

  return (
    <div className="campus-map text-[14px] leading-normal text-[#262332]">
      <header className="mb-6">
        <h1 className="text-[32px] font-bold leading-tight tracking-[-1px]">Campus Map</h1>
        <p className="mt-2 text-[#777180]">
          Find where events are happening. Select a building to see what events it has to offer.
        </p>
      </header>

      {loadError && (
        <p role="alert" className="mb-5 rounded-[13px] border border-[#f0dfaa] bg-[#fffbef] px-4 py-3 text-[13px] text-[#78672e]">
          We couldn&apos;t load events right now. The map still works — please refresh to try again.
        </p>
      )}

      {/* Filters + finder */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label="Time range" className="flex flex-wrap gap-2.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range === r.id}
              onClick={() => setRange(r.id)}
              className={chipClass(range === r.id)}
            >
              {range === r.id && <Check size={15} aria-hidden="true" />}
              {r.label}
            </button>
          ))}
        </div>

        <label className={`${chipClass(category !== "all")} relative cursor-pointer pr-9`}>
          <span className="sr-only">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="cursor-pointer appearance-none bg-transparent outline-none"
          >
            <option value="all">All categories</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3.5" aria-hidden="true" />
        </label>

        <label className="relative flex w-full min-w-0 items-center sm:ml-auto sm:w-auto">
          <span className="sr-only">Find a place</span>
          <Search size={15} className="pointer-events-none absolute left-3.5 text-[#777180]" aria-hidden="true" />
          <select
            value={selectedId ?? ""}
            onChange={(e) => e.target.value && focusPlace(e.target.value)}
            className="w-full min-w-0 cursor-pointer appearance-none truncate rounded-full border border-[#ebe7f0] bg-white py-2 pl-9 pr-9 text-[13px] text-[#262332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#604398] sm:max-w-[320px]"
          >
            <option value="">Find a building, outdoor space or room…</option>
            {OPTION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3.5 text-[#777180]" aria-hidden="true" />
        </label>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="min-w-0 flex-1" aria-label="Campus map">
          <MapView ref={mapRef} initialFocusId={initialPlaceId} selectedId={selectedId} onSelect={selectFromMap} pins={buildingsWithEvents} />
        </section>

        <MapSidePanel
          selection={selection}
          buildings={buildingsWithEvents}
          rangeText={rangeText}
          isSample={isSample}
          onSelect={focusPlace}
          onBack={backToFullMap}
          openEvent={openEvent}
          onOpenEvent={setOpenEventId}
          onCloseEvent={() => setOpenEventId(null)}
        />
      </div>

      {unmatched.length > 0 && (
        <p className="mt-4 text-[12px] text-[#78672e]">
          {unmatched.length} {unmatched.length === 1 ? "event is" : "events are"} at a location that isn&apos;t on
          the map yet: {unmatched.map((e) => `${e.title} (${e.locationName ?? "no location"})`).join(", ")}.
        </p>
      )}
    </div>
  );
}
