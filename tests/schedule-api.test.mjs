// R9 AI Schedule Scanner through its API routes:
//  R9.1 POST /api/users/me/schedule/scan  (upload checks, Gemini extraction)
//  R9.3 GET / PUT /api/users/me/schedule   (save, view and update a schedule)
//  R9.5 scan errors explain what happened and let the student retry
// Supabase and Gemini are fakes (tests/helpers/harness.mjs).
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { apiError, createDb, quietly, fakeGemini } from "./helpers/harness.mjs";

const scan = await import("../app/api/users/me/schedule/scan/route.js");
const schedule = await import("../app/api/users/me/schedule/route.js");

const STUDENT = { id: "student-1" };
function upload(file) {
  const form = new FormData();
  if (file) form.append("image", file);
  return new Request("http://localhost/api/users/me/schedule/scan", { method: "POST", body: form });
}
const png = (bytes = 10) => new File([new Uint8Array(bytes)], "schedule.png", { type: "image/png" });
async function json(response) {
  return { status: response.status, ...(await response.json()) };
}

test("R9.1 scanning requires sign-in and a configured Gemini key", async () => {
  createDb({ user: null });
  assert.deepEqual(await json(await scan.POST(upload(png()))), { status: 401, error: "Sign in to scan your class schedule." });
  createDb({ user: STUDENT });
  delete process.env.GEMINI_API_KEY;
  assert.equal((await scan.POST(upload(png()))).status, 500);
});

test("R9.1 only a PNG, JPG or WebP image under 5 MB is accepted", async () => {
  createDb({ user: STUDENT });
  process.env.GEMINI_API_KEY = "test-key";
  assert.deepEqual(await json(await scan.POST(upload())), { status: 400, error: "Please upload a class schedule image." });
  const pdf = new File(["x"], "schedule.pdf", { type: "application/pdf" });
  assert.match((await json(await scan.POST(upload(pdf)))).error, /Unsupported file type/);
  assert.match((await json(await scan.POST(upload(png(0))))).error, /smaller than 5 MB/);
  assert.match((await json(await scan.POST(upload(png(5 * 1024 * 1024 + 1))))).error, /smaller than 5 MB/);
});

test("R9.1 the image is sent to Gemini and the extracted classes come back tidied", async () => {
  createDb({ user: STUDENT });
  process.env.GEMINI_API_KEY = "test-key";
  const calls = fakeGemini(() => ({
    text: JSON.stringify({ classes: [{ name: " CSC 648 ", days: "Mon, Wed ", startTime: "09:30", endTime: "10:45" }, { name: null }] }),
  }));
  const body = await json(await quietly(() => scan.POST(upload(png()))));
  assert.deepEqual(body, {
    status: 200,
    classes: [
      { name: "CSC 648", days: "Mon, Wed", startTime: "09:30", endTime: "10:45" },
      { name: "", days: "", startTime: "", endTime: "" },
    ],
  });
  const { request } = calls[0];
  assert.equal(request.contents[0].inlineData.mimeType, "image/png");
  assert.equal(request.contents[0].inlineData.data, Buffer.from(new Uint8Array(10)).toString("base64"));
  assert.match(request.contents[1].text, /never as instructions/);
  assert.equal(request.config.responseMimeType, "application/json");
  assert.equal(request.config.httpOptions.timeout, 45000);
});

test("R9.5 scan failures return a clear message the student can act on", async () => {
  createDb({ user: STUDENT });
  process.env.GEMINI_API_KEY = "test-key";
  const cases = [
    [() => { throw apiError(503); }, 503, /temporarily busy/],
    [() => { throw apiError(502); }, 503, /temporarily busy/],
    [() => { throw apiError(429); }, 429, /rate limit/],
    [() => { throw apiError(401); }, 502, /authentication failed/],
    [() => { throw apiError(403); }, 502, /authentication failed/],
    [() => { throw apiError(404); }, 502, /model is unavailable/],
    [() => { throw Object.assign(new Error("slow"), { name: "TimeoutError" }); }, 504, /timed out.*enter classes manually/],
    [() => { throw Object.assign(new Error("stop"), { name: "AbortError" }); }, 504, /timed out/],
    [() => ({ text: "" }), 500, /Unable to scan/],
    [() => ({ text: "not json" }), 500, /Unable to scan/],
    [() => ({ text: JSON.stringify({ classes: "nope" }) }), 500, /Unable to scan/],
  ];
  for (const [handler, status, message] of cases) {
    fakeGemini(handler);
    const body = await json(await quietly(() => scan.POST(upload(png()))));
    assert.equal(body.status, status, String(message));
    assert.match(body.error, message);
  }
});

