export const RSVP_STATUSES = ["attending", "interested", "not_attending"];
export const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function interestIds(input) {
  if (!Array.isArray(input) || input.length > 100 || !input.every(isUuid))
    throw new Error("Choose valid interest categories.");
  return [...new Set(input)];
}

export function canAttend(event, now = Date.now()) {
  return event.publication_status === "published" &&
    event.status === "active" && Date.parse(event.end_date_time) > now;
}

export function recommendationReasons(event, categories, ids) {
  return categories.filter((category) =>
    ids.includes(category.id) && event.category_ids.includes(category.id),
  ).map((category) => category.name);
}
