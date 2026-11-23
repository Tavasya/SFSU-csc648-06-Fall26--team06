// R8 AI Assistant (Allison) through POST /api/assistant:
//  R8.1 campus and event questions, R8.2 natural-language discovery,
//  R8.3 summaries and comparisons, R8.4 limits and unclear questions,
//  and R9.5-style AI error handling (fallback text when Gemini fails).
// Supabase and Gemini are fakes, so no AI calls or network are used.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { apiError, createDb, quietly, fakeGemini } from "./helpers/harness.mjs";

const { POST } = await import("../app/api/assistant/route.js");

const DAY = 86400000;
const soon = (days, hours = 0) => new Date(Date.now() + days * DAY + hours * 3600000).toISOString();
const event = (id, title, days, extra = {}) => ({
  id, title, description: `${title} for students.\n\nSecond paragraph.`,
  start_date_time: soon(days), end_date_time: soon(days, 2), location_id: "loc-ccsc",
  room_number: "", category_ids: ["c-social"], admission_type: "free", capacity: null, audience: "All students",
  rsvp_required: false, wheelchair_accessible: true, asl_available: false,
  publication_status: "published", status: "active", host_id: "host-1",
  locations: { building_name: "Cesar Chavez Student Center" }, ...extra,
});

function campus(overrides = {}) {
  process.env.GEMINI_API_KEY = "test-key";
  return createDb({
    tables: {
      locations: [{ id: "loc-ccsc", building_name: "Cesar Chavez Student Center" }],
      categories: [{ id: "c-social", name: "Social" }, { id: "c-career", name: "Career" }],
      events: [
        event("trivia", "Trivia Night", 2),
        event("games", "Board Game Night", 3, { admission_type: "paid", rsvp_required: true, room_number: "Room 101" }),
        event("fair", "Career Fair", 4, { category_ids: ["c-career"], asl_available: true }),
        event("old", "Old Mixer", -10, { end_date_time: soon(-10, 1) }),
        event("mine", "My Own Event", 2, { host_id: "me" }),
      ],
      rooms: [],
    },
    ...overrides,
  });
}
async function ask(question) {
  const res = await POST(new Request("http://localhost/api/assistant", { method: "POST", body: JSON.stringify({ question }) }));
  return { status: res.status, ...(await res.json()) };
}

test("R8.4 empty, missing or very long questions are rejected", async () => {
  campus();
  for (const question of ["", "   ", "x".repeat(501)]) assert.equal((await ask(question)).status, 400);
  const res = await POST(new Request("http://localhost", { method: "POST", body: "not json" }));
  assert.equal(res.status, 400);
});

