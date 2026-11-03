// Tests for reading AI Event Assistant questions, finding matching events and
// placing 3D previews in the answer grid (lib/assistant/query.js and
// lib/assistant/grid.js). "Today" is Monday, Nov 2, 2026 at 5 PM campus time.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeQuery,
  findEvents,
  hasFilters,
  normalize,
  parseDates,
  parseQuestion,
} from "../lib/assistant/query.js";
import { gridItems } from "../lib/assistant/grid.js";

const TODAY = "2026-11-02";
const NOW = new Date("2026-11-02T17:00:00-08:00");
const LOCATIONS = [
  { id: "loc-ccsc", building_name: "Cesar Chavez Student Center" },
  { id: "loc-ca", building_name: "Creative Arts" },
  { id: "loc-sci", building_name: "Science" },
  { id: "loc-lib", building_name: "J. Paul Leonard Library" },
  { id: "loc-gym", building_name: "Gymnasium" },
];
const ask = (question, titles = []) => parseQuestion(question, { today: TODAY, locations: LOCATIONS, titles });
const dates = (text) => parseDates(normalize(text), TODAY);

test("relative dates become campus-time day ranges", () => {
  assert.equal(dates("Summarize this week's arts events").from, "2026-11-02"); // possessive
  assert.deepEqual([dates("today").from, dates("today").to], ["2026-11-02", "2026-11-02"]);
  assert.deepEqual([dates("anything tonight?").from, dates("anything tonight?").label], ["2026-11-02", "today"]);
  assert.equal(dates("tomorrow").from, "2026-11-03");
  assert.deepEqual([dates("this week").from, dates("this week").to], ["2026-11-02", "2026-11-08"]);
  assert.deepEqual([dates("next week").from, dates("next week").to], ["2026-11-09", "2026-11-15"]);
  assert.deepEqual([dates("this weekend").from, dates("this weekend").to], ["2026-11-07", "2026-11-08"]);
  assert.deepEqual([dates("next weekend").from, dates("next weekend").to], ["2026-11-14", "2026-11-15"]);
  assert.deepEqual([dates("this month").from, dates("this month").to], ["2026-11-01", "2026-11-30"]);
  assert.deepEqual([dates("next month").from, dates("next month").label], ["2026-12-01", "in December"]);
});

test("weekdays, dates and months", () => {
  assert.deepEqual([dates("on Friday").from, dates("on Friday").label], ["2026-11-06", "on Friday, Nov 6"]);
  assert.equal(dates("monday").from, "2026-11-02"); // today counts
  assert.equal(dates("events Nov 5").from, "2026-11-05");
  assert.equal(dates("November 19th").from, "2026-11-19");
  assert.equal(dates("what's on 11/5").from, "2026-11-05");
  assert.equal(dates("anything at 5 pm on nov 4").from, "2026-11-04"); // "at 5" isn't a date
  assert.equal(dates("events in October").from, "2027-10-01"); // October already passed: next year
  assert.deepEqual([dates("week of Nov 16").from, dates("week of Nov 16").to], ["2026-11-16", "2026-11-22"]);
  assert.equal(dates("Nov 31").invalid, true);
  assert.equal(dates("past career events").past, true);
  assert.equal(dates("career events").from, null);
});

test("time of day, admission, RSVP and access", () => {
  assert.equal(ask("evening events tomorrow").timeOfDay.name, "evening");
  assert.equal(ask("anything tonight").timeOfDay.name, "evening");
  assert.equal(ask("lunchtime events").timeOfDay.name, "around lunchtime");
  assert.equal(ask("morning yoga").timeOfDay.name, "morning");
  assert.equal(ask("free events this weekend").admission, "free");
  assert.equal(ask("paid concerts").admission, "paid");
  assert.equal(ask("events in my free time").admission, null);
  assert.equal(ask("drop-in events today").dropIn, true);
  assert.equal(ask("wheelchair accessible events").wheelchair, true);
  assert.equal(ask("events with ASL interpretation").asl, true);
});

