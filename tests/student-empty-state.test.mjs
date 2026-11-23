// R5.6 Recommendation Fallback (lib/student/empty-state.js): an empty
// "Recommended for You" explains why and links to interests and Explore All Events.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPLORE_LINK, INTERESTS_LINK, studentEmptyState } from "../lib/student/empty-state.js";

test("no interests yet: asks the student to pick some, and offers Explore All Events", () => {
  const state = studentEmptyState({ hasInterests: false });
  assert.equal(state.title, "Start with your interests");
  assert.deepEqual(state.links, [INTERESTS_LINK, EXPLORE_LINK]);
});

test("interests but no matches: says so, and offers interest settings and Explore All Events", () => {
  const state = studentEmptyState({ hasInterests: true });
  assert.equal(state.title, "No matching recommendations yet");
  assert.match(state.text, /explore all campus events/);
  assert.deepEqual(state.links.map((l) => l.href), ["/interests", "/events"]);
});

test("saved events page: explains how to save, and links to Explore All Events", () => {
  const state = studentEmptyState({ saved: true });
  assert.equal(state.title, "No saved events yet");
  assert.deepEqual(state.links, [EXPLORE_LINK]);
  assert.deepEqual(studentEmptyState(), studentEmptyState({ saved: false, hasInterests: false }));
});
