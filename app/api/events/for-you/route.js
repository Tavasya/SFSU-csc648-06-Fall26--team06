import { respond } from "@/lib/events/api";
import { studentContext, recommendations } from "@/lib/student/api";
export const GET = respond(async (request) => {
  const { db, user } = await studentContext(request);
  return recommendations(db, user);
});
