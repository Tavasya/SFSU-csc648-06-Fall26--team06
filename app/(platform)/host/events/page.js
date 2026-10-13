import Link from "next/link";
import { Plus, CalendarDays, FileText, Users, MapPin } from "lucide-react";
import { pageContext } from "@/lib/events/page-data";
import Access from "@/components/gatoraid/Access";
import EventTable from "@/components/gatoraid/EventTable";
export default async function Page() {
  const { db, user, host } = await pageContext();
  let events = [],
    error = null;
  if (host) {
    const result = await db
      .from("events")
      .select("*, locations(building_name)")
      .eq("host_id", user.id)
      .order("start_date_time");
    events = result.data || [];
    error = result.error;
  }
  const upcoming = events.filter(
      (e) =>
        e.publication_status === "published" &&
        new Date(e.end_date_time) > new Date(),
    ).length,
    drafts = events.filter((e) => e.publication_status === "draft").length;
  return (
    <>
      <div className="ga-heading">
        <div>
          <p className="ga-muted">{host?.display_name || "SFSU organizers"}</p>
          <h1>My Events</h1>
          <p className="ga-muted">
            Create, manage and track your campus events.
          </p>
        </div>
        <Link className="ga-button" href="/host/events/new">
          <Plus size={17} />
          Create event
        </Link>
      </div>
      <div className="ga-stats">
        {[
          [
            CalendarDays,
            "Upcoming events",
            upcoming,
            "Published and coming up",
          ],
          [FileText, "Drafts", drafts, "Your ideas in progress"],
          [Users, "RSVPs", "—", "RSVP tracking coming soon"],
          [
            MapPin,
            "Total events",
            events.length,
            "All your events in one place",
          ],
        ].map(([Icon, label, value, sub]) => (
          <div className="ga-card" key={label}>
            <div>
              {label}
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>
      {!host ? (
        <Access user={user} />
      ) : error ? (
        <p role="alert" className="ga-notice">
          Could not load your events. Refresh to try again.
        </p>
      ) : (
        <EventTable initialEvents={events} />
      )}
    </>
  );
}
