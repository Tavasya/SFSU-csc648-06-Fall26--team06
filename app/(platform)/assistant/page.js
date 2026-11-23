import AssistantChat from "@/components/assistant/AssistantChat";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Allison, AI Event Assistant | GatorAid",
  description: "Ask Allison to find, summarize and compare SFSU campus events.",
};

// Two real upcoming events for the "Compare …" suggestion, preferably from the
// same category so the comparison is useful. null if there aren't two.
// A signed-in host's own events are skipped, because Allison leaves them out.
async function comparePair() {
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    let query = db
      .from("events")
      .select("title, category_ids")
      .eq("publication_status", "published")
      .eq("status", "active")
      .gt("start_date_time", new Date().toISOString())
      .order("start_date_time")
      .limit(40);
    if (user) query = query.neq("host_id", user.id);
    const { data, error } = await query;
    if (error || !data || data.length < 2) return null;
    for (let i = 0; i < data.length; i++) {
      const match = data.slice(i + 1).find((e) =>
        e.title !== data[i].title && (e.category_ids ?? []).some((id) => (data[i].category_ids ?? []).includes(id)),
      );
      if (match) return [data[i].title, match.title];
    }
    return data[0].title !== data[1].title ? [data[0].title, data[1].title] : null;
  } catch {
    return null;
  }
}

export default async function Page() {
  return <AssistantChat compare={await comparePair()} />;
}
