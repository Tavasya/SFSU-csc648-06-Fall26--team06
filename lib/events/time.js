/**
 * Public interfaces supporting R4.2.
 * @module lib/events/time
 */
/**
 * Format a timestamp for a Pacific-time datetime-local input; return an empty string without a value.
 * @function localTime
 * @memberof module:lib/events/time
 * @static
 * @param {*} value - Value to validate or format.
 * @returns {string} A Pacific YYYY-MM-DDTHH:mm value, or an empty string.
 */
export function localTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replace(" ", "T");
}
/**
 * Convert a Pacific wall-clock input to UTC ISO format; reject invalid or nonexistent DST times.
 * @function pacificISO
 * @memberof module:lib/events/time
 * @static
 * @param {*} value - Value to validate or format.
 * @returns {string} A UTC ISO timestamp, or an empty string for invalid wall-clock input.
 */
export function pacificISO(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || "")) return "";
  const naive = new Date(value + "Z");
  if (!Number.isFinite(naive.getTime())) return "";
  let guess = naive;
  for (let i = 0; i < 2; i++) {
    const delta =
      naive.getTime() -
      new Date(localTime(guess.toISOString()) + "Z").getTime();
    guess = new Date(guess.getTime() + delta);
  }
  // Reject nonexistent wall-clock times during the spring DST transition.
  return localTime(guess.toISOString()) === value ? guess.toISOString() : "";
}
