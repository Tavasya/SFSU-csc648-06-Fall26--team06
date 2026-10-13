import test from "node:test";
import assert from "node:assert/strict";
import { validRequestOrigin } from "../lib/events/request-origin.js";
const request = (
  origin,
  host = "127.0.0.1:3000",
  url = "http://localhost:3000/api/host/events",
) => new Request(url, { headers: { host, ...(origin ? { origin } : {}) } });
test("allows browser authority when Next normalizes the local URL", () => {
  assert.equal(validRequestOrigin(request("http://127.0.0.1:3000")), true);
  assert.equal(
    validRequestOrigin(request("http://localhost:3000", "localhost:3000")),
    true,
  );
});
test("rejects foreign hosts, different ports, schemes, and invalid origins", () => {
  for (const origin of [
    "https://evil.example",
    "http://127.0.0.1:4000",
    "https://127.0.0.1:3000",
    "null",
    "http://127.0.0.1:3000/path",
  ])
    assert.equal(validRequestOrigin(request(origin)), false, origin);
});
test("accepts same-origin HTTPS deployment and requests without Origin", () => {
  assert.equal(
    validRequestOrigin(
      request(
        "https://gatoraid.example",
        "gatoraid.example",
        "https://gatoraid.example/api",
      ),
    ),
    true,
  );
  assert.equal(validRequestOrigin(request()), true);
});
