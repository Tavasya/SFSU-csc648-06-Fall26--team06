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
export function isFull(capacity, attending) {
  return capacity != null && attending != null && attending >= capacity;
}
