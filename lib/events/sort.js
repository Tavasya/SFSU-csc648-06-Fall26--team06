/*
 * lib/events/sort.js
 *
 * Sort orders for the event lists on Explore and For you
 * (components/gatoraid/EventSearch.js). No imports, so it can be tested on
 * its own. Events only store free or paid (no price), so "cost" sorts put
 * free or paid events first. Ties always fall back to the soonest event.
 * sortNote() explains when a sort can't change the order (say, "Cost: paid
 * first" when every event is free), so the list doesn't look broken.
 */

// Options shown in the Sort menu. "match" and "fits" only appear when the list
// knows the student's interests or schedule.
export const SORT_OPTIONS = [
  { id: "match", label: "Best match for your interests", needs: "interests" },
  { id: "fits", label: "Fits your schedule first", needs: "schedule" },
  { id: "soonest", label: "Date: soonest first" },
  { id: "latest", label: "Date: latest first" },
  { id: "az", label: "Title: A to Z" },
  { id: "za", label: "Title: Z to A" },
  { id: "free", label: "Cost: free first" },
  { id: "paid", label: "Cost: paid first" },
  { id: "newest", label: "Recently added" },
];

const time = (value) => new Date(value).getTime() || 0;
const bySoonest = (a, b) => time(a.start_date_time) - time(b.start_date_time);
const title = (event) => String(event.title ?? "");
const isFree = (event) => (event.admission_type === "free" ? 0 : 1);

// options.interestIds: the student's interest category ids (for "match")
// options.fits(event): true when the event fits the student's schedule (for "fits")
export function sortEvents(events, sort, { interestIds = [], fits = () => false } = {}) {
  const interests = new Set(interestIds);
  const shared = (event) => (event.category_ids ?? []).filter((id) => interests.has(id)).length;

  const compare = {
    match: (a, b) => shared(b) - shared(a),
    fits: (a, b) => Number(fits(b)) - Number(fits(a)),
    soonest: () => 0,
    latest: (a, b) => -bySoonest(a, b),
    az: (a, b) => title(a).localeCompare(title(b), undefined, { sensitivity: "base" }),
    za: (a, b) => title(b).localeCompare(title(a), undefined, { sensitivity: "base" }),
    free: (a, b) => isFree(a) - isFree(b),
    paid: (a, b) => isFree(b) - isFree(a),
    newest: (a, b) => time(b.created_at) - time(a.created_at),
  }[sort] ?? (() => 0);

  return [...events].sort((a, b) => compare(a, b) || bySoonest(a, b));
}

// A short message when every event ties on the chosen sort, or null.
export function sortNote(events, sort, { interestIds = [], fits = () => false } = {}) {
  if (events.length < 2) return null;
  const same = (key) => new Set(events.map(key)).size === 1;
  const fallback = ", so this sort doesn't change the order. Showing soonest first.";

  if ((sort === "free" || sort === "paid") && same(isFree)) {
    return `All of these events are ${isFree(events[0]) ? "paid" : "free"}${fallback}`;
  }
  if (sort === "fits" && same((event) => Boolean(fits(event)))) {
    return `${fits(events[0]) ? "All" : "None"} of these events fit your schedule${fallback}`;
  }
  if (sort === "match") {
    const interests = new Set(interestIds);
    if (same((event) => (event.category_ids ?? []).filter((id) => interests.has(id)).length)) {
      return `These events match your interests equally${fallback}`;
    }
  }
  return null;
}