test("category names filter by category; specific words stay topic words", () => {
  assert.deepEqual(ask("arts events this week").categories, ["Arts"]);
  assert.deepEqual(ask("concerts this week").categories, []);
  assert.deepEqual(ask("concerts this week").terms, ["concerts"]);
  assert.deepEqual(ask("concerts this week").topicCategories, ["Arts"]);
  assert.deepEqual(ask("internship workshops").topicCategories, ["Career"]);
  assert.deepEqual(ask("machine learning talks").terms, ["machine learning", "talks"]);
  assert.deepEqual(ask("computer science events").categories, ["Technology"]);
  assert.deepEqual(ask("health & wellness events next week").categories, ["Health & Wellness"]);
  assert.deepEqual(ask("career or tech events").categories, ["Career", "Technology"]);
  assert.deepEqual(ask("what's happening today?").categories, []);
});

test("places: full names, nicknames, and one-word names only after 'at'/'in'", () => {
  assert.equal(ask("events at the student center").location.id, "loc-ccsc");
  assert.equal(ask("Creative Arts events this week").location.id, "loc-ca");
  assert.equal(ask("what's in the library tomorrow").location.id, "loc-lib");
  assert.equal(ask("events in science today").location.id, "loc-sci");
  assert.equal(ask("computer science events").location, null);
  assert.equal(ask("events at the gym").location.id, "loc-gym");
});

test("topic words are what's left after filters and filler", () => {
  assert.deepEqual(ask("Any jazz or pottery events this Friday evening?").terms, ["jazz", "pottery"]);
  assert.deepEqual(ask("what free events are happening today").terms, []);
  assert.deepEqual(ask("show me events at the student center tomorrow").terms, []);
});

test("intents", () => {
  assert.equal(ask("hi").intent, "greeting");
  assert.equal(ask("Hello Allison").intent, "greeting");
  assert.equal(ask("what can you do?").intent, "help");
  assert.equal(ask("what's the weather tomorrow").intent, "unsupported");
  assert.equal(ask("Summarize this week's arts events").intent, "summary");
  assert.equal(ask("compare trivia night and board game night").intent, "compare");
  assert.equal(ask("when is trivia night", ["trivia night"]).intent, "details");
  assert.equal(ask("career events next week").intent, "find");
});

// ---- Finding events ----
const event = (id, title, start, hours, extra = {}) => ({
  id, title, description: extra.description ?? `${title} description`,
  start_date_time: new Date(start).toISOString(),
  end_date_time: new Date(Date.parse(start) + hours * 3600e3).toISOString(),
  location_id: extra.location_id ?? "loc-ccsc", room_number: extra.room_number ?? "",
  admission_type: extra.admission_type ?? "free", rsvp_required: extra.rsvp_required ?? false,
  wheelchair_accessible: extra.wheelchair_accessible ?? true, asl_available: extra.asl_available ?? false,
  categories: extra.categories ?? ["Social"],
});
const EVENTS = [
  event("ended", "Morning Mindfulness", "2026-11-02T09:00:00-08:00", 1, { categories: ["Health & Wellness"] }),
  event("tonight", "Gator Gaming Night", "2026-11-02T18:00:00-08:00", 2, { categories: ["Social", "Technology"] }),
  event("tue-am", "Sunrise Run Club", "2026-11-03T08:00:00-08:00", 1, { categories: ["Sports"], location_id: "loc-gym" }),
  event("tue-pm", "Student Film Screening", "2026-11-03T18:30:00-08:00", 2, { categories: ["Arts"], location_id: "loc-ca" }),
  event("wed-paid", "Jazz Ensemble Fall Concert", "2026-11-04T19:30:00-08:00", 1.5,
    { categories: ["Arts"], location_id: "loc-ca", admission_type: "paid", rsvp_required: true, room_number: "Knuth Hall" }),
  event("wed-tech", "Excel Skills for Every Major", "2026-11-04T09:00:00-08:00", 1.5,
    { categories: ["Technology", "Career"], rsvp_required: true, description: "Pivot tables and charts for spreadsheets." }),
  event("next-week", "Trivia Night", "2026-11-10T19:00:00-08:00", 2, { categories: ["Social"], asl_available: true }),
];
const namesFor = (e) => e.categories;
const find = (question) => findEvents(EVENTS, ask(question), namesFor, NOW);
const ids = (question) => find(question).events.map((e) => e.id);

