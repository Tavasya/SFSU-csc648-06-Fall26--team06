/*
 * lib/calendar/week.js
 *
 * PURPOSE:
 * Plain helpers for the student calendar (components/calendar/CalendarView.js):
 * week math, Pacific-time conversion, turning saved/RSVP'd events and class
 * schedule entries into blocks, and laying out overlapping blocks side by side.
 * No React and no imports, so they can be tested on their own.
 *
 * Dates are "day keys" ("2026-10-05"), always in campus time (America/Los_Angeles).
 */

const TIME_ZONE = "America/Los_Angeles";
const DAY_MS = 24 * 60 * 60 * 1000;
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pacific = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// A timestamp in campus time: { day: "2026-10-05", minutes: 870 } (minutes after midnight).
export function toPacific(value) {
  const parts = Object.fromEntries(
    pacific.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

// Day keys are calendar dates, so the math runs in UTC to avoid DST jumps.
function keyToUTC(day) {
  return Date.parse(day + "T00:00:00Z");
}
export function addDays(day, count) {
  return new Date(keyToUTC(day) + count * DAY_MS).toISOString().slice(0, 10);
}

// The Monday of the week that contains `day`.
export function weekStart(day) {
  const weekday = (new Date(keyToUTC(day)).getUTCDay() + 6) % 7; // Mon = 0
  return addDays(day, -weekday);
}

// The 7 days of the week starting on `start`:
// [{ key: "2026-10-05", name: "Mon", date: 5 }, ...]
export function weekDays(start) {
  return DAY_NAMES.map((name, i) => {
    const key = addDays(start, i);
    return { key, name, date: Number(key.slice(8)) };
  });
}

// "Oct 5 – 11, 2026", or "Sep 28 – Oct 4, 2026" across months.
export function weekLabel(start) {
  const end = addDays(start, 6);
  const month = (day) =>
    new Date(keyToUTC(day)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = end.slice(0, 4);
  const from = `${month(start)} ${Number(start.slice(8))}`;
  const to =
    month(start) === month(end) ? Number(end.slice(8)) : `${month(end)} ${Number(end.slice(8))}`;
  return start.slice(0, 4) === year ? `${from} – ${to}, ${year}` : `${from}, ${start.slice(0, 4)} – ${to}, ${year}`;
}

// "1 PM", "12:30 PM"
export function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const hour = h % 12 || 12;
  return `${hour}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "AM" : "PM"}`;
}

// One list of the student's events from the two APIs, without duplicates.
// An event that is both saved and RSVP'd shows as RSVP'd ("attending" or
// "interested"); "not_attending" RSVPs only show if the event is also saved.
//  - saved: GET /api/users/me/saved-events -> events
//  - rsvps: GET /api/users/me/rsvps        -> rsvps
export function mergeStudentEvents(saved = [], rsvps = []) {
  const byId = new Map();
  for (const event of saved) byId.set(event.id, { event, kind: "saved" });
  for (const { status, events: event } of rsvps) {
    if (!event || status === "not_attending") continue;
    byId.set(event.id, { event, kind: "rsvp", rsvpStatus: status });
  }
  return [...byId.values()];
}

// Calendar blocks for events, split per day when an event runs past midnight:
// [{ id, day, start, end, kind, title, ... }] (start/end in minutes).
export function eventBlocks(items) {
  const blocks = [];
  for (const { event, kind, rsvpStatus } of items) {
    const from = toPacific(event.start_date_time);
    const to = toPacific(event.end_date_time);
    for (let day = from.day; day <= to.day; day = addDays(day, 1)) {
      const start = day === from.day ? from.minutes : 0;
      const end = day === to.day ? to.minutes : 24 * 60;
      if (end <= start) continue;
      blocks.push({
        id: `${event.id}-${day}`,
        eventId: event.id,
        day,
        start,
        end,
        kind,
        rsvpStatus,
        title: event.title,
        place: event.locations?.building_name ?? null,
        cancelled: event.status === "cancelled",
        timeLabel: `${formatMinutes(from.minutes)} – ${formatMinutes(to.minutes)}`,
      });
    }
  }
  return blocks;
}

// "13:05" -> 785, or null if it isn't a valid HH:mm time.
function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? "").trim());
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Calendar blocks for class schedule entries in the given week.
// A class is { name, days: "Mon, Wed", startTime: "13:00", endTime: "14:15" },
// the format returned by GET /api/users/me/schedule. Unclear entries are skipped.
export function classBlocks(classes, days) {
  const blocks = [];
  classes.forEach((course, i) => {
    const start = parseTime(course.startTime);
    const end = parseTime(course.endTime);
    if (start === null || end === null || end <= start) return;
    const meets = String(course.days ?? "").split(",").map((d) => d.trim().slice(0, 3));
    for (const day of days) {
      if (!meets.includes(day.name)) continue;
      blocks.push({
        id: `class-${i}-${day.key}`,
        day: day.key,
        start,
        end,
        kind: "class",
        title: course.name || "Class",
        timeLabel: `${formatMinutes(start)} – ${formatMinutes(end)}`,
      });
    }
  });
  return blocks;
}

// Side-by-side layout for one day's blocks: each block gets a `lane` and the
// number of `lanes` in its overlap group, so overlaps share the column width.
export function layoutDay(blocks) {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed = [];
  let group = [];
  let groupEnd = -1;
  const closeGroup = () => {
    const lanes = Math.max(1, ...group.map((b) => b.lane + 1));
    for (const b of group) placed.push({ ...b, lanes });
    group = [];
  };
  for (const block of sorted) {
    if (block.start >= groupEnd && group.length) closeGroup();
    const laneEnds = [];
    for (const b of group) laneEnds[b.lane] = Math.max(laneEnds[b.lane] ?? 0, b.end);
    let lane = laneEnds.findIndex((end) => end <= block.start);
    if (lane === -1) lane = laneEnds.length;
    group.push({ ...block, lane });
    groupEnd = Math.max(groupEnd, block.end);
  }
  if (group.length) closeGroup();
  return placed;
}

// The hour the grid scrolls to when it opens. The current week opens an hour
// before now. Other weeks open at 9 AM, or earlier if a block starts earlier.
export function scrollHour(blocks, nowMinutes = null) {
  if (nowMinutes !== null) return Math.max(0, Math.floor(nowMinutes / 60) - 1);
  return Math.min(9, ...blocks.map((b) => Math.floor(b.start / 60)));
}