test("R8.1 greetings and 'what can you do' get Allison's introduction", async () => {
  campus();
  assert.match((await ask("hi")).reply, /I'm Allison/);
  assert.match((await ask("what can you do?")).reply, /find campus events/);
});

test("R8.4 off-topic questions are declined instead of answered with made-up facts", async () => {
  campus();
  const { reply, events } = await ask("what's the weather tomorrow");
  assert.match(reply, /I only know about GatorAid campus events/);
  assert.deepEqual(events, []);
});

test("R8.2 natural-language questions return matching upcoming events, soonest first", async () => {
  campus();
  const all = await ask("what events are happening");
  assert.deepEqual(all.events.map((e) => e.id), ["trivia", "mine", "games", "fair"]);
  assert.match(all.reply, /soonest first/);
  const career = await ask("career events");
  assert.deepEqual(career.events.map((e) => e.id), ["fair"]);
  assert.equal(career.total, 1);
  assert.deepEqual(career.categories.map((c) => c.name), ["Career", "Social"], "category list sorted by name");
});

test("R8.2 a signed-in host's own events are left out", async () => {
  campus().user = { id: "me" };
  assert.ok(!(await ask("what events are happening")).events.some((e) => e.id === "mine"));
});

test("R8.4 when nothing matches, Allison says so", async () => {
  campus({ tables: { locations: [], categories: [], events: [] } });
  assert.match((await ask("what events are happening")).reply, /There aren't any upcoming events/);
  campus();
  assert.match((await ask("career events on saturday after 11pm")).reply, /couldn't find any/);
});

test("R8.1 asking about a named event gives its time, place, cost and RSVP", async () => {
  campus();
  const { reply, events } = await ask("when is board game night");
  assert.match(reply, /^Board Game Night is .* at Room 101, Cesar Chavez Student Center \(paid, RSVP required\)\.$/);
  assert.deepEqual(events.map((e) => e.id), ["games"]);
  assert.deepEqual(events[0].rooms, []);
});

test("R8.3 comparing two events lines up their details side by side", async () => {
  campus();
  const { reply, events } = await ask("compare trivia night and board game night");
  assert.match(reply, /Here's how "Trivia Night" and "Board Game Night" compare/);
  assert.match(reply, /Cost & RSVP: free, no RSVP needed {2}\| {2}paid, RSVP required/);
  assert.equal(events.length, 2);
  assert.match((await ask("compare trivia and board game")).reply, /Here's how/);
  assert.match((await ask("compare trivia night and quantum physics")).reply, /couldn't tell which two events/);
});

test("R8.3 summaries come from Gemini, using only the event data", async () => {
  campus();
  const calls = fakeGemini(() => ({ text: "  A fun night of trivia!  " }));
  const { reply } = await ask("tell me about trivia night");
  assert.equal(reply, "A fun night of trivia!");
  assert.equal(calls[0].options.apiKey, "test-key");
  assert.match(calls[0].request.contents, /Never invent events/);
  assert.match(calls[0].request.contents, /Trivia Night/);
  const overview = await ask("summarize upcoming social events");
  assert.equal(overview.reply, "A fun night of trivia!");
});

test("R8.3 / R9.5 if Gemini fails, Allison falls back to the event facts", async () => {
  campus();
  fakeGemini(() => { throw apiError(500); });
  const one = await quietly(() => ask("tell me about trivia night"));
  assert.match(one.reply, /^Trivia Night is on .* \(free, no RSVP needed\)\.\n\nTrivia Night for students\.$/);
  const many = await quietly(() => ask("summarize upcoming events"));
  assert.match(many.reply, /^• Trivia Night: /m);
  fakeGemini(() => ({ text: "" }));
  assert.match((await quietly(() => ask("tell me about trivia night"))).reply, /^Trivia Night is on/);
  delete process.env.GEMINI_API_KEY;
  assert.match((await quietly(() => ask("tell me about trivia night"))).reply, /^Trivia Night is on/);
});

test("R8.3 busy Gemini (429/503) is retried once", async (t) => {
  campus();
  t.mock.method(globalThis, "setTimeout", (fn) => { fn(); return 0; });
  const calls = fakeGemini((request, n) => { if (n === 1) throw apiError(503); return { text: "Second try worked" }; });
  assert.equal((await ask("tell me about trivia night")).reply, "Second try worked");
  assert.equal(calls.length, 2);
});

test("R9.5 / R8.4 database problems give a clear 'can't reach events' error", async () => {
  let db = campus();
  db.fail.events = ["read"];
  assert.deepEqual(await quietly(() => ask("career events")), { status: 503, error: "Allison can't reach campus events right now." });
  db = campus();
  db.fail.categories = ["read"];
  assert.equal((await ask("career events")).status, 503);
  globalThis.__testDb = null;
  assert.deepEqual(await quietly(() => ask("career events")), { status: 500, error: "Allison ran into a problem. Please try again." });
});

test("R8.1 cards keep working when 3D room lookup fails", async () => {
  const db = campus();
  db.fail.locations = [];
  const original = db.from.bind(db);
  let locationCalls = 0;
  db.from = (table) => {
    if (table === "locations" && ++locationCalls > 1) return { select: () => Promise.resolve({ data: null, error: { message: "down" } }) };
    return original(table);
  };
  const { events } = await quietly(() => ask("career events"));
  assert.deepEqual(events.map((e) => [e.id, e.rooms]), [["fair", []]]);
});
