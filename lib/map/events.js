/**
 * Public interfaces supporting R3.2, R6.3.
 * @module lib/map/events
 */
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

import { isFull } from "../events/attendance.js";

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
//  - campusPlaces: { buildings, places, venues } from toCampusPlaces() (lib/map/places.js)
/**
 * Index building names to map shapes and venue IDs, assigning rooms to their parent buildings.
 * @function buildLocationLookup
 * @memberof module:lib/map/events
 * @static
 * @param {Object} [options] - Grouped function options.
 * @param {*} [options.buildings] - Campus building records.
 * @param {*} [options.places] - Campus buildings, outdoor places and venues.
 * @param {*} [options.venues] - Named campus venues.
 * @returns {Map} A map from building name to { mapId, venueId }.
 */
export function buildLocationLookup({ buildings = [], places = [], venues = [] } = {}) {
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
/**
 * Convert a database event into map display data and report whether its location matched.
 * @function toMapEvent
 * @memberof module:lib/map/events
 * @static
 * @param {*} row - The row input.
 * @param {Object} options - Grouped function options.
 * @param {*} options.categoryNames - Category ID to display-name lookup.
 * @param {*} options.lookup - Building-name to map-location lookup.
 * @param {*} [options.coverUrls] - Cover-image path to signed-URL lookup.
 * @param {*} [options.hostNames] - Host ID to display-name lookup.
 * @param {*} [options.attendance] - Event ID to known attending count.
 * @param {*} [options.userId] - Current viewer ID for identifying self-hosted events.
 * @returns {Object} The prepared event and a matched flag as { event, matched }.
 */
export function toMapEvent(
  row,
  { categoryNames, lookup, coverUrls = new Map(), hostNames = new Map(), attendance = new Map(), userId = null },
) {
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
    hostId: row.host_id ?? null,
    hostName: hostNames.get(row.host_id) || "",
    // The signed-in user created this event (hidden unless they choose "Show my events")
    hostedByYou: Boolean(userId) && row.host_id === userId,
    // RSVP capacity (lib/events/attendance.js); attendingCount is null when unknown
    attendingCount: attendance.get(row.id) ?? null,
    full: isFull(row.capacity, attendance.get(row.id) ?? null),
    // For the Save / RSVP buttons (components/student/EventActions.js)
    status: row.status ?? "active",
    startDateTime: row.start_date_time,
    endDateTime: row.end_date_time,
    coverUrl: (row.cover_path && coverUrls.get(row.cover_path)) || null,
  };
  return { event, matched: Boolean(place) };
}

// Which buildings have a 3D room scan, from the Supabase "rooms" table.
// Each row: { id, room_name, scan_date, model_view_path, location: { building_name } }
// (location comes from rooms.location_id -> locations).
// Returns { [mapId]: [{ id, name, scanDate, venueId, modelPath }] }; rooms whose
// location isn't on the map are left out. modelPath is the scan file, which
// decides the viewer (.glb: Unity, .spz: Spark; see lib/rooms/model.js).
/**
 * Group available room scans by mapped building; omit rooms without a matching location.
 * @function buildScanIndex
 * @memberof module:lib/map/events
 * @static
 * @param {Array<Object>} roomRows - Room scan rows joined to their locations.
 * @param {Map} lookup - Building-name to map-location lookup.
 * @returns {Object} Room-scan arrays keyed by map building ID.
 */
export function buildScanIndex(roomRows, lookup) {
  const scans = {};
  for (const row of roomRows ?? []) {
    const place = lookup.get(row.location?.building_name);
    if (!place) continue;
    (scans[place.mapId] ??= []).push({
      id: row.id,
      name: row.room_name,
      scanDate: row.scan_date ?? null,
      venueId: place.venueId,
      modelPath: row.model_view_path ?? null,
    });
  }
  return scans;
}

