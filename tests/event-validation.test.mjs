import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEvent } from "../lib/events/validation.js";
const valid = {
  title: "Campus workshop",
  description: "Build a project with other students.",
  start_date_time: "2026-11-01T18:00:00Z",
  end_date_time: "2026-11-01T20:00:00Z",
  location_id: "123e4567-e89b-42d3-a456-426614174000",
  category_ids: ["123e4567-e89b-42d3-a456-426614174001"],
  audience: "All students",
  capacity: 20,
};
test("valid draft retains UTC times and does not accept client ownership or publication flags", () => {
  const { data, errors } = validateEvent({
    ...valid,
    host_id: "other",
    publication_status: "published",
  });
  assert.deepEqual(errors, {});
  assert.equal(data.start_date_time, "2026-11-01T18:00:00.000Z");
  assert.equal(data.host_id, undefined);
  assert.equal(data.publication_status, undefined);
});
test("rejects reversed times, malformed categories and fractional capacity", () => {
  const { errors } = validateEvent({
    ...valid,
    end_date_time: "2026-10-01",
    category_ids: ["bad"],
    capacity: 1.5,
  });
  assert.ok(errors.end_date_time);
  assert.ok(errors.category_ids);
  assert.ok(errors.capacity);
});
test("rejects short descriptions and invalid locations, deduplicates category IDs", () => {
  const { data, errors } = validateEvent({
    ...valid,
    description: "hi",
    location_id: "bad",
    category_ids: [...valid.category_ids, ...valid.category_ids],
  });
  assert.ok(errors.description);
  assert.ok(errors.location_id);
  assert.equal(data.category_ids.length, 1);
});

import { localTime, pacificISO } from "../lib/events/time.js";
test("Pacific event times account for daylight saving and reject nonexistent times", () => {
  assert.equal(pacificISO("2026-10-15T16:00"), "2026-10-15T23:00:00.000Z");
  assert.equal(pacificISO("2026-12-15T16:00"), "2026-12-16T00:00:00.000Z");
  assert.equal(pacificISO("2027-03-14T02:30"), "");
  assert.equal(localTime("2026-10-15T23:00:00Z"), "2026-10-15T16:00");
});
