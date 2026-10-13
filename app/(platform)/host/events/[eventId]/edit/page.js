import { notFound } from "next/navigation";
import { pageContext, options } from "@/lib/events/page-data";
import Access from "@/components/gatoraid/Access";
import EventForm from "@/components/gatoraid/EventForm";
export default async function Page({ params }) {
  const { db, user, host } = await pageContext();
  if (!host) return <Access user={user} />;
  const { data: event, error } = await db
    .from("events")
    .select("*")
    .eq("id", (await params).eventId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (error || !event) notFound();
  return (
    <EventForm
      event={event}
      {...await options(db)}
      userId={user.id}
      hostName={host.display_name}
      email={user.email}
    />
  );
}
