/**
 * Search and filter helpers supporting R2.2.
 * @module lib/events/search
 */
/*
 * lib/events/search.js
 *
 * Search and filter logic for Explore All Events (R2.2), used by
 * components/gatoraid/EventSearch.js. Kept free of React so Node's test
 * runner can load it directly (tests/event-search.test.mjs).
 */
import { orderedCategoryNames } from "./banner.js";
import { getScheduleAvailability } from "../schedule/conflicts.js";

export const EMPTY_FILTERS = Object.freeze({
  query: "",
  category: "",
  date: "",
  location: "",
  access: "", // "", "wheelchair", "asl" or "both"
  scheduleFilter: "all",
  showMine: false, // events the user hosts are hidden unless this is on
});

// "YYYY-MM-DD" of an instant in campus time, matching <input type="date">.
/**
 * Convert an instant to the campus calendar date used by date filters.
 * @function dateInPacificTime
 * @memberof module:lib/events/search
 * @static
 * @param {string|number|Date} value - Timestamp accepted by Date.
 * @returns {string} Pacific calendar date in YYYY-MM-DD format.
 */
export function dateInPacificTime(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const part = (type) => parts.find((item) => item.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Building names for the location dropdown: unique and A-Z.
/**
 * Collect unique building names for the event location picker.
 * @function eventLocations
 * @memberof module:lib/events/search
 * @static
 * @param {Array<Object>} events - Events with optional joined location records.
 * @returns {Array<string>} Building names sorted alphabetically, omitting missing names.
 */
export function eventLocations(events) {
  return [
    ...new Set(events.map((event) => event.locations?.building_name).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
}

// Schedule availability for one event, or "unknown" until the schedule is ready.
/**
 * Check event availability only after the student's schedule is ready.
 * @function availabilityFor
 * @memberof module:lib/events/search
 * @static
 * @param {Object} event - Event with start and end timestamps.
 * @param {Array<Object>} schedule - Confirmed schedule commitments.
 * @param {string} scheduleStatus - Schedule loading state.
 * @returns {Object} Availability status and conflicts; unknown when not ready.
 */
export function availabilityFor(event, schedule, scheduleStatus) {
  return scheduleStatus === "ready"
    ? getScheduleAvailability(event, schedule)
    : { status: "unknown", conflicts: [] };
}

// Events matching every active filter. Keyword search looks at the title,
// description, building and category names, ignoring case. Events the signed-in
// user hosts (hosted_by_you) only appear when showMine is on.
/**
 * Apply combined keyword, category, date, location, accessibility and schedule filters.
 * @function filterEvents
 * @memberof module:lib/events/search
 * @static
 * @param {Array<Object>} events - Events to filter without mutating the input array.
 * @param {Array<Object>} categories - Available category IDs and display names.
 * @param {Object} [filters] - Active filters; defaults to EMPTY_FILTERS.
 * @param {string} [filters.query] - Case-insensitive keyword search.
 * @param {string} [filters.category] - Required category display name.
 * @param {string} [filters.date] - Required Pacific start date in YYYY-MM-DD format.
 * @param {string} [filters.location] - Required building name.
 * @param {string} [filters.access] - Accessibility selection: wheelchair, asl or both.
 * @param {string} [filters.scheduleFilter] - All events or only available events.
 * @param {boolean} [filters.showMine] - Include the viewer's own hosted events.
 * @param {Object} [options] - Schedule data and its loading state.
 * @param {Array<Object>} [options.schedule] - Confirmed schedule commitments.
 * @param {string} [options.scheduleStatus] - Schedule loading state.
 * @returns {Array<Object>} Events matching every selected filter, in their original order.
 */
export function filterEvents(events, categories, filters = EMPTY_FILTERS, { schedule = [], scheduleStatus = "unused" } = {}) {
  const { query = "", category = "", date = "", location = "", access = "", scheduleFilter = "all", showMine = false } = filters;
  const normalizedQuery = query.trim().toLowerCase();

  return events.filter((event) => {
    if (event.hosted_by_you && !showMine) return false;

    const categoryNames = orderedCategoryNames(event.category_ids, categories);

    const searchableText = [
      event.title,
      event.description,
      event.locations?.building_name,
      ...categoryNames,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
    const matchesCategory = !category || categoryNames.includes(category);
    const matchesDate = !date || dateInPacificTime(event.start_date_time) === date;
    const matchesLocation = !location || event.locations?.building_name === location;
    const matchesAccess =
      !access ||
      ((access === "asl" || event.wheelchair_accessible) &&
        (access === "wheelchair" || event.asl_available));
    const matchesSchedule =
      scheduleFilter === "all" ||
      availabilityFor(event, schedule, scheduleStatus).status === "available";

    return matchesQuery && matchesCategory && matchesDate && matchesLocation && matchesAccess && matchesSchedule;
  });
}

// True when a clearable filter is set (enables "Clear filters"). The
// "Show my events" toggle is separate and not cleared.
/**
 * Decide whether the Clear filters control should be enabled.
 * @function hasActiveFilters
 * @memberof module:lib/events/search
 * @static
 * @param {Object} filters - Current clearable filter state.
 * @param {string} filters.query - Search text.
 * @param {string} filters.category - Selected category.
 * @param {string} filters.date - Selected Pacific date.
 * @param {string} filters.location - Selected building.
 * @param {string} filters.access - Selected accessibility features.
 * @param {string} filters.scheduleFilter - All events or only available events.
 * @returns {boolean} Whether a clearable filter is set; excludes Show my events.
 */
export function hasActiveFilters({ query, category, date, location, access, scheduleFilter }) {
  return Boolean(query || category || date || location || access || scheduleFilter !== "all");
}
