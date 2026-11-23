/**
 * Public interfaces supporting R3.4.
 * @module lib/events/attendance
 */
/*
 * lib/events/attendance.js
 *
 * PURPOSE:
 * RSVP capacity: how many people are attending, and whether an event is full.
 * The counts come from the event_attendance() database function
 * (supabase/migrations/20261107130000_rsvp_capacity.sql). Until that function
 * exists, or if it fails, counts are unknown and events are never shown as full;
 * the database trigger in the same migration is what finally enforces capacity.
 */

export const FULL_MESSAGE = "RSVP capacity has been reached.";

// { event_id -> attending count } for these events.
/**
 * Load aggregate attendance counts; return an empty map when counts cannot be fetched.
 * @function loadAttendance
 * @memberof module:lib/events/attendance
 * @static
 * @param {Object} db - Session-scoped database client.
 * @param {Array<string>} eventIds - Event IDs whose counts should be loaded.
 * @returns {Promise<Map>} A map of event IDs to attendance counts; an empty map on failure.
 */
export async function loadAttendance(db, eventIds) {
  if (!eventIds.length) return new Map();
  try {
    const { data, error } = await db.rpc("event_attendance", { event_ids: eventIds });
    if (error) return new Map();
    return new Map(data.map((row) => [row.event_id, Number(row.attending)]));
  } catch {
    return new Map(); // counts are extra information; never break the page over them
  }
}

// True when the event has a capacity and every spot is taken.
/**
 * Check capacity only when both capacity and attendance counts are known.
 * @function isFull
 * @memberof module:lib/events/attendance
 * @static
 * @param {?number} capacity - Maximum attendance, or null when unlimited.
 * @param {?number} attending - Known attending count, or null when unavailable.
 * @returns {boolean} Whether a known attendance count reaches a known capacity.
 */
export function isFull(capacity, attending) {
  return capacity != null && attending != null && attending >= capacity;
}
