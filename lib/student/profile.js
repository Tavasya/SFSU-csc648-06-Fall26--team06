export const ACADEMIC_YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other"];
export const GENDERS = ["Woman", "Man", "Nonbinary", "Self-described", "Prefer not to say"];
export const AVATAR_COLORS = {
  avatar_skin_color: ["#f2c6a0", "#d99b72", "#a96845", "#70432f"],
  avatar_hair_color: ["#241b19", "#563527", "#b47a45", "#e5c27b", "#a3422e", "#a4a4a4"],
  avatar_shirt_color: ["#532b88", "#245c94", "#307357", "#ad4a4a", "#e6b84a"],
};
export const PROFILE_DEFAULTS = {
  display_name: "", academic_year: "", major: "", gender: "",
  notify_cancellations: false, notify_updates: false, notify_reminders: false,
  avatar_skin_color: "#d99b72", avatar_hair_color: "#563527", avatar_shirt_color: "#532b88",
  attendee_visible: false,
};

// Accept only editable profile fields; account identity always comes from auth.
export function validateProfile(input) {
  const data = {};
  for (const [field, limit] of [["display_name", 80], ["major", 120]]) {
    if (typeof input[field] !== "string" || input[field].trim().length > limit)
      throw new Error(`${field === "major" ? "Major" : "Name"} must be at most ${limit} characters.`);
    data[field] = input[field].trim();
  }
  if (!data.display_name) throw new Error("Enter your name.");
  for (const [field, options] of [["academic_year", ACADEMIC_YEARS], ["gender", GENDERS]]) {
    if (input[field] !== "" && !options.includes(input[field]))
      throw new Error(`Choose a valid ${field === "gender" ? "gender" : "academic year"}.`);
    data[field] = input[field];
  }
  for (const field of ["notify_cancellations", "notify_updates", "notify_reminders"]) {
    if (typeof input[field] !== "boolean") throw new Error("Choose valid notification preferences.");
    data[field] = input[field];
  }
  if (typeof (input.attendee_visible ?? false) !== "boolean") throw new Error("Choose a valid attendee visibility setting.");
  data.attendee_visible = input.attendee_visible ?? false;
  // Older clients may omit avatar fields; keep their defaults valid during rollout.
  for (const [field, colors] of Object.entries(AVATAR_COLORS)) {
    const value = input[field] ?? PROFILE_DEFAULTS[field];
    if (!colors.includes(value)) throw new Error("Choose a valid avatar color.");
    data[field] = value;
  }
  return data;
}
