export function validateEvent(input) {
  const errors = {};
  const text = (key, max, required = false) => {
    const value = typeof input[key] === "string" ? input[key].trim() : "";
    if ((required && !value) || value.length > max)
      errors[key] =
        `Enter ${key.replaceAll("_", " ")}${required ? " (required)" : ""}, up to ${max} characters.`;
    return value;
  };
  const title = text("title", 120, true),
    description = text("description", 5000, true);
  if (title.length < 3)
    errors.title = "Use at least 3 characters for the title.";
  if (description.length < 10)
    errors.description = "Describe the event in at least 10 characters.";
  const start = new Date(input.start_date_time),
    end = new Date(input.end_date_time);
  if (!Number.isFinite(start.getTime()))
    errors.start_date_time = "Choose a valid start date and time.";
  if (!Number.isFinite(end.getTime()) || end <= start)
    errors.end_date_time = "End time must be after the start time.";
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(input.location_id || ""))
    errors.location_id = "Choose a campus location.";
  const category_ids = Array.isArray(input.category_ids)
    ? [...new Set(input.category_ids)]
    : [];
  if (
    !category_ids.length ||
    category_ids.length > 7 ||
    category_ids.some((id) => typeof id !== "string" || !uuid.test(id))
  )
    errors.category_ids = "Choose at least one category.";
  const capacity =
    input.capacity === "" || input.capacity == null
      ? null
      : Number(input.capacity);
  if (
    capacity !== null &&
    (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000)
  )
    errors.capacity = "Capacity must be a whole number from 1 to 100,000.";
  const admission_type = input.admission_type || "free";
  if (!["free", "paid"].includes(admission_type))
    errors.admission_type = "Choose free or paid.";
  const room_number = text("room_number", 80),
    contact_email = text("contact_email", 254),
    audience = text("audience", 80);
  if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email))
    errors.contact_email = "Enter a valid contact email.";
  if (
    ![
      "All students",
      "Undergraduate",
      "Graduate",
      "First year",
      "Transfer",
    ].includes(audience)
  )
    errors.audience = "Choose an audience.";
  if (
    input.cover_path != null &&
    (typeof input.cover_path !== "string" || input.cover_path.length > 250)
  )
    errors.cover_path = "Invalid cover image.";
  return {
    errors,
    data: {
      title,
      description,
      start_date_time: Number.isFinite(start.getTime())
        ? start.toISOString()
        : null,
      end_date_time: Number.isFinite(end.getTime()) ? end.toISOString() : null,
      location_id: input.location_id,
      category_ids,
      room_number,
      contact_email,
      capacity,
      admission_type,
      audience,
      rsvp_required: input.rsvp_required === true,
      wheelchair_accessible: input.wheelchair_accessible === true,
      asl_available: input.asl_available === true,
      cover_path: input.cover_path || null,
    },
  };
}
