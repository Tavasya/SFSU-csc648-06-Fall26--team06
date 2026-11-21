/**
 * Public interfaces supporting R3.4, R3.6, R5.2.
 * @module lib/student/validation
 */
export const RSVP_STATUSES = ["attending", "interested", "not_attending"];
/**
 * Test whether a value is a UUID-shaped string.
 * @function isUuid
 * @memberof module:lib/student/validation
 * @static
 * @param {*} value - Value to validate or format.
 * @returns {boolean} Whether the value matches the UUID pattern.
 */
export const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Validate at most 100 interest UUIDs and remove duplicates; throw for malformed input.
 * @function interestIds
 * @memberof module:lib/student/validation
 * @static
 * @param {Array<string>} input - Interest UUIDs submitted by the student.
 * @returns {Array<string>} Distinct validated interest UUIDs.
 */
export function interestIds(input) {
  if (!Array.isArray(input) || input.length > 100 || !input.every(isUuid))
    throw new Error("Choose valid interest categories.");
  return [...new Set(input)];
}

/**
 * Check that an event is published, active and has not ended at the supplied time.
 * @function canAttend
 * @memberof module:lib/student/validation
 * @static
 * @param {Object} event - Event record or display model used by this function.
 * @param {number} [now] - Reference timestamp in milliseconds; defaults to the current time.
 * @returns {boolean} Whether the event currently accepts attendance based on status and end time.
 */
export function canAttend(event, now = Date.now()) {
  return event.publication_status === "published" &&
    event.status === "active" && Date.parse(event.end_date_time) > now;
}

/**
 * Return the names of categories shared by an event and the selected interests.
 * @function recommendationReasons
 * @memberof module:lib/student/validation
 * @static
 * @param {Object} event - Event record or display model used by this function.
 * @param {Array<Object>} categories - Available category records.
 * @param {Array<string>} ids - Selected category IDs.
 * @returns {Array<string>} Names of shared interest categories.
 */
export function recommendationReasons(event, categories, ids) {
  return categories.filter((category) =>
    ids.includes(category.id) && event.category_ids.includes(category.id),
  ).map((category) => category.name);
}