test("upcoming events only, soonest first; past questions show ended events", () => {
  assert.deepEqual(ids("what's happening?"), ["tonight", "tue-am", "wed-tech", "tue-pm", "wed-paid", "next-week"].sort((a, b) =>
    Date.parse(EVENTS.find((e) => e.id === a).start_date_time) - Date.parse(EVENTS.find((e) => e.id === b).start_date_time)));
  assert.deepEqual(ids("events today"), ["tonight"]); // the morning one already ended
  assert.deepEqual(ids("past events"), ["ended"]);
});

test("filters combine: dates, time of day, category, admission, place, access", () => {
  assert.deepEqual(ids("arts events this week"), ["tue-pm", "wed-paid"]);
  assert.deepEqual(ids("free arts events this week"), ["tue-pm"]);
  assert.deepEqual(ids("morning events tomorrow"), ["tue-am"]);
  assert.deepEqual(ids("evening events on Wednesday"), ["wed-paid"]);
  assert.deepEqual(ids("events at Creative Arts"), ["tue-pm", "wed-paid"]);
  assert.deepEqual(ids("events in Knuth Hall"), ["wed-paid"]); // not a known place: found through the room name
  assert.deepEqual(ids("drop-in events this week"), ["tonight", "tue-am", "tue-pm"]);
  assert.deepEqual(ids("events with ASL"), ["next-week"]);
  assert.deepEqual(ids("career events next week"), []);
});

test("topic words rank title matches first, and are dropped when nothing mentions them", () => {
  assert.deepEqual(ids("spreadsheet events"), ["wed-tech"]); // found in the description
  assert.deepEqual(ids("jazz concert"), ["wed-paid"]); // title match, not every Arts event
  const dance = find("dance events this week"); // nothing mentions dance: related Arts events
  assert.deepEqual(dance.events.map((e) => e.id), ["tue-pm", "wed-paid"]);
  assert.deepEqual(dance.usedCategories, ["Arts"]);
  const result = find("pottery events this week");
  assert.deepEqual(result.ignoredTerms, ["pottery"]);
  assert.equal(result.events.length, 5); // falls back to everything this week
});

test("describeQuery reads naturally", () => {
  assert.equal(describeQuery(ask("free tech events this weekend")), "free technology events this weekend");
  assert.equal(describeQuery(ask("arts events at Creative Arts on Friday evening")),
    "arts events at Creative Arts on Friday, Nov 6 in the evening");
  assert.equal(describeQuery(ask("events in December")), "events in December");
  assert.equal(describeQuery(ask("jazz concerts tomorrow"), ["jazz", "concerts"]), 'events about "jazz concerts" tomorrow');
  assert.equal(describeQuery(ask("past career events")), "career events that already happened");
  assert.equal(hasFilters(ask("events")), false);
  assert.equal(hasFilters(ask("events tomorrow")), true);
});

// ---- 3D preview placement in the 2-column grid (lib/assistant/grid.js) ----
const order = (events, openId) => gridItems(events, openId).map((x) => (x.type === "preview" ? `[${x.event.id}]` : x.event.id));
const five = ["a", "b", "c", "d", "e"].map((id) => ({ id }));

test("an open 3D preview sits beside its card and the following cards move down", () => {
  assert.deepEqual(order(five, null), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(order(five, "a"), ["a", "[a]", "b", "c", "d", "e"]); // left column
  assert.deepEqual(order(five, "c"), ["a", "b", "c", "[c]", "d", "e"]);
  assert.deepEqual(order(five, "b"), ["b", "[b]", "a", "c", "d", "e"]); // right column: moves left
  assert.deepEqual(order(five, "d"), ["a", "b", "d", "[d]", "c", "e"]);
  assert.deepEqual(order(five, "missing"), ["a", "b", "c", "d", "e"]);
});
