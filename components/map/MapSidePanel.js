/*
 * components/map/MapSidePanel.js
 *
 * PURPOSE: 
 * Provides a detailed view of events on a side panel. 
 *
 */

"use client";

import { ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react";
import { getCampusFeature } from "@/components/map/Map";
import MapEventDetail, { coverFor } from "@/components/map/MapEventDetail";
import RoomScansCard from "@/components/rooms/RoomScansCard";
import { formatWhen, groupEventsByVenue } from "@/lib/map/events";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// One event in a building's list. Clicking it opens the event detail view.
// (Only <span>s inside the button, because headings and <div>s aren't allowed in buttons.)
function EventRow({ event, onOpen }) {
  const { Icon, style } = coverFor(event);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(event.id)}
        className="flex w-full items-start gap-3 rounded-[13px] border border-[#ebe7f0] bg-white p-3 text-left transition hover:border-[#d9cfe8] hover:bg-[#fbfafd] focus-visible:outline-2 focus-visible:outline-[#604398]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={style}>
          <Icon size={22} className="text-white" aria-hidden="true" />
        </span>
        <span className="block min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-snug text-[#262332]">{event.title}</span>
          <span className="mt-0.5 block text-[12px] text-[#777180]">
            {formatWhen(event)}
            {event.roomNumber ? ` · ${event.roomNumber}` : ""}
          </span>
          <span className="rounded-md bg-[#fff4d1] px-2 py-0.5 text-[11px] font-medium text-[#78672e]">
              {event.admissionType === "paid" ? "Paid" : "Free"}
            </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            {(event.tags ?? []).slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-md bg-[#f6f0fc] px-2 py-0.5 text-[11px] font-medium text-[#604398]">
                {tag}
              </span>
            ))}
            {event.rsvpCount != null && (
              <span className="flex items-center gap-1 text-[11px] text-[#777180]">
                <Users size={12} aria-hidden="true" />
                {event.rsvpCount} going
              </span>
            )}
          </span>
        </span>
        <ChevronRight size={16} className="mt-1 shrink-0 text-[#777180]" aria-hidden="true" />
      </button>
    </li>
  );
}

export default function MapSidePanel({
  selection, // null, or { id, name, venue, parent, events, scannedRooms }
  buildings, // [{ id, name, count, has3D }] buildings with events in range
  rangeText, // "today" | "this week" | "coming up"
  isSample = false, // true when showing the demo events
  onSelect,
  onBack,
  openEvent = null, // the event shown in the detail view, or null for the list
  onOpenEvent,
  onCloseEvent,
}) {
  // Where the open event is: its Supabase location name, or the room / building on the map.
  const openEventPlace =
    openEvent &&
    (openEvent.locationName ?? getCampusFeature(openEvent.venueId ?? openEvent.mapId)?.name);

  return (
    <aside className="w-full shrink-0 rounded-[13px] border border-[#ebe7f0] bg-white p-5 lg:w-90">
      {!selection ? (
        <>
          <h2 className="text-[18px] font-[650] text-[#262332]">Buildings with events {rangeText}</h2>
          {buildings.length === 0 ? (
            <p className="mt-3 text-[13px] text-[#777180]">
              No events {rangeText}. Try a different time range or category.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[#ebe7f0]">
              {buildings.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(b.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-1 py-3 text-left transition hover:bg-[#f7f5fb] focus-visible:outline-2 focus-visible:outline-[#604398]"
                  >
                    <MapPin size={18} className="text-[#604398]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-[#262332]">{b.name}</span>
                      <span className="block text-[12px] text-[#777180]">
                        {plural(b.count, "upcoming event")}
                        {b.has3D ? " · 3D room" : ""}
                      </span>
                    </span>
                    <ChevronRight size={16} className="text-[#777180]" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : openEvent ? (
        <MapEventDetail
          event={openEvent}
          placeName={openEventPlace}
          backLabel={selection.name}
          isSample={isSample}
          onBack={onCloseEvent}
        />
      ) : (
        <>
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 flex items-center gap-1 rounded px-1 py-1 text-[13px] font-medium text-[#604398] hover:text-[#503581] focus-visible:outline-2 focus-visible:outline-[#604398]"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back to full map
          </button>
          <h2 className="mt-2 text-[20px] font-bold leading-tight tracking-[-0.3px] text-[#262332]">
            {selection.name}
          </h2>

          {/* A venue says which building it's in. That building is highlighted. */}
          {selection.venue && selection.parent && (
            <p className="mt-1 text-[13px] text-[#51475f]">
              {selection.venue.relation === "at" ? "At " : "Inside "}
              <button
                type="button"
                onClick={() => onSelect(selection.parent.id)}
                className="font-medium text-[#604398] underline underline-offset-2 hover:text-[#503581] focus-visible:outline-2 focus-visible:outline-[#604398]"
              >
                {selection.parent.name}
              </button>{" "}
              (highlighted on the map)
            </p>
          )}

          <p className="mt-2 text-[13px] text-[#777180]">
            {plural(selection.events.length, "upcoming event")} {rangeText}
            {isSample ? " · sample data" : ""}
          </p>

          <div className="mt-4">
            {selection.events.length === 0 && (
              <p className="rounded-[13px] border border-dashed border-[#ebe7f0] p-4 text-center text-[13px] text-[#777180]">
                No upcoming events here {rangeText}.
              </p>
            )}
            {groupEventsByVenue(selection.events).map((group, i, groups) => (
              <section key={group.venueId || "elsewhere"} className="mb-4">
                {!selection.venue && (groups.length > 1 || group.venueId) && (
                  <h3 className="mb-2 flex items-center justify-between text-[12px] font-semibold uppercase tracking-wide text-[#604398]">
                    <span>{group.label}</span>
                    <span className="font-normal normal-case tracking-normal text-[#777180]">
                      {plural(group.events.length, "event")}
                    </span>
                  </h3>
                )}
                <ul className="space-y-2.5">
                  {group.events.map((event) => (
                    <EventRow key={event.id} event={event} onOpen={onOpenEvent} />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* Only buildings with a scanned room (Supabase "rooms" table) show this card. */}
          {selection.scannedRooms.length > 0 && (
            <div className="mt-2">
              <RoomScansCard rooms={selection.scannedRooms} />
            </div>
          )}
        </>
      )}
    </aside>
  );
}
