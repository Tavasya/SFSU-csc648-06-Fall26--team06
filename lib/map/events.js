/*
 * lib/map/events.js
 *
 * PURPOSE:
 * Plain helper functions for the Campus Map's events (no React, no Supabase).
 * Keeping them here lets the server loader (lib/map/page-data.js), the map
 * components and the tests (tests/map-events.test.mjs) all share the same code.
 *
 * Imports use relative paths (not "@/...") so Node's test runner can load
 * this file directly.
 */

import { BUILDINGS, PLACES, VENUES } from "./buildings.js";

const TIME_ZONE = "America/Los_Angeles";

// "2026-10-22" style dates in Pacific time.
const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "4:48 PM" style times in Pacific time.
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

// Connects a Supabase locations.building_name to a place on the map.
// Buildings and outdoor spaces point to their own shape. Venues (rooms)
// point to their parent building, plus their own venueId, because rooms
// don't have a separate shape on the 2D map.
export function buildLocationLookup(buildings = BUILDINGS, places = PLACES, venues = VENUES) {
  return new Map([
    ...[...buildings, ...places]
      .filter((b) => b.locationName)
      .map((b) => [b.locationName, { mapId: b.id, venueId: null }]),
    ...venues.map((v) => [v.locationName, { mapId: v.parentId, venueId: v.id }]),
  ]);
}

// Turns one row from the Supabase "events" query into the shape the map uses.
//  - categoryNames: Map of category id -> name
//  - lookup:        result of buildLocationLookup()
//  - coverUrls:     Map of cover_path -> signed image URL (optional)
// Returns { event, matched }; matched is false when the location isn't on the map.
export function toMapEvent(row, { categoryNames, lookup, coverUrls = new Map() }) {
  const buildingName = row.location?.building_name ?? null;
  const place = lookup.get(buildingName);
  const start = new Date(row.start_date_time);
  const end = new Date(row.end_date_time);

  const event = {
    id: row.id,
    title: row.title,
    date: dateFormat.format(start),
    endDate: dateFormat.format(end),
    startTime: timeFormat.format(start),
    endTime: timeFormat.format(end),
    tags: (row.category_ids ?? []).map((id) => categoryNames.get(id)).filter(Boolean),
    rsvpCount: null, // no RSVP table yet
    roomNumber: row.room_number || "",
    locationName: buildingName,
    mapId: place?.mapId ?? null,
    venueId: place?.venueId ?? null,
    // Shown in the event detail view of the side panel
    description: row.description ?? "",
    locationDescription: row.location?.description ?? "",
    audience: row.audience || "All students",
    admissionType: row.admission_type === "paid" ? "paid" : "free",
    capacity: row.capacity ?? null,
    rsvpRequired: Boolean(row.rsvp_required),
    wheelchairAccessible: Boolean(row.wheelchair_accessible),
    aslAvailable: Boolean(row.asl_available),
    contactEmail: row.contact_email || "",
    coverUrl: (row.cover_path && coverUrls.get(row.cover_path)) || null,
  };
  return { event, matched: Boolean(place) };
}

// Which buildings have a 3D room scan, from the Supabase locations marked
// has_3d_view. Returns { [mapId]: ["room name", ...] }. A building marked
// as a whole gets its own name, a venue (room) gets the room's name.
export function buildScanIndex(locationRows, lookup) {
  const scans = {};
  for (const row of locationRows ?? []) {
    const place = lookup.get(row.building_name);
    if (!place) continue;
    (scans[place.mapId] ??= []).push(row.building_name);
  }
  return scans;
}

export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Check whether an event belongs in the selected time range.
// Multi-day events remain visible until their end date has passed.
// "Today" includes events that started earlier but have not finished,
// while "This week" includes events starting on or before Sunday.
//  range: "today" | "week" | "all"
export function inRange(event, range, today) {
  const todayStr = ymd(today);
  const endDate = event.endDate ?? event.date;
  if (endDate < todayStr) return false;
  if (range === "today") return event.date <= todayStr;
  if (range === "week") {
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + ((7 - today.getDay()) % 7));
    return event.date <= ymd(sunday);
  }
  return true;
}

const VENUE_NAMES = new Map(VENUES.map((v) => [v.id, v.name]));

// Groups a building's events by room: named venues first (A-Z), then
// events with no venue under "Elsewhere in this building".
export function groupEventsByVenue(events) {
  const groups = new Map();
  for (const event of events) {
    const key = event.venueId ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return [...groups.entries()]
    .map(([venueId, groupEvents]) => ({
      venueId,
      label: venueId ? VENUE_NAMES.get(venueId) ?? venueId : "Elsewhere in this building",
      events: groupEvents,
    }))
    .sort((a, b) => (!a.venueId ? 1 : !b.venueId ? -1 : a.label.localeCompare(b.label)));
}

// "2026-10-22" -> Date at noon, so the weekday never shifts with time zones.
const atNoon = (date) => new Date(`${date}T12:00:00`);

// "Thu, Oct 22 · 4:48 PM – 6:00 PM", or for multi-day events
// "Thu, Oct 22, 4:48 PM – Wed, Oct 28, 4:48 PM".
export function formatWhen(event) {
  const day = (date) =>
    atNoon(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (event.endDate && event.endDate !== event.date) {
    return `${day(event.date)}, ${event.startTime} – ${day(event.endDate)}, ${event.endTime}`;
  }
  return `${day(event.date)} · ${event.startTime} – ${event.endTime}`;
}

// "Thursday, October 22, 2026", or "Thursday, October 22 – Wednesday, October 28, 2026".
// Same wording as the full event page (components/gatoraid/EventDetails.js).
export function formatLongDate(event) {
  const long = (date, withYear) =>
    atNoon(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    });
  if (event.endDate && event.endDate !== event.date) {
    return `${long(event.date, false)} – ${long(event.endDate, true)}`;
  }
  return long(event.date, true);
}