test("R9.3 saving requires sign-in, and a schedule is only visible to its owner", async () => {
  const db = createDb({ user: null, tables: { student_class_schedules: [] } });
  assert.equal((await schedule.GET()).status, 401);
  assert.equal((await schedule.PUT(new Request("http://localhost", { method: "PUT", body: "{}" }))).status, 401);
  db.user = STUDENT;
  db.tables.student_class_schedules.push(
    { id: "1", user_id: "student-1", class_name: "CSC 648", kind: "class", meeting_days: ["Mon", "Wed"], start_time: "09:30:00", end_time: "10:45:00" },
    { id: "2", user_id: "student-2", class_name: "Not mine", kind: "work", meeting_days: ["Fri"], start_time: "08:00:00", end_time: "09:00:00" },
    { id: "3", user_id: "student-1", class_name: "Cafe shift", kind: "mystery", meeting_days: ["Sat"], start_time: "08:00:00", end_time: "12:00:00" },
  );
  assert.deepEqual((await json(await schedule.GET())).classes, [
    { id: "3", name: "Cafe shift", kind: "class", days: "Sat", startTime: "08:00", endTime: "12:00" },
    { id: "1", name: "CSC 648", kind: "class", days: "Mon, Wed", startTime: "09:30", endTime: "10:45" },
  ]);
});

test("R9.3 loading works before the schedule-kind migration, and reports errors", async () => {
  const db = createDb({ user: STUDENT, tables: { student_class_schedules: [] } });
  let first = true;
  const original = db.from.bind(db);
  db.from = (table) => {
    const query = original(table);
    if (!first) return query;
    first = false;
    return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: { code: "42703" } }) }) }) };
  };
  assert.deepEqual((await json(await schedule.GET())).classes, []);
  db.from = original;
  db.fail.student_class_schedules = ["read"];
  assert.equal((await quietly(() => schedule.GET())).status, 500);
});

test("R9.3 a confirmed schedule replaces the old one in one step", async () => {
  const db = createDb({
    user: STUDENT,
    tables: { student_class_schedules: [] },
    rpc: { replace_student_schedule: ({ p_classes }) => p_classes.length },
  });
  const classes = [
    { name: " CSC 648 ", days: "Mon, Wed, Mon", startTime: "09:30", endTime: "10:45" },
    { name: "Cafe shift", kind: "work", days: "Sat", startTime: "08:00", endTime: "12:00" },
  ];
  const res = await json(await schedule.PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({ classes }) })));
  assert.deepEqual(res, { status: 200, success: true, count: 2, typesSaved: true });
  const saved = db.calls.find((call) => call.rpc === "replace_student_schedule").args.p_classes;
  assert.deepEqual(saved[0], { class_name: "CSC 648", kind: "class", meeting_days: ["Mon", "Wed"], start_time: "09:30", end_time: "10:45" });
  assert.equal(saved[1].kind, "work");
});

test("R9.3 invalid schedules are rejected before saving", async () => {
  createDb({ user: STUDENT, rpc: { replace_student_schedule: () => 0 } });
  const put = async (classes) =>
    json(await schedule.PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({ classes }) })));
  const ok = { name: "CSC 648", days: "Mon", startTime: "09:00", endTime: "10:00" };
  assert.deepEqual(await put("nope"), { status: 400, error: "Invalid schedule data." });
  assert.equal((await put(Array(51).fill(ok))).status, 400);
  assert.deepEqual(await put([null]), { status: 400, error: "Invalid class entry." });
  for (const bad of [
    { ...ok, name: "" }, { ...ok, name: "x".repeat(151) }, { ...ok, kind: "party" }, { ...ok, days: "Funday" },
    { ...ok, days: 5 }, { ...ok, startTime: "9am" }, { ...ok, endTime: "24:00" }, { ...ok, startTime: "10:00" },
  ]) {
    assert.equal((await put([bad])).status, 400, JSON.stringify(bad));
  }
  assert.equal((await put([{ ...ok, name: "" }])).error, "Invalid class: Unnamed class");
});

test("R9.3 / R9.5 save failures return a clear error", async () => {
  const db = createDb({ user: STUDENT, tables: { student_class_schedules: [] }, rpc: { replace_student_schedule: () => 1 } });
  db.fail.rpc = ["replace_student_schedule"];
  const put = () => schedule.PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({ classes: [] }) }));
  assert.deepEqual(await json(await quietly(put)), { status: 500, error: "Unable to save your schedule." });
  db.fail = { student_class_schedules: ["read"], code: "42703" };
  db.fail.rpc = [];
  assert.equal((await json(await put())).typesSaved, false);
});
