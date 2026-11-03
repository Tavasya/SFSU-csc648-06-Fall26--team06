import { respond, ApiError } from "@/lib/events/api";
import { studentContext, checked, body, savedSchedule } from "@/lib/student/api";
import { normalizeSchedule } from "@/lib/student/schedule";

export const GET = respond(async (request) => {
  const { db, user } = await studentContext(request);
  const row = checked(await db.from("student_preferences")
    .select("class_schedule").eq("user_id", user.id).maybeSingle());
  return { classes: savedSchedule(row?.class_schedule) };
});

export const PUT = respond(async (request) => {
  const { db, user } = await studentContext(request);
  const input = await body(request);
  let classes;
  try {
    classes = normalizeSchedule(input.classes);
  } catch (error) {
    throw new ApiError(error.message, 422);
  }

  const existing = checked(await db.from("student_preferences")
    .select("category_ids").eq("user_id", user.id).maybeSingle());
  checked(await db.from("student_preferences").upsert({
    user_id: user.id,
    category_ids: existing?.category_ids || [],
    class_schedule: classes,
    updated_at: new Date().toISOString(),
  }));
  return { classes };
});
