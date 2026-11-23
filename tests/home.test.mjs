// R1 Home Dashboard: quick navigation (R1.1), upcoming events (R1.2) and
// event/location search (R1.3) in lib/home/home.js.
// "Now" is Monday, Nov 2, 2026 at 5 PM campus time.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { HOME_EVENT_COUNT, QUICK_LINKS, WEEK_MS, homeEventCard, pickHomeEvents, searchHome } from "../lib/home/home.js";

const NOW = new Date("2026-11-03T01:00:00Z");
const CATEGORIES = [{ id: "c-tech", name: "Technology" }, { id: "c-art", name: "Arts" }];
const at = (days, hours = 0) => new Date(NOW.getTime() + days * 86400000 + hours * 3600000).toISOString();
const event = (id, startDays, extra = {}) => ({
  id, title: `Event ${id}`, start_date_time: at(startDays), end_date_time: at(startDays, 2),
  status: "active", publication_status: "published", category_ids: [], ...extra,
});

test("R1.1 quick links go to Explore, Recommended for You, the map and Allison", () => {
  assert.deepEqual(QUICK_LINKS, { explore: "/events", forYou: "/events/for-you", map: "/map", assistant: "/assistant" });
  const pages = {
    explore: "app/(platform)/events/page.js",
    forYou: "app/(platform)/events/for-you/page.js",
    map: "app/(platform)/map/page.js",
    assistant: "app/(platform)/assistant/page.js",
  };
  for (const [key, file] of Object.entries(pages)) {
    assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${QUICK_LINKS[key]} has a page (${file})`);
  }
});

test("R1.2 shows this week's upcoming events, soonest first, at most six", () => {
  const events = [event("later", 3), event("soon", 1), ...[2, 4, 5, 6, 6.5].map((d, i) => event(`w${i}`, d)), event("next-month", 30)];
  const { events: shown, isThisWeek } = pickHomeEvents(events, NOW);
  assert.equal(isThisWeek, true);
  assert.equal(shown.length, HOME_EVENT_COUNT);
  assert.deepEqual(shown.slice(0, 3).map((e) => e.id), ["soon", "w0", "later"]);
  assert.ok(!shown.some((e) => e.id === "next-month"));
});

test("R1.2 falls back to the next events when nothing is on this week", () => {
  const { events, isThisWeek } = pickHomeEvents([event("b", 20), event("a", 10)], NOW);
  assert.equal(isThisWeek, false);
  assert.deepEqual(events.map((e) => e.id), ["a", "b"]);
  assert.ok(WEEK_MS === 7 * 86400000);
});

test("R1.2 leaves out ended, cancelled and unpublished events", () => {
  const events = [
    event("ended", -1),
    event("cancelled", 1, { status: "cancelled" }),
    event("draft", 1, { publication_status: "draft" }),
    event("ongoing", 0, { start_date_time: at(0, -1), end_date_time: at(0, 1) }),
    event("ok", 2),
  ];
  assert.deepEqual(pickHomeEvents(events, NOW).events.map((e) => e.id), ["ongoing", "ok"]);
  assert.deepEqual(pickHomeEvents([], NOW), { events: [], isThisWeek: false });
  assert.deepEqual(pickHomeEvents(null, NOW).events, []);
});

test("R1.2 each card shows date, time, location, category, tags and admission, and links to details", () => {
  const card = homeEventCard(
    event("e1", 0, {
      title: "AI Hack Night", start_date_time: "2026-11-04T02:00:00Z", category_ids: ["c-tech", "c-art"],
      locations: { building_name: "Thornton Hall" }, admission_type: "free",
    }),
    CATEGORIES,
  );
  assert.deepEqual(card, {
    href: "/events/e1", title: "AI Hack Night", date: "Tue, Nov 3", time: "6:00 PM",
    location: "Thornton Hall", category: "Technology", tags: ["Technology", "Arts"], admission: "Free",
  });
  const bare = homeEventCard(event("e2", 1, { admission_type: "paid" }), CATEGORIES);
  assert.equal(bare.location, "Location TBA");
  assert.equal(bare.category, null);
  assert.equal(bare.admission, "Paid");
});

test("R1.3 search finds events and campus places and links straight to them", () => {
  const events = [
    event("e1", 1, { title: "AI Hack Night", description: "Build a chatbot", locations: { building_name: "Thornton Hall" } }),
    event("e2", 1, { title: "Art Walk", locations: { building_name: "Fine Arts" } }),
  ];
  const places = [{ id: "thornton", name: "Thornton Hall", code: "TH" }, { id: "library", name: "J. Paul Leonard Library" }];
  const result = searchHome("  thornton ", { events, places });
  assert.deepEqual(result.events, [{ id: "e1", title: "AI Hack Night", href: "/events/e1" }]);
  assert.deepEqual(result.places, [{ id: "thornton", name: "Thornton Hall", href: "/map?place=thornton" }]);
  assert.equal(result.allEventsHref, "/events?q=thornton");
  assert.deepEqual(searchHome("ai chatbot", { events }).events.map((e) => e.id), ["e1"]);
  assert.deepEqual(searchHome("library", { places }).places.map((p) => p.id), ["library"]);
});

test("R1.3 an empty search returns nothing and a link to all events; results are capped", () => {
  assert.deepEqual(searchHome("   ", { events: [event("x", 1)] }), { events: [], places: [], allEventsHref: "/events" });
  assert.deepEqual(searchHome(undefined), { events: [], places: [], allEventsHref: "/events" });
  const many = Array.from({ length: 9 }, (_, i) => event(`m${i}`, 1, { title: "Career fair" }));
  assert.equal(searchHome("career", { events: many }).events.length, 5);
  assert.equal(searchHome("career", { events: many, limit: 2 }).events.length, 2);
  assert.deepEqual(searchHome("quantum", { events: many }).events, []);
});
