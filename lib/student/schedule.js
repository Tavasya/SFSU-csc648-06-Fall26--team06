const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_BY_NAME = new Map(
  DAYS.flatMap((day, index) => [
    [day.toLowerCase(), { day, index }],
    [
      ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][index],
      { day, index },
    ],
  ]),
);

function timeMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function normalizeSchedule(input) {
  if (!Array.isArray(input) || input.length > 100)
    throw new Error("Add no more than 100 class meetings.");

  return input.map((course) => {
    if (!course || typeof course !== "object" || Array.isArray(course))
      throw new Error("Each class needs a name, days and meeting times.");

    const name = typeof course.name === "string" ? course.name.trim() : "";
    const daysInput = typeof course.days === "string" ? course.days : "";
    const startTime = typeof course.startTime === "string" ? course.startTime.trim() : "";
    const endTime = typeof course.endTime === "string" ? course.endTime.trim() : "";
    const dayTokens = daysInput.split(/[,\s]+/).filter(Boolean);
    const meetings = [...new Set(dayTokens.map((token) =>
      DAY_BY_NAME.get(token.toLowerCase())?.day,
    ))];
    const start = timeMinutes(startTime);
    const end = timeMinutes(endTime);

    if (!name || name.length > 120 || !dayTokens.length ||
        meetings.some((day) => !day) ||
        meetings.length !== dayTokens.length || start === null ||
        end === null || end <= start) {
      throw new Error("Complete each class with valid days and 24-hour start and end times.");
    }

    return {
      name,
      days: DAYS.filter((day) => meetings.includes(day)).join(", "),
      startTime,
      endTime,
    };
  });
}

const pacificDateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function localParts(value) {
  const parts = Object.fromEntries(
    pacificDateTime.formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function eventConflictsWithSchedule(event, classes) {
  const start = Date.parse(event.start_date_time);
  const end = Date.parse(event.end_date_time);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;

  const validClasses = classes.map((course) => ({
    days: String(course.days ?? "").split(",").map((day) => day.trim().slice(0, 3)),
    start: timeMinutes(String(course.startTime ?? "")),
    end: timeMinutes(String(course.endTime ?? "")),
  })).filter((course) =>
    course.start !== null && course.end !== null && course.end > course.start,
  );
  if (!validClasses.length) return false;

  if (end - start >= 7 * 24 * 60 * 60 * 1000)
    return validClasses.some((course) => course.days.length > 0);

  // Compare in campus time so a visitor's device timezone doesn't shift the class day.
  const first = localParts(start);
  const last = localParts(end);
  const firstDate = new Date(`${first.date}T00:00:00Z`);
  const lastDate = new Date(`${last.date}T00:00:00Z`);

  for (let date = firstDate; date <= lastDate; date.setUTCDate(date.getUTCDate() + 1)) {
    const dateKey = date.toISOString().slice(0, 10);
    const weekday = date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const dayStart = dateKey === first.date ? first.minutes : 0;
    const dayEnd = dateKey === last.date ? last.minutes : 24 * 60;
    if (dayEnd <= dayStart) continue;

    if (validClasses.some((course) =>
      course.days.includes(weekday) && dayStart < course.end && dayEnd > course.start,
    )) return true;
  }
  return false;
}
