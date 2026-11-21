import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/student/validation";

export default async function OrganizerProfile({ params }) {
  const { hostId } = await params;
  if (!isUuid(hostId)) notFound();
  const db = await createClient();
  const [{ data: host }, { data: events }] = await Promise.all([
    db.from("hosts").select("display_name").eq("user_id", hostId).maybeSingle(),
    db.from("events").select("id,title,start_date_time,locations(building_name)").eq("host_id", hostId)
      .eq("publication_status", "published").eq("status", "active").gt("end_date_time", new Date().toISOString()).order("start_date_time"),
  ]);
  if (!host) notFound();
  return <><div className="ga-heading"><div><p className="ga-muted">Campus organizer</p><h1>{host.display_name}</h1>
    <p className="ga-muted">Discover upcoming events from this organizer.</p></div></div>
    <section className="ga-card"><h2>Upcoming events</h2>{events?.length ? <ul>{events.map((event) => <li key={event.id}>
      <Link href={`/events/${event.id}`}>{event.title}</Link> · {new Date(event.start_date_time).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium" })} · {event.locations?.building_name}
    </li>)}</ul> : <p>No upcoming events are currently listed.</p>}</section></>;
}
