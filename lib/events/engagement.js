/*
 * lib/events/engagement.js
 *
 * PURPOSE:
 * How many people saved or RSVP'd to a host's events, shared by the My Events
 * dashboard (app/(platform)/host/events/page.js) and GET /api/host/events, so
 * both always show the same numbers.
 *
 * The counts come from the event_engagement() database function
 * (supabase/migrations/20261020130000_host_event_engagement.sql). It returns
 * counts only, never who, and only for the signed-in host's own events.
 *
 * Imports nothing, so Node's test runner can load this file directly.
 */

// Adds `engagement: { saves, attending, interested }` to each event.
//  - rows: what event_engagement() returned ([{ event_id, saves, attending, interested }]),
//          or null when the counts couldn't be loaded (each event then gets
//          engagement: null, so the page can show "—" instead of a wrong 0)
export function attachEngagement(events, rows) {
  const byId = new Map((rows ?? []).map((row) => [row.event_id, row]));
  return events.map((event) => {
    if (!rows) return { ...event, engagement: null };
    const row = byId.get(event.id);
    return {
      ...event,
      engagement: {
        saves: Number(row?.saves ?? 0),
        attending: Number(row?.attending ?? 0),
        interested: Number(row?.interested ?? 0),
      },
    };
  });
}

// Loads the counts for these events and adds them (see attachEngagement).
// Counts are extra information, so if they can't be loaded the events still
// come back, with engagement: null.
export async function withEngagement(db, events) {
  if (!events.length) return events;
  const { data, error } = await db.rpc("event_engagement", {
    event_ids: events.map((event) => event.id),
  });
  if (error) console.warn("Event engagement unavailable:", error.message);
  return attachEngagement(events, error ? null : data);
}

// Totals across events, for the dashboard cards. null when the counts
// couldn't be loaded.
export function engagementTotals(events) {
  if (events.some((event) => event.engagement === null)) return null;
  return events.reduce(
    (total, { engagement }) => ({
      saves: total.saves + (engagement?.saves ?? 0),
      attending: total.attending + (engagement?.attending ?? 0),
      interested: total.interested + (engagement?.interested ?? 0),
    }),
    { saves: 0, attending: 0, interested: 0 },
  );
}