// Is this a building / outdoor space / room id the map knows? Used to check
// ?place= in /map links before using it.
/**
 * Check whether a map ID belongs to a supported building, outdoor place or venue.
 * @function isMapPlace
 * @memberof module:lib/map/events
 * @static
 * @param {string} id - Identifier to look up.
 * @param {Object} [options] - Grouped function options.
 * @param {*} [options.buildings] - Campus building records.
 * @param {*} [options.places] - Campus buildings, outdoor places and venues.
 * @param {*} [options.venues] - Named campus venues.
 * @returns {boolean} Whether the ID appears in the campus place lists.
 */
export const isMapPlace = (id, { buildings = [], places = [], venues = [] } = {}) =>
  [...buildings, ...places, ...venues].some((x) => x.id === id);

// The map place for a Supabase location name ({ mapId, venueId }), or null.
// Used by the event page to show where the event is on the 2D map.
/**
 * Resolve a database building name to map/venue IDs, or null without a match.
 * @function placeForLocation
 * @memberof module:lib/map/events
 * @static
 * @param {string} buildingName - Database building name to resolve.
 * @param {Map} lookup - Building-name to map-location lookup.
 * @returns {?Object} The matched { mapId, venueId }, or null.
 */
export function placeForLocation(buildingName, lookup) {
  return lookup.get(buildingName) ?? null;
}

/**
 * Format a Date using local calendar fields as a YYYY-MM-DD day key.
 * @function ymd
 * @memberof module:lib/map/events
 * @static
 * @param {Date} d - Date whose local calendar fields should be formatted.
 * @returns {string} A local YYYY-MM-DD day key.
 */
export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Check whether an event belongs in the selected time range.
// Multi-day events remain visible until their end date has passed.
// "Today" includes events that started earlier but have not finished,
// while "This week" includes events starting on or before Sunday.
//  range: "today" | "week" | "all"
/**
 * Filter map events by today, this week or all dates while retaining ongoing multi-day events.
 * @function inRange
 * @memberof module:lib/map/events
 * @static
 * @param {Object} event - Event record or display model used by this function.
 * @param {string} range - Selected range: today, week or all.
 * @param {Date} today - Reference local calendar date.
 * @returns {boolean} Whether the event belongs in the requested map date range.
 */
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

// Groups a building's events by room: named venues first (A-Z), then
// events with no venue under "Elsewhere in this building".
//  - venueMap: Map of venue map_id -> { name } (from createCampus in lib/map/places.js)
/**
 * Group events into named venue sections, placing unnamed-room events last.
 * @function groupEventsByVenue
 * @memberof module:lib/map/events
 * @static
 * @param {Array<Object>} events - Events to transform or display.
 * @param {Map} [venueMap] - Venue metadata indexed by map ID.
 * @returns {Array<Object>} Sorted groups containing venueId, label and events.
 */
export function groupEventsByVenue(events, venueMap = new Map()) {
  const groups = new Map();
  for (const event of events) {
    const key = event.venueId ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return [...groups.entries()]
    .map(([venueId, groupEvents]) => ({
      venueId,
      label: venueId ? venueMap.get(venueId)?.name ?? venueId : "Elsewhere in this building",
      events: groupEvents,
    }))
    .sort((a, b) => (!a.venueId ? 1 : !b.venueId ? -1 : a.label.localeCompare(b.label)));
}

// "2026-10-22" -> Date at noon, so the weekday never shifts with time zones.
const atNoon = (date) => new Date(`${date}T12:00:00`);

// "Thu, Oct 22 · 4:48 PM – 6:00 PM", or for multi-day events
// "Thu, Oct 22, 4:48 PM – Wed, Oct 28, 4:48 PM".
/**
 * Format a map event's date/time range, including both dates for multi-day events.
 * @function formatWhen
 * @memberof module:lib/map/events
 * @static
 * @param {Object} event - Event record or display model used by this function.
 * @returns {string} A human-readable date and time range.
 */
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
/**
 * Format a map event's full calendar date or multi-day date range.
 * @function formatLongDate
 * @memberof module:lib/map/events
 * @static
 * @param {Object} event - Event record or display model used by this function.
 * @returns {string} A human-readable full date or date range.
 */
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
