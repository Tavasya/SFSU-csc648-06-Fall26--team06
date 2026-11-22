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
export function eventLocations(events) {
  return [
    ...new Set(events.map((event) => event.locations?.building_name).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
}

// Schedule availability for one event, or "unknown" until the schedule is ready.
export function availabilityFor(event, schedule, scheduleStatus) {
  return scheduleStatus === "ready"
    ? getScheduleAvailability(event, schedule)
    : { status: "unknown", conflicts: [] };
}

// Events matching every active filter. Keyword search looks at the title,
// description, building and category names, ignoring case. Events the signed-in
// user hosts (hosted_by_you) only appear when showMine is on.
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
export function hasActiveFilters({ query, category, date, location, access, scheduleFilter }) {
  return Boolean(query || category || date || location || access || scheduleFilter !== "all");
}
