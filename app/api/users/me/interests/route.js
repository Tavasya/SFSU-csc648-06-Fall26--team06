import { respond, ApiError } from "@/lib/events/api";
import { studentContext, preferences, checked, body } from "@/lib/student/api";
import { interestIds } from "@/lib/student/validation";

export const GET = respond(async (request) => {
  const { db, user } = await studentContext(request);
  return preferences(db, user);
});
export const PUT = respond(async (request) => {
  const { db, user } = await studentContext(request);
  const input = await body(request);
  let ids;
  try { ids = interestIds(input.category_ids); }
  catch (error) { throw new ApiError(error.message, 422); }
  if (ids.length) {
    const categories = checked(await db.from("categories").select("id").in("id", ids));
    if (categories.length !== ids.length) throw new ApiError("Choose available categories.", 422);
  }
  checked(await db.from("student_preferences").upsert({
    user_id: user.id, category_ids: ids, updated_at: new Date().toISOString(),
  }));
  return { category_ids: ids };
});
