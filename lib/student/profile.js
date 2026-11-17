export const ACADEMIC_YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other"];
export const GENDERS = ["Woman", "Man", "Nonbinary", "Self-described", "Prefer not to say"];
export const PROFILE_DEFAULTS = {
  display_name: "", academic_year: "", major: "", gender: "",
  notify_cancellations: false, notify_updates: false, notify_reminders: false,
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
  return data;
}
