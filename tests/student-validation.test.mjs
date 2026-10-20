import { test } from "node:test";
import assert from "node:assert/strict";
import { interestIds, canAttend, recommendationReasons, RSVP_STATUSES } from "../lib/student/validation.js";
const tech = "123e4567-e89b-42d3-a456-426614174001";
const arts = "123e4567-e89b-42d3-a456-426614174002";
test("interests can be cleared, reject malformed input, and deduplicate categories", () => {
  assert.deepEqual(interestIds([]), []);
  assert.deepEqual(interestIds([tech, tech, arts]), [tech, arts]);
  for (const value of [null, {}, "Technology", ["invalid"], [null], Array(101).fill(tech)])
    assert.throws(() => interestIds(value));
});
test("attending is closed for drafts, cancellations, completed and elapsed events", () => {
  const now = Date.parse("2026-10-20T20:00:00Z");
  const event = { publication_status: "published", status: "active", end_date_time: "2026-10-20T21:00:00Z" };
  assert.equal(canAttend(event, now), true);
  for (const overrides of [
    { publication_status: "draft" }, { status: "cancelled" }, { status: "completed" },
    { end_date_time: "2026-10-20T20:00:00Z" }, { end_date_time: "invalid" },
  ]) assert.equal(canAttend({ ...event, ...overrides }, now), false);
  assert.deepEqual(RSVP_STATUSES, ["attending", "interested", "not_attending"]);
});
test("recommendation explanations include only the intersection of preferences and event categories", () => {
  const categories = [{ id: tech, name: "Technology" }, { id: arts, name: "Arts" }];
  assert.deepEqual(recommendationReasons({ category_ids: [tech, arts] }, categories, [tech]), ["Technology"]);
  assert.deepEqual(recommendationReasons({ category_ids: [arts] }, categories, [tech]), []);
});
