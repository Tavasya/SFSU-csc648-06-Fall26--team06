// R8.5 Interest-Aware AI Responses (lib/assistant/personalize.js): matching
// events go first and say why; students without interests are unaffected.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { interestMatches, interestNote, personalizedIntro, rankByInterests } from "../lib/assistant/personalize.js";

const CATEGORIES = [{ id: "tech", name: "Technology" }, { id: "career", name: "Career" }, { id: "art", name: "Arts" }];
const EVENTS = [
  { id: "gallery", category_ids: ["art"] },
  { id: "hack", category_ids: ["tech"] },
  { id: "fair", category_ids: ["career", "tech"] },
  { id: "none" },
];

test("interestMatches lists the shared categories", () => {
  assert.deepEqual(interestMatches(EVENTS[2], ["tech", "career"]), ["career", "tech"]);
  assert.deepEqual(interestMatches(EVENTS[3], ["tech"]), []);
  assert.deepEqual(interestMatches(EVENTS[0], null), []);
});

test("events sharing the most interests come first; ties keep their order", () => {
  assert.deepEqual(rankByInterests(EVENTS, ["tech", "career"]).map((e) => e.id), ["fair", "hack", "gallery", "none"]);
  assert.deepEqual(rankByInterests(EVENTS, ["art"]).map((e) => e.id), ["gallery", "hack", "fair", "none"]);
});

test("students without interests get the original order (general answers still work)", () => {
  assert.equal(rankByInterests(EVENTS, []), EVENTS);
  assert.equal(rankByInterests(EVENTS, undefined), EVENTS);
});

test("each event explains which interests it matches", () => {
  assert.equal(interestNote(EVENTS[2], ["tech", "career"], CATEGORIES), "Matches your interests: Career, Technology");
  assert.equal(interestNote(EVENTS[0], ["tech"], CATEGORIES), "");
  assert.equal(interestNote(EVENTS[1], ["tech"], undefined), "");
});

test("the intro says how many events matched", () => {
  assert.equal(personalizedIntro(2, 5), "2 of 5 events match your interests, so they're listed first.");
  assert.equal(personalizedIntro(1, 1), "1 of 1 event matches your interests, so it's listed first.");
  assert.match(personalizedIntro(0, 3), /None of these match/);
  assert.equal(personalizedIntro(0, 0), "");
});
