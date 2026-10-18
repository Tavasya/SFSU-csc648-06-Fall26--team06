// Tests for the shared event banner rule (lib/events/banner.js):
// an event's first category picks its banner on every page.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BANNERS, DEFAULT_BANNER, bannerFor, bannerStyle, orderedCategoryNames } from "../lib/events/banner.js";

test("every category in the database migration has its own banner", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261012232715_gatoraid_host_events.sql", import.meta.url), "utf8");
  const insert = sql.match(/insert into public\.categories\(name\) values (.*);/)[1];
  const names = [...insert.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(names.length > 0);
  for (const name of names) assert.ok(BANNERS[name], `No banner for category "${name}"`);
});

test("each category gets a different banner", () => {
  const looks = Object.values(BANNERS).map((b) => `${b.from}-${b.to}`);
  assert.equal(new Set(looks).size, looks.length);
});

test("bannerFor picks the category's banner, or the default blue one", () => {
  assert.equal(bannerFor("Arts"), BANNERS.Arts);
  assert.equal(bannerFor("Health & Wellness"), BANNERS["Health & Wellness"]);
  assert.equal(bannerFor(undefined), DEFAULT_BANNER);
  assert.equal(bannerFor("Not a category"), DEFAULT_BANNER);
});

test("sample-only tags on the map use their closest real category", () => {
  assert.equal(bannerFor("Networking"), BANNERS.Career);
  assert.equal(bannerFor("AI"), BANNERS.Technology);
  assert.equal(bannerFor("Clubs"), BANNERS.Social);
});

test("orderedCategoryNames keeps the host's order, so the first badge matches the banner", () => {
  const categories = [
    { id: "a", name: "Academic" },
    { id: "s", name: "Sports" },
    { id: "t", name: "Technology" },
  ];
  // Selected Technology first, then Academic: Technology picks the banner.
  assert.deepEqual(orderedCategoryNames(["t", "a"], categories), ["Technology", "Academic"]);
  assert.deepEqual(orderedCategoryNames(["gone", "s"], categories), ["Sports"]); // deleted ids are skipped
  assert.deepEqual(orderedCategoryNames(null, categories), []);
  assert.deepEqual(orderedCategoryNames(["a"], null), []);
});

test("bannerStyle builds the gradient background", () => {
  assert.deepEqual(bannerStyle({ from: "#111111", to: "#222222" }), {
    background: "linear-gradient(120deg, #111111, #222222)",
  });
});
