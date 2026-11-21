import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/student/validation";
import EventConnections from "@/components/student/EventConnections";
import "@/components/student/connections.css";

export default async function ConnectionsPage({ params }) {
  const { eventId } = await params;
  if (!isUuid(eventId)) notFound();
  const db = await createClient();
  const { data: event } = await db.from("events").select("title").eq("id", eventId).eq("publication_status", "published").maybeSingle();
  if (!event) notFound();
  return <><Link href={`/events/${eventId}`}>← Back to event</Link><div className="ga-heading"><div><h1>Event messages</h1><p className="ga-muted">{event.title}</p></div></div><EventConnections eventId={eventId} /></>;
}
