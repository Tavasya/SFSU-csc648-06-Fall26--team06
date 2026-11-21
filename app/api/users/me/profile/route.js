import { respond, ApiError } from "@/lib/events/api";
import { studentContext, checked, body } from "@/lib/student/api";
import { PROFILE_DEFAULTS, validateProfile } from "@/lib/student/profile";

export const GET = respond(async (request) => {
  const { db, user } = await studentContext(request);
  const profile = checked(await db.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle());
  return {
    profile: { ...PROFILE_DEFAULTS, display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || "", ...profile },
    email: user.email || "", email_verified: Boolean(user.email_confirmed_at),
  };
});

export const PUT = respond(async (request) => {
  const { db, user } = await studentContext(request);
  const input = await body(request);
  let data;
  try { data = validateProfile(input); }
  catch (error) { throw new ApiError(error.message, 422); }
  const profile = checked(await db.from("student_profiles").upsert({
    ...data, user_id: user.id, updated_at: new Date().toISOString(),
  }).select().single());
  return { profile };
});
