/**
 * Public helper contracts for events/details.
 * @module lib/events/details
 */
/*
 * lib/events/details.js
 *
 * PURPOSE:
 * What the event details page (components/gatoraid/EventDetails.js) shows
 * about an event (R3.1, R3.2, R3.6). No React or Supabase imports, so it can
 * be tested on its own (tests/event-details.test.mjs).
 */

// R3.6: where an event is in its life: "cancelled", "completed", "ongoing" or
// "upcoming". A stored status of cancelled or completed always wins.
/**
 * Derive the event phase from stored status and timestamps. This helper is not yet used by the details UI.
 * @function eventPhase
 * @memberof module:lib/events/details
 * @static
 * @param {Object} event - Status and event timestamps.
 * @param {Date} now - Reference time.
 * @returns {string} Cancelled, completed, ongoing or upcoming phase.
 */
export function eventPhase(event, now = new Date()) {
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "completed") return "completed";
  const time = now.getTime();
  if (new Date(event.end_date_time).getTime() <= time) return "completed";
  if (new Date(event.start_date_time).getTime() <= time) return "ongoing";
  return "upcoming";
}

export const PHASE_LABELS = Object.freeze({
  upcoming: "Upcoming",
  ongoing: "Happening now",
  completed: "Completed",
  cancelled: "Cancelled",
});

// R3.1: the organizer's name; we don't verify SFSU clubs yet.
/**
 * Return the organizer name or a generic organizer label.
 * @function hostLabel
 * @memberof module:lib/events/details
 * @static
 * @param {string} hostName - Optional organizer name.
 * @returns {string} Display label.
 */
export function hostLabel(hostName) {
  return hostName || "GatorAid organizer";
}

// R3.1: a mailto link to the organizer with the event in the subject, or null.
/**
 * Build an organizer email link with the event title as subject.
 * @function contactHref
 * @memberof module:lib/events/details
 * @static
 * @param {Object} event - Event title and contact email.
 * @returns {?string} Email link, or null without a contact address.
 */
export function contactHref(event) {
  if (!event.contact_email) return null;
  return "mailto:" + event.contact_email + "?subject=" + encodeURIComponent("Question about " + event.title);
}

// R3.1: the capacity line on the registration card.
/**
 * Format capacity or return the open-capacity label.
 * @function capacityText
 * @memberof module:lib/events/details
 * @static
 * @param {number} capacity - Optional attendee capacity.
 * @returns {string} Capacity label.
 */
export function capacityText(capacity) {
  return capacity ? capacity + " attendee capacity" : "Open capacity";
}

// R3.2: "Building, Room" for the location section.
/**
 * Combine the building and optional room number.
 * @function locationLine
 * @memberof module:lib/events/details
 * @static
 * @param {Object} location - Optional building record.
 * @param {string} roomNumber - Optional room label.
 * @returns {string} Location label with a TBA fallback.
 */
export function locationLine(location, roomNumber) {
  const building = location?.building_name || "Location TBA";
  return building + (roomNumber ? ", " + roomNumber : "");
}

// R3.2 / R6.3: the Campus Map link that highlights this event's place.
/**
 * Build a campus map link selecting a place and optional event.
 * @function mapHref
 * @memberof module:lib/events/details
 * @static
 * @param {string} placeId - Optional place identifier.
 * @param {string} eventId - Optional event identifier.
 * @returns {string} Encoded campus map URL.
 */
export function mapHref(placeId, eventId) {
  if (!placeId) return "/map";
  return `/map?place=${encodeURIComponent(placeId)}${eventId ? `&event=${encodeURIComponent(eventId)}` : ""}`;
}

// Where "Back" goes on the details page.
/**
 * Choose the back destination for previews, assistant visits or ordinary event visits.
 * @function backLink
 * @memberof module:lib/events/details
 * @static
 * @param {Object} options - Preview flag and navigation source.
 * @returns {Object} Back link href and label.
 */
export function backLink({ preview = false, from = null } = {}) {
  if (preview) return { href: "/host/events", label: "Back to your events" };
  if (from === "assistant") return { href: "/assistant", label: "Back to chat with Allison" };
  return { href: "/events", label: "Back to events" };
}
