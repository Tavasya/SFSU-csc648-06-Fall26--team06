/*
 * lib/home/home.js
 *
 * PURPOSE:
 * Home Dashboard logic (R1), shared by the home page (app/page.js) and tested
 * on its own (tests/home.test.mjs):
 *  - R1.1 QUICK_LINKS: where the home page sends students
 *  - R1.2 pickHomeEvents / homeEventCard: which upcoming events are shown and
 *    what each card says
 *  - R1.3 searchHome: one search box for events and campus places
 * No imports of React or Supabase, so Node's test runner can load it.
 */
import { orderedCategoryNames } from "../events/banner.js";

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const HOME_EVENT_COUNT = 6;

// R1.1: the main destinations the home page links to.
export const QUICK_LINKS = Object.freeze({
  explore: "/events",
  forYou: "/events/for-you",
  map: "/map",
  assistant: "/assistant",
});

const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

// R1.2: this week's events (soonest first), or the next ones coming up when
// nothing is on this week. Ended, cancelled and unpublished events are left out
// in case the caller didn't filter them already.
export function pickHomeEvents(events, now = new Date(), count = HOME_EVENT_COUNT) {
  const time = now.getTime();
  const upcoming = (events ?? [])
    .filter(
      (event) =>
        (event.status ?? "active") === "active" &&
        (event.publication_status ?? "published") === "published" &&
        new Date(event.end_date_time).getTime() >= time,
    )
    .sort((a, b) => new Date(a.start_date_time) - new Date(b.start_date_time));
  const thisWeek = upcoming.filter(
    (event) => new Date(event.start_date_time).getTime() <= time + WEEK_MS,
  );
  return {
    events: (thisWeek.length ? thisWeek : upcoming).slice(0, count),
    isThisWeek: thisWeek.length > 0,
  };
}

// R1.2: what an event card on the home page shows.
export function homeEventCard(event, categories) {
  const start = new Date(event.start_date_time);
  const tags = orderedCategoryNames(event.category_ids, categories);
  return {
    href: `/events/${event.id}`,
    title: event.title,
    date: dayFormat.format(start),
    time: timeFormat.format(start),
    location: event.locations?.building_name ?? "Location TBA",
    category: tags[0] ?? null,
    tags,
    admission: event.admission_type === "free" ? "Free" : "Paid",
  };
}

// R1.3: matches a home-page search against event titles/descriptions/buildings
// and campus place names, with links straight to the result.
//  - places: Campus Map places ({ id, name, ... }) from lib/map/places.js
export function searchHome(query, { events = [], places = [], limit = 5 } = {}) {
  const words = String(query ?? "").toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { events: [], places: [], allEventsHref: QUICK_LINKS.explore };
  const matches = (text) => {
    const haystack = text.toLowerCase();
    return words.every((word) => haystack.includes(word));
  };
  return {
    events: events
      .filter((event) =>
        matches([event.title, event.description, event.locations?.building_name].filter(Boolean).join(" ")),
      )
      .slice(0, limit)
      .map((event) => ({ id: event.id, title: event.title, href: `/events/${event.id}` })),
    places: places
      .filter((place) => matches([place.name, place.label, place.code].filter(Boolean).join(" ")))
      .slice(0, limit)
      .map((place) => ({ id: place.id, name: place.name, href: `${QUICK_LINKS.map}?place=${encodeURIComponent(place.id)}` })),
    allEventsHref: `${QUICK_LINKS.explore}?q=${encodeURIComponent(words.join(" "))}`,
  };
}
