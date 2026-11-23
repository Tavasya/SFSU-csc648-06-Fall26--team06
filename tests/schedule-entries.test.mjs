// R9.1 Upload Class Schedule and R9.2 Review and Correct Extracted Schedule:
// file checks, formatting and entry validation in lib/schedule/entries.js,
// and entry types in lib/schedule/kinds.js.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAYS, MAX_SIZE, emptyClass, entryError, formatClassName, formatDays, formatName,
  formatTime12Hour, imageFileError, scheduleError, sortByWeek, tidySchedule,
} from "../lib/schedule/entries.js";
import { SCHEDULE_KINDS, scheduleKind, scheduleKindLabel } from "../lib/schedule/kinds.js";

const course = (fields) => ({ name: "CSC 648", kind: "class", days: "Mon, Wed", startTime: "09:30", endTime: "10:45", ...fields });

test("R9.1 only PNG, JPG or WebP images up to 5 MB can be scanned", () => {
  assert.equal(imageFileError({ type: "image/png", size: 1000 }), "");
  assert.equal(imageFileError({ type: "image/jpeg", size: MAX_SIZE }), "");
  assert.equal(imageFileError({ type: "image/webp", size: 10 }), "");
  assert.match(imageFileError({ type: "application/pdf", size: 10 }), /Unsupported file/);
  assert.match(imageFileError({ type: "image/png", size: MAX_SIZE + 1 }), /smaller than 5 MB/);
  assert.match(imageFileError({ type: "image/png", size: 0 }), /smaller than 5 MB/);
  assert.match(imageFileError(null), /upload a class schedule image/);
});

test("R9.2 course codes are tidied; other commitments keep their wording", () => {
  assert.equal(formatClassName("csc648"), "CSC 648");
  assert.equal(formatClassName("  csc-648 "), "CSC 648");
  assert.equal(formatClassName("math 226b"), "MATH 226B");
  assert.equal(formatClassName("intro   to   design"), "INTRO TO DESIGN");
  assert.equal(formatName("csc 648", "class"), "CSC 648");
  assert.equal(formatName("  shift at   Cafe  ", "work"), "shift at Cafe");
});

test("R9.2 days are read in any common spelling, without repeats", () => {
  assert.equal(formatDays("monday; WED / fri, Mon"), "Mon, Wed, Fri");
  assert.equal(formatDays("tues,thurs"), "Tue, Thu");
  assert.equal(formatDays("Sat, Sun"), "Sat, Sun");
  assert.equal(formatDays("someday"), "someday");
  assert.equal(formatDays(""), "");
});

test("R9.2 times show in 12-hour format", () => {
  assert.equal(formatTime12Hour("09:30"), "9:30 AM");
  assert.equal(formatTime12Hour("00:05"), "12:05 AM");
  assert.equal(formatTime12Hour("12:00"), "12:00 PM");
  assert.equal(formatTime12Hour("15:45:00"), "3:45 PM");
  assert.equal(formatTime12Hour("25:00"), "25:00");
  assert.equal(formatTime12Hour("noon"), "noon");
  assert.equal(formatTime12Hour(""), "");
});

test("R9.2 entries are listed in week order, then by start time and name", () => {
  const sorted = sortByWeek([
    course({ name: "B", days: "Wed", startTime: "09:00" }),
    course({ name: "Z", days: "", startTime: "08:00" }),
    course({ name: "A", days: "Tue, Mon", startTime: "13:00" }),
    course({ name: "C", days: "Mon", startTime: "13:00" }),
  ]);
  assert.deepEqual(sorted.map((c) => c.name), ["A", "C", "B", "Z"]);
});

test("R9.2 each entry needs a name, valid days and a start before its end", () => {
  assert.equal(entryError(course({}), 0), "");
  assert.equal(entryError(course({ name: "  " }), 0), "Commitment 1: Please enter a name.");
  assert.equal(entryError(course({ days: "Funday" }), 1), "Commitment 2: Please enter valid days.");
  assert.equal(entryError(course({ days: "" }), 1), "Commitment 2: Please enter valid days.");
  assert.equal(entryError(course({ endTime: "" }), 2), "Commitment 3: Please enter both times.");
  assert.equal(
    entryError(course({ startTime: "11:00", endTime: "10:00" }), 0),
    "Commitment 1 (CSC 648): End time must be later than start time. Check AM and PM.",
  );
});

test("R9.2 a schedule can be confirmed only when every entry is valid", () => {
  assert.equal(scheduleError([]), "Please add at least one class or commitment.");
  assert.equal(scheduleError([course({}), course({ name: "" })]), "Commitment 2: Please enter a name.");
  assert.equal(scheduleError([course({})]), "");
});

test("R9.2 confirming tidies names and days and puts entries in week order", () => {
  const tidy = tidySchedule([course({ name: "math226", days: "thursday" }), course({ name: "csc648", days: "monday,wed" })]);
  assert.deepEqual(tidy.map((c) => [c.name, c.days]), [["CSC 648", "Mon, Wed"], ["MATH 226", "Thu"]]);
});

test("R9.2 'Add class' starts a blank 'other' entry with its own id", () => {
  const a = emptyClass(), b = emptyClass();
  assert.deepEqual({ ...a, id: undefined }, { id: undefined, name: "", kind: "other", days: "", startTime: "", endTime: "" });
  assert.notEqual(a.id, b.id);
  assert.deepEqual(DAYS, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
});

test("R9.3 entry types: unknown or missing types count as classes", () => {
  assert.deepEqual(SCHEDULE_KINDS.map((k) => k.id), ["class", "work", "practice", "other"]);
  assert.equal(scheduleKind("work"), "work");
  assert.equal(scheduleKind(undefined), "class");
  assert.equal(scheduleKind("party"), "class");
  assert.equal(scheduleKindLabel("practice"), "Practice or club");
  assert.equal(scheduleKindLabel(null), "Class");
});
