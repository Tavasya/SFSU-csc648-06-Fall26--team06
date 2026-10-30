
const TIME_ZONE = "America/Los_Angeles";

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function localParts(date) {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [
      part.type,
      part.value,
    ])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    day: parts.weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function timeToMinutes(value) {
  if (typeof value !== "string") return null;

  const match = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function classDays(course) {
  if (Array.isArray(course.meeting_days)) {
    return course.meeting_days;
  }

  if (typeof course.days === "string") {
    return course.days.split(",").map((day) => day.trim());
  }

  return [];
}

export function getScheduleAvailability(event, classes) {
  if (!Array.isArray(classes) || classes.length === 0) {
    return {
      status: "unknown",
      conflicts: [],
    };
  }

  if (!event?.start_date_time || !event?.end_date_time) {
    return {
      status: "unknown",
      conflicts: [],
    };
  }

  const start = new Date(event.start_date_time);
  const end = new Date(event.end_date_time);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return {
      status: "unknown",
      conflicts: [],
    };
  }

  const startLocal = localParts(start);
  const endLocal = localParts(end);

  // For now, mark overnight events as unknown.
  if (startLocal.date !== endLocal.date) {
    return {
      status: "unknown",
      conflicts: [],
    };
  }

  const conflicts = classes.filter((course) => {
    if (!classDays(course).includes(startLocal.day)) {
      return false;
    }

    const classStart = timeToMinutes(
      course.start_time || course.startTime
    );

    const classEnd = timeToMinutes(
      course.end_time || course.endTime
    );

    if (classStart === null || classEnd === null) {
      return false;
    }

    return (
      startLocal.minutes < classEnd &&
      endLocal.minutes > classStart
    );
  });

  return {
    status: conflicts.length > 0 ? "conflict" : "available",
    conflicts,
  };
}
